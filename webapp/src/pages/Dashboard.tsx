import { lazy, Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus } from 'lucide-react';
import { db } from '../db/db';
import { formatCurrency, startOfDay } from '../lib/format';
import { categoryFor } from '../lib/lookup';
import { TransactionRow } from '../components/TransactionRow';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { TransferForm } from '../components/TransferForm';
import { QuickAddBar } from '../components/QuickAddBar';

const SlipScanner = lazy(() => import('../components/SlipScanner').then((m) => ({ default: m.SlipScanner })));

export function Dashboard() {
  const navigate = useNavigate();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [activeForm, setActiveForm] = useState<'manual' | 'transfer' | 'scan' | null>(null);
  const [pieRange, setPieRange] = useState<'today' | 'month'>('today');

  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const totalNetWorth = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const recentTransactions = transactions.slice(0, 5);

  const now = new Date();
  const todayKey = startOfDay(now);
  const rangeExpenses = transactions.filter((t) => {
    if (t.transactionType !== 'expense') return false;
    if (pieRange === 'today') return startOfDay(t.date) === todayKey;
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const rangeTotal = rangeExpenses.reduce((s, t) => s + t.amount, 0);

  const byCategory = new Map<string, number>();
  for (const t of rangeExpenses) {
    const key = t.categoryId ?? 'other';
    byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
  }
  const pieData = Array.from(byCategory.entries()).map(([categoryId, amount]) => {
    const cat = categoryFor(categories, categoryId);
    return { name: cat?.name ?? 'อื่น ๆ', value: amount, color: cat ? `#${cat.hexColor}` : '#808080' };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="page">
      <div className="net-worth-label">ทรัพย์สินสุทธิทั้งหมด</div>
      <div className="net-worth-value" style={{ color: totalNetWorth >= 0 ? 'var(--text)' : 'var(--red)' }}>
        {formatCurrency(totalNetWorth)}
      </div>

      <div className="account-carousel" style={{ marginTop: 16 }}>
        {accounts.map((a) => (
          <div className="account-card" key={a.id} onClick={() => navigate(`/account/${a.id}`)} style={{ cursor: 'pointer' }}>
            <div className="name">{a.name}</div>
            <div className="balance">{formatCurrency(a.currentBalance)}</div>
          </div>
        ))}
      </div>

      <QuickAddBar />

      {transactions.length > 0 && (
        <>
          <div className="section-title">{pieRange === 'today' ? 'รายจ่ายวันนี้' : 'รายจ่ายเดือนนี้'}</div>
          <div className="card">
            <div className="segmented" style={{ marginBottom: 8 }}>
              <button className={pieRange === 'today' ? 'active' : ''} onClick={() => setPieRange('today')}>วันนี้</button>
              <button className={pieRange === 'month' ? 'active' : ''} onClick={() => setPieRange('month')}>เดือนนี้</button>
            </div>
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  {pieData.length > 0 ? (
                    <Pie data={pieData} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={pieData.length > 1 ? 2 : 0} stroke="none">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  ) : (
                    <Pie data={[{ value: 1 }]} dataKey="value" innerRadius={62} outerRadius={88} fill="var(--border)" isAnimationActive={false} />
                  )}
                  {pieData.length > 0 && <Tooltip formatter={(v) => formatCurrency(Number(v))} />}
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-center">
                <div className="pie-center-label">{pieRange === 'today' ? 'ใช้ไปวันนี้' : 'ใช้ไปเดือนนี้'}</div>
                <div className="pie-center-value">{formatCurrency(rangeTotal)}</div>
              </div>
            </div>
            {pieData.length === 0 ? (
              <div className="text-secondary-sm" style={{ textAlign: 'center' }}>
                {pieRange === 'today' ? 'วันนี้ยังไม่มีรายจ่าย' : 'เดือนนี้ยังไม่มีรายจ่าย'}
              </div>
            ) : (
              <div className="pie-legend">
                {pieData.map((d, i) => (
                  <div className="pie-legend-item" key={i}>
                    <span className="pie-legend-dot" style={{ background: d.color }} />
                    {d.name} <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="section-title">รายการล่าสุด</div>
      <div className="card">
        {recentTransactions.length === 0 && <div className="empty-state">ยังไม่มีรายการ</div>}
        {recentTransactions.map((t) => (
          <TransactionRow key={t.id} transaction={t} category={categoryFor(categories, t.categoryId)} />
        ))}
      </div>

      <button className="fab" onClick={() => setShowActionSheet(true)}>
        <Plus size={26} />
      </button>

      {showActionSheet && (
        <div className="action-sheet" onClick={() => setShowActionSheet(false)}>
          <div className="action-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="action-sheet-group">
              <button onClick={() => { setActiveForm('manual'); setShowActionSheet(false); }}>บันทึกเอง</button>
              <button onClick={() => { setActiveForm('transfer'); setShowActionSheet(false); }}>โอนเงินระหว่างบัญชี</button>
              <button onClick={() => { setActiveForm('scan'); setShowActionSheet(false); }}>สแกนสลิป</button>
            </div>
            <div className="action-sheet-group">
              <button className="cancel" onClick={() => setShowActionSheet(false)}>ยกเลิก</button>
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
