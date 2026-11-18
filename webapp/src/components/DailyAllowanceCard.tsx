import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getDailyLimit, spentToday } from '../lib/dailyAllowance';
import { formatCurrency, startOfDay } from '../lib/format';
import { Mascot } from './Mascot';

/** "วันนี้ใช้ได้อีก ฿320 🐱" — the daily limit set in Management minus today's expenses. */
export function DailyAllowanceCard() {
  const [limit] = useState(getDailyLimit);
  const transactions = useLiveQuery(
    () => db.transactions.where('date').aboveOrEqual(new Date(startOfDay(new Date()))).toArray(),
    [],
  );
  if (!limit || !transactions) return null;

  const spent = spentToday(transactions);
  const left = limit - spent;
  const over = left < 0;

  return (
    <div className={`card allowance-card${over ? ' is-over' : ''}`}>
      <Mascot
        mood={over ? 'shocked' : spent === 0 ? 'happy' : 'cheer'}
        size={64}
        reason={over
          ? `ตกใจ! วันนี้ใช้ไป ${formatCurrency(spent)} เกินที่ตั้งไว้วันละ ${formatCurrency(limit)} แล้ว`
          : spent === 0
            ? 'วันนี้ยังไม่ได้ใช้เงินเลย ยิ้มรอไว้ก่อน~'
            : `ดีใจ! วันนี้ยังไม่เกินวันละ ${formatCurrency(limit)} ที่ตั้งไว้`}
      />
      <div className="allowance-main">
        {over ? (
          <div className="allowance-headline">วันนี้ใช้เกินแล้ว <strong className="is-over">{formatCurrency(-left)}</strong> 😱</div>
        ) : (
          <div className="allowance-headline">วันนี้ใช้ได้อีก <strong>{formatCurrency(left)}</strong> 🐱</div>
        )}
        <div className="allowance-detail">ตั้งไว้วันละ {formatCurrency(limit)} · ใช้ไปแล้ว {formatCurrency(spent)}</div>
      </div>
    </div>
  );
}
