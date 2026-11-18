import { lazy, Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, PencilLine, ScanLine } from 'lucide-react';
import { db } from '../db/db';
import { EMPTY } from '../lib/empty';
import { formatCurrency, startOfDay } from '../lib/format';
import { categoryFor, sortAccounts } from '../lib/lookup';
import { useCountUp } from '../lib/useCountUp';
import { computeStreak } from '../lib/streak';
import { QuickAddSuggestionCard } from '../components/QuickAddSuggestionCard';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { Mascot, type MascotMood } from '../components/Mascot';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { TransferForm } from '../components/TransferForm';
import { QuickAddBar } from '../components/QuickAddBar';
import { SlipInboxCard } from '../components/SlipInboxCard';
import { AccountCard } from '../components/AccountCard';
import { DonutChart } from '../components/DonutChart';
import { SpeedDial } from '../components/SpeedDial';
import { PageSkeleton, SheetLoading } from '../components/Skeleton';

const SlipScanner = lazy(() => import('../components/SlipScanner').then((m) => ({ default: m.SlipScanner })));

/** Which part of the day the hero scenery shows. */
function phaseOfDay(): 'dawn' | 'day' | 'dusk' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'ดึกแล้วนะ พักผ่อนบ้าง 🌙';
  if (h < 12) return 'อรุณสวัสดิ์ ☀️';
  if (h < 17) return 'สวัสดีตอนบ่าย 🌼';
  if (h < 21) return 'สวัสดีตอนเย็น 🌆';
  return 'ราตรีสวัสดิ์ 🌙';
}

export function Dashboard() {
  const navigate = useNavigate();
  const [activeForm, setActiveForm] = useState<'manual' | 'transfer' | 'scan' | null>(null);
  const [pieRange, setPieRange] = useState<'today' | 'month'>('today');

  const accountsQuery = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []);
  const transactionsQuery = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []);
  const accounts = accountsQuery ?? EMPTY;
  const transactions = transactionsQuery ?? EMPTY;
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? EMPTY;

  const totalNetWorth = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const shownNetWorth = useCountUp(totalNetWorth, 1100);
  const recentTransactions = transactions.slice(0, 5);
  const streak = computeStreak(transactions.map((t) => t.date));

  const now = new Date();
  const todayKey = startOfDay(now);
  const isThisMonth = (date: Date) => {
    const d = new Date(date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const monthTransactions = transactions.filter((t) => isThisMonth(t.date));
  const monthIncome = monthTransactions.filter((t) => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter((t) => t.transactionType === 'expense').reduce((s, t) => s + t.amount, 0);

  const rangeExpenses = transactions.filter((t) => {
    if (t.transactionType !== 'expense') return false;
    if (pieRange === 'today') return startOfDay(t.date) === todayKey;
    return isThisMonth(t.date);
  });

  const byCategory = new Map<string, number>();
  for (const t of rangeExpenses) {
    const key = t.categoryId ?? 'other';
    byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
  }
  const pieData = Array.from(byCategory.entries()).map(([categoryId, amount]) => {
    const cat = categoryFor(categories, categoryId);
    return { key: categoryId, name: cat?.name ?? 'อื่น ๆ', value: amount, color: cat ? `#${cat.hexColor}` : '#808080' };
  }).sort((a, b) => b.value - a.value);

  const heroMood: MascotMood = monthIncome === 0 && monthExpense === 0 ? 'sleepy' : monthExpense > monthIncome ? 'shocked' : 'cheer';

  if (!accountsQuery || !transactionsQuery) {
    return <div className="page"><PageSkeleton variant="dashboard" /></div>;
  }

  return (
    <div className="page dashboard">
      <header className="hero" data-tod={phaseOfDay()}>
        <div className="hero-mascot"><Mascot mood={heroMood} size={64} /></div>
        <div className="app-version">{__APP_VERSION__}</div>
        <div className="hero-greeting">{greeting()}</div>
        {streak.count > 0 && (
          <div className={`streak-chip${streak.loggedToday ? '' : ' is-pending'}`}>
            🔥 จดต่อเนื่อง {streak.count} วัน{streak.loggedToday ? '' : ' · จดวันนี้เพื่อไม่ให้ขาด'}
          </div>
        )}
        <div className="net-worth-label">ทรัพย์สินสุทธิทั้งหมด</div>
        <div className="net-worth-value" style={totalNetWorth < 0 ? { color: 'var(--red)' } : undefined}>
          {formatCurrency(shownNetWorth)}
        </div>
        <div className="month-pills">
          <span className="month-pill income">
            <ArrowDownLeft size={14} strokeWidth={2.6} aria-hidden="true" />
            <span className="sr-only">รายรับ</span>
            {formatCurrency(monthIncome)}
          </span>
          <span className="month-pill expense">
            <ArrowUpRight size={14} strokeWidth={2.6} aria-hidden="true" />
            <span className="sr-only">รายจ่าย</span>
            {formatCurrency(monthExpense)}
          </span>
          <span className="month-pill-caption">เดือนนี้</span>
        </div>
      </header>

      <div className="account-carousel">
        {accounts.map((a, i) => (
          <AccountCard key={a.id} account={a} index={i} onOpen={() => navigate(`/account/${a.id}`)} />
        ))}
      </div>

      <SlipInboxCard />
      <QuickAddSuggestionCard />

      <div>
        <QuickAddBar />
      </div>

      {transactions.length > 0 && (
        <section>
          <div className="section-title">{pieRange === 'today' ? 'รายจ่ายวันนี้' : 'รายจ่ายเดือนนี้'}</div>
          <div className="card">
            <div className="segmented" style={{ marginBottom: 16 }}>
              <button className={pieRange === 'today' ? 'active' : ''} onClick={() => setPieRange('today')}>วันนี้</button>
              <button className={pieRange === 'month' ? 'active' : ''} onClick={() => setPieRange('month')}>เดือนนี้</button>
            </div>
            <DonutChart
              key={pieRange}
              slices={pieData}
              centerLabel={pieRange === 'today' ? 'ใช้ไปวันนี้' : 'ใช้ไปเดือนนี้'}
            />
            {pieData.length === 0 && (
              <div className="text-secondary-sm" style={{ textAlign: 'center', marginTop: 8 }}>
                {pieRange === 'today' ? 'วันนี้ยังไม่ได้ใช้เงินเลย เก่งมาก 🎈' : 'เดือนนี้ยังไม่มีรายจ่าย เก่งมาก 🎈'}
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="section-title">รายการล่าสุด</div>
        <div className="card">
          {recentTransactions.length === 0 && <EmptyState mood="sleepy">ยังไม่มีรายการเลย มาเพิ่มรายการแรกกัน~ 🐥</EmptyState>}
          {recentTransactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} category={categoryFor(categories, t.categoryId)} />
          ))}
        </div>
      </section>

      <SpeedDial
        actions={[
          { key: 'scan', label: 'สแกนสลิป', Icon: ScanLine, onSelect: () => setActiveForm('scan') },
          { key: 'transfer', label: 'โอนเงินระหว่างบัญชี', Icon: ArrowLeftRight, onSelect: () => setActiveForm('transfer') },
          { key: 'manual', label: 'บันทึกเอง', Icon: PencilLine, onSelect: () => setActiveForm('manual') },
        ]}
      />

      {activeForm === 'manual' && <ManualEntryForm onClose={() => setActiveForm(null)} />}
      {activeForm === 'transfer' && <TransferForm onClose={() => setActiveForm(null)} />}
      {activeForm === 'scan' && (
        <Suspense fallback={<SheetLoading />}>
          <SlipScanner onClose={() => setActiveForm(null)} />
        </Suspense>
      )}
    </div>
  );
}
