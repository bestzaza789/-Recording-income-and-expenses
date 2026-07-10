import { lazy, Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus } from 'lucide-react';
import { db } from '../db/db';
import { formatCurrency } from '../lib/format';
import { TransactionRow } from '../components/TransactionRow';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { TransferForm } from '../components/TransferForm';

const SlipScanner = lazy(() => import('../components/SlipScanner').then((m) => ({ default: m.SlipScanner })));

export function Dashboard() {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [activeForm, setActiveForm] = useState<'manual' | 'transfer' | 'scan' | null>(null);

  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const totalNetWorth = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const recentTransactions = transactions.slice(0, 5);

  const now = new Date();
  const currentMonthExpenses = transactions.filter((t) => {
    const d = new Date(t.date);
    return t.transactionType === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const byCategory = new Map<string, number>();
  for (const t of currentMonthExpenses) {
    const key = t.categoryId ?? 'other';
    byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
  }
  const pieData = Array.from(byCategory.entries()).map(([categoryId, amount]) => {
    const cat = categories.find((c) => c.id === categoryId);
    return { name: cat?.name ?? 'Other', value: amount, color: cat ? `#${cat.hexColor}` : '#808080' };
  });

  function categoryFor(id?: string) {
    return categories.find((c) => c.id === id);
  }

  return (
    <div className="page">
      <div className="net-worth-label">Total Net Worth</div>
      <div className="net-worth-value" style={{ color: totalNetWorth >= 0 ? 'var(--text)' : 'var(--red)' }}>
        {formatCurrency(totalNetWorth)}
      </div>

      <div className="account-carousel" style={{ marginTop: 16 }}>
        {accounts.map((a) => (
          <div className="account-card" key={a.id}>
            <div className="name">{a.name}</div>
            <div className="balance">{formatCurrency(a.currentBalance)}</div>
          </div>
        ))}
      </div>

      {pieData.length > 0 && (
        <>
          <div className="section-title">This Month's Expenses</div>
          <div className="card">
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
        </>
      )}

      <div className="section-title">Recent Transactions</div>
      <div className="card">
        {recentTransactions.length === 0 && <div className="empty-state">No transactions yet.</div>}
        {recentTransactions.map((t) => (
          <TransactionRow key={t.id} transaction={t} category={categoryFor(t.categoryId)} />
        ))}
      </div>

      <button className="fab" onClick={() => setShowActionSheet(true)}>
        <Plus size={26} />
      </button>

      {showActionSheet && (
        <div className="action-sheet" onClick={() => setShowActionSheet(false)}>
          <div className="action-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="action-sheet-group">
              <button onClick={() => { setActiveForm('manual'); setShowActionSheet(false); }}>Manual Entry</button>
              <button onClick={() => { setActiveForm('transfer'); setShowActionSheet(false); }}>Transfer</button>
              <button onClick={() => { setActiveForm('scan'); setShowActionSheet(false); }}>Scan Slip (OCR)</button>
            </div>
            <div className="action-sheet-group">
              <button className="cancel" onClick={() => setShowActionSheet(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {activeForm === 'manual' && <ManualEntryForm onClose={() => setActiveForm(null)} />}
      {activeForm === 'transfer' && <TransferForm onClose={() => setActiveForm(null)} />}
      {activeForm === 'scan' && (
        <Suspense fallback={null}>
          <SlipScanner onClose={() => setActiveForm(null)} />
        </Suspense>
      )}
    </div>
  );
}
