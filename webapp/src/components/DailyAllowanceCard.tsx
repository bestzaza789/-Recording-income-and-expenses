import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { computeDailyAllowance } from '../lib/dailyAllowance';
import { formatCurrency } from '../lib/format';
import { Mascot } from './Mascot';

/** "วันนี้ใช้ได้อีก ฿320 🐱" — remaining budget less upcoming bills, per remaining day. */
export function DailyAllowanceCard() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const budgets = useLiveQuery(() => db.budgets.toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const recurring = useLiveQuery(() => db.recurring.toArray(), []);
  if (!transactions || !budgets || !categories || !recurring) return null;

  const a = computeDailyAllowance(transactions, budgets, categories, recurring);
  if (!a) return null;

  const over = a.perDay < 0;
  const detail = [
    `งบเหลือ ${formatCurrency(a.remainingBudget)}`,
    a.upcomingRecurring > 0 ? `หักรายจ่ายประจำที่ยังไม่ถึงกำหนด ${formatCurrency(a.upcomingRecurring)}` : null,
    `เหลือ ${a.daysLeft} วัน`,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`card allowance-card${over ? ' is-over' : ''}`}>
      <Mascot mood={over ? 'shocked' : 'cheer'} size={64} />
      <div className="allowance-main">
        {over ? (
          <div className="allowance-headline">งบเดือนนี้ไม่พอแล้ว 😱</div>
        ) : (
          <div className="allowance-headline">วันนี้ใช้ได้อีก <strong>{formatCurrency(Math.floor(a.perDay))}</strong> 🐱</div>
        )}
        <div className="allowance-detail">{over ? `ขาดอีก ${formatCurrency(Math.ceil(-a.perDay * a.daysLeft))} · ` : ''}{detail}</div>
      </div>
    </div>
  );
}
