import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getDoneTours, startTour } from '../lib/tour/tourStore';
import { TOURS } from '../lib/tour/tours';

export function Guide() {
  const accountCount = useLiveQuery(() => db.accounts.count(), []);
  const [done] = useState(getDoneTours);

  return (
    <div className="page">
      <h1 className="page-title">คู่มือ</h1>
      <div className="text-secondary-sm" style={{ marginBottom: 12 }}>
        เลือกเรื่องที่อยากลอง แอปจะพากดปุ่มจริงทีละขั้น บางเรื่องจะบันทึกข้อมูลจริง ลบหรือแก้ทีหลังได้
      </div>

      {TOURS.map((t) => {
        const blocked = accountCount === undefined ? null : t.requires?.({ accounts: accountCount }) ?? null;
        const isDone = done.includes(t.id);
        return (
          <div className="card guide-item" key={t.id}>
            <div className="guide-emoji" aria-hidden="true">{t.emoji}</div>
            <div className="guide-main">
              <div className="guide-title">
                {t.title}
                {isDone && <span className="guide-done">ทำแล้ว ✓</span>}
              </div>
              <div className="text-secondary-sm">{t.blurb}</div>
              {t.saves && <div className="guide-saves">{t.saves}</div>}
              {blocked && <div className="guide-blocked">{blocked}</div>}
            </div>
            <button className="confirm-btn ok" disabled={!!blocked} onClick={() => startTour(t.id)}>
              {isDone ? 'ทำอีกครั้ง' : 'เริ่ม'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
