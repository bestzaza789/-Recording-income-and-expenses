import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatCurrency, formatMonth } from '../lib/format';
import { evaluatePreviousMonth, type MonthEndResult } from '../lib/monthEnd';
import { celebrate } from '../lib/saveFeedback';
import { Mascot } from './Mascot';

const KEY = 'monthEndHandled';

function getHandled(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return 'blocked'; // can't remember, so never show
  }
}

function setHandled(monthKey: string) {
  try {
    localStorage.setItem(KEY, monthKey);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Once per month, congratulates the user if last month stayed within budget. Months
 * that went over are marked handled silently — no scolding screen.
 */
export function MonthEndCelebration() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const budgets = useLiveQuery(() => db.budgets.toArray(), []);
  const [result, setResult] = useState<MonthEndResult | null>(null);

  useEffect(() => {
    if (!transactions || !budgets) return;
    const evaluation = evaluatePreviousMonth(transactions, budgets);
    if (!evaluation) return;
    const handled = getHandled();
    if (handled === 'blocked' || (handled !== null && handled >= evaluation.monthKey)) return;
    if (!evaluation.underBudget) {
      setHandled(evaluation.monthKey);
      return;
    }
    setResult(evaluation);
  }, [transactions, budgets]);

  useEffect(() => {
    if (result) void celebrate();
  }, [result]);

  if (!result) return null;

  function close() {
    if (result) setHandled(result.monthKey);
    setResult(null);
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="สรุปงบเดือนที่แล้ว">
      <div className="onboarding-card">
        <div className="onboarding-mascot"><Mascot mood="cheer" size={120} /></div>
        <h2 className="onboarding-title">เก่งมาก! ไม่เกินงบ 🎉</h2>
        <p className="onboarding-text">
          {formatMonth(result.month)} ใช้ไป {formatCurrency(result.spent)} จากงบ {formatCurrency(result.limit)}
        </p>
        <div className="onboarding-actions">
          <button className="confirm-btn ok" onClick={close}>เย้!</button>
        </div>
      </div>
    </div>
  );
}
