import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db, type Transaction } from '../db/db';
import { TransactionRow } from '../components/TransactionRow';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { TransferForm } from '../components/TransferForm';
import { deleteTransaction } from '../db/transactionManager';
import { formatCurrency, formatDate, formatMonth, startOfDay, startOfMonth } from '../lib/format';

function addMonths(monthKey: number, delta: number): number {
  const d = new Date(monthKey);
  return new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime();
}

export function Analytics() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [editing, setEditing] = useState<Transaction | null>(null);

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
    () => transactions.filter((t) => startOfMonth(t.date) === selectedMonth).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, selectedMonth]
  );

  const monthIncome = monthTransactions.filter((t) => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter((t) => t.transactionType === 'expense').reduce((s, t) => s + t.amount, 0);

  const pieData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const t of monthTransactions) {
      if (t.transactionType !== 'expense') continue;
      const key = t.categoryId ?? 'other';
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    }
    return Array.from(byCategory.entries()).map(([categoryId, amount]) => {
      const cat = categoryFor(categoryId);
      return { name: cat?.name ?? 'Other', value: amount, color: cat ? `#${cat.hexColor}` : '#808080' };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthTransactions, categories]);

  const groupedByDay = useMemo(() => {
    const dayMap = new Map<number, Transaction[]>();
    for (const t of monthTransactions) {
      const dayKey = startOfDay(t.date);
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(t);
    }
    return Array.from(dayMap.entries()).sort((a, b) => b[0] - a[0]);
  }, [monthTransactions]);

  async function handleDelete(id: string) {
    await deleteTransaction(id);
  }

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

      {pieData.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Expenses by Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {pieData.map((d, i) => (
              <div className="pie-legend-item" key={i}>
                <span className="pie-legend-dot" style={{ background: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {monthTransactions.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 16 }}>No transactions in {formatMonth(new Date(selectedMonth))}.</div>
      ) : (
        groupedByDay.map(([dayKey, items]) => (
          <div key={dayKey}>
            <div className="date-group-header">{formatDate(new Date(dayKey))}</div>
            <div className="card">
              {items.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  category={categoryFor(t.categoryId)}
                  onDelete={() => handleDelete(t.id)}
                  onEdit={() => setEditing(t)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {editing && editing.transactionType === 'transfer' && (
        <TransferForm existing={editing} onClose={() => setEditing(null)} />
      )}
      {editing && editing.transactionType !== 'transfer' && (
        <ManualEntryForm existing={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
