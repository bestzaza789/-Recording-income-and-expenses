import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../db/db';
import { CategoryIcon } from '../lib/icons';
import { formatCurrency, formatMonth, startOfMonth } from '../lib/format';

function addMonths(monthKey: number, delta: number): number {
  const d = new Date(monthKey);
  return new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime();
}

export function Analytics() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));

  function categoryFor(id?: string) {
    return categories.find((c) => c.id === id);
  }

  const chartData = useMemo(() => {
    const map = new Map<number, { month: number; Income: number; Expense: number }>();
    for (const t of transactions) {
      const key = startOfMonth(t.date);
      if (!map.has(key)) map.set(key, { month: key, Income: 0, Expense: 0 });
      const entry = map.get(key)!;
      if (t.transactionType === 'income') entry.Income += t.amount;
      else if (t.transactionType === 'expense') entry.Expense += t.amount;
    }
    return Array.from(map.values()).sort((a, b) => a.month - b.month);
  }, [transactions]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => startOfMonth(t.date) === selectedMonth),
    [transactions, selectedMonth]
  );

  const monthIncome = monthTransactions.filter((t) => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter((t) => t.transactionType === 'expense').reduce((s, t) => s + t.amount, 0);

  const categoryBreakdown = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const t of monthTransactions) {
      if (t.transactionType !== 'expense') continue;
      const key = t.categoryId ?? 'other';
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    }
    return Array.from(byCategory.entries())
      .map(([categoryId, amount]) => {
        const cat = categoryFor(categoryId);
        return {
          categoryId,
          name: cat?.name ?? 'Other',
          iconName: cat?.iconName,
          color: cat ? `#${cat.hexColor}` : '#808080',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthTransactions, categories]);

  return (
    <div className="page">
      <h1 className="page-title">Analytics</h1>
      {chartData.length === 0 ? (
        <div className="empty-state">Not enough data for analytics.</div>
      ) : (
        <div className="card">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tickFormatter={(v) => formatMonth(new Date(v))} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(v) => formatMonth(new Date(v))} formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="Income" fill="var(--green)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="var(--red)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="section-title">Monthly Summary</div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="icon-btn" onClick={() => setSelectedMonth((m) => addMonths(m, -1))}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{formatMonth(new Date(selectedMonth))}</div>
        <button className="icon-btn" style={{ marginRight: 0 }} onClick={() => setSelectedMonth((m) => addMonths(m, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="card" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Income</div>
          <div style={{ fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(monthIncome)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Expense</div>
          <div style={{ fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(monthExpense)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Net</div>
          <div style={{ fontWeight: 700 }}>{formatCurrency(monthIncome - monthExpense)}</div>
        </div>
      </div>

      {categoryBreakdown.length > 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Expenses by Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryBreakdown} dataKey="amount" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>

          {categoryBreakdown.map((c) => (
            <div className="list-item" key={c.categoryId}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CategoryIcon name={c.iconName} color={c.color} />
                {c.name}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>{formatCurrency(c.amount)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {monthExpense > 0 ? Math.round((c.amount / monthExpense) * 100) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 16 }}>No expenses in {formatMonth(new Date(selectedMonth))}.</div>
      )}
    </div>
  );
}
