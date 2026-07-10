import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { db } from '../db/db';
import { formatCurrency, formatMonth, startOfMonth } from '../lib/format';

export function Analytics() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

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

  return (
    <div className="page">
      <h1 className="page-title">Analytics</h1>
      {chartData.length === 0 ? (
        <div className="empty-state">Not enough data for analytics.</div>
      ) : (
        <div className="card">
          <ResponsiveContainer width="100%" height={300}>
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
    </div>
  );
}
