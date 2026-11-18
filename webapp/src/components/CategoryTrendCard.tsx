import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Category, Transaction } from '../db/db';
import { formatCurrency, formatMonth, startOfMonth } from '../lib/format';

const MONTHS = 6;

/** Monthly spend for one expense category over the 6 months ending at the selected month. */
export function CategoryTrendCard({
  transactions,
  categories,
  selectedMonth,
}: {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: number;
}) {
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const [picked, setPicked] = useState<string>('');

  const months = useMemo(() => {
    const end = new Date(selectedMonth);
    return Array.from({ length: MONTHS }, (_, i) => new Date(end.getFullYear(), end.getMonth() - (MONTHS - 1 - i), 1).getTime());
  }, [selectedMonth]);

  // Default to the category with the most spending in the window
  const defaultId = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.transactionType !== 'expense' || !t.categoryId) continue;
      if (!months.includes(startOfMonth(t.date))) continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  }, [transactions, months]);

  const categoryId = expenseCategories.some((c) => c.id === picked) ? picked : defaultId;

  const data = useMemo(
    () =>
      months.map((month) => ({
        month,
        amount: transactions
          .filter((t) => t.transactionType === 'expense' && t.categoryId === categoryId && startOfMonth(t.date) === month)
          .reduce((s, t) => s + t.amount, 0),
      })),
    [months, transactions, categoryId],
  );

  if (expenseCategories.length === 0 || !categoryId) return null;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="trend-head">
        <div className="section-title" style={{ margin: 0 }}>แนวโน้มรายหมวด</div>
        <select className="trend-select" value={categoryId} onChange={(e) => setPicked(e.target.value)} aria-label="เลือกหมวดหมู่">
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tickFormatter={(v) => formatMonth(new Date(v))} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip labelFormatter={(v) => formatMonth(new Date(v))} formatter={(v) => formatCurrency(Number(v))} />
          <Bar dataKey="amount" name="รายจ่าย" fill="var(--accent)" radius={[6, 6, 0, 0]} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
