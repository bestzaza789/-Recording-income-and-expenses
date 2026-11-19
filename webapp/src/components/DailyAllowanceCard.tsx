import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  UNCATEGORIZED, computeAllowance, getDailyCategories, getDailyLimit, getDailyRolloverFrom,
} from '../lib/dailyAllowance';
import { formatCurrency, startOfDay, startOfMonth } from '../lib/format';
import { Mascot } from './Mascot';

/** "วันนี้ใช้ได้อีก ฿320 🐱" — the daily limit set in Management minus today's expenses. */
export function DailyAllowanceCard() {
  const [limit] = useState(getDailyLimit);
  const [savedCategoryIds] = useState(getDailyCategories);
  const [rolloverFrom] = useState(getDailyRolloverFrom);
  const rollover = rolloverFrom !== null;
  // Rollover needs every day since it started (within this month); otherwise today is enough.
  const transactions = useLiveQuery(
    () => {
      const now = new Date();
      const from = rolloverFrom === null ? startOfDay(now) : Math.max(startOfMonth(now), rolloverFrom);
      return db.transactions.where('date').aboveOrEqual(new Date(from)).toArray();
    },
    [rolloverFrom],
  );
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  if (!limit || !transactions || !categories) return null;

  // Categories deleted since the selection was saved no longer count; if none are left, every expense counts.
  const known = new Set([UNCATEGORIZED, ...categories.map((c) => c.id)]);
  const categoryIds = savedCategoryIds.filter((id) => known.has(id));

  const { spent, carry, available, left } = computeAllowance(transactions, { limit, categoryIds, rolloverFrom });
  const over = left < 0;
  const signed = (n: number) => `${n < 0 ? '-' : '+'}${formatCurrency(Math.abs(n))}`;
  const budgetLabel = rollover && carry !== 0 ? `วันนี้ ${formatCurrency(available)}` : `วันละ ${formatCurrency(limit)}`;

  return (
    <div className={`card allowance-card${over ? ' is-over' : ''}`}>
      <Mascot
        mood={over ? 'shocked' : spent === 0 ? 'happy' : 'cheer'}
        size={64}
        reason={over
          ? `ตกใจ! วันนี้ใช้ไป ${formatCurrency(spent)} เกิน${budgetLabel}ที่ตั้งไว้แล้ว`
          : spent === 0
            ? 'วันนี้ยังไม่ได้ใช้เงินเลย ยิ้มรอไว้ก่อน~'
            : `ดีใจ! วันนี้ยังไม่เกิน${budgetLabel}ที่ตั้งไว้`}
      />
      <div className="allowance-main">
        {over ? (
          <div className="allowance-headline">วันนี้ใช้เกินแล้ว <strong className="is-over">{formatCurrency(-left)}</strong> 😱</div>
        ) : (
          <div className="allowance-headline">วันนี้ใช้ได้อีก <strong>{formatCurrency(left)}</strong> 🐱</div>
        )}
        <div className="allowance-detail">
          ตั้งไว้วันละ {formatCurrency(limit)}
          {rollover && ` · ยกมา ${signed(carry)}`}
          {' '}· ใช้ไปแล้ว {formatCurrency(spent)}
          {categoryIds.length > 0 && ` · เฉพาะ ${categoryIds.length} หมวด`}
        </div>
      </div>
    </div>
  );
}
