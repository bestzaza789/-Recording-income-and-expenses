import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId } from '../db/db';
import { initialLastGenerated } from '../db/recurringEngine';
import { scheduleAutoSync } from '../lib/autoSync';
import { formatCurrency } from '../lib/format';
import { findRecurringSuggestions } from '../lib/recurringSuggest';
import { showSaved } from '../lib/saveFeedback';
import { Mascot } from './Mascot';

const KEY = 'recurringDismissed';

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable */
  }
}

/** Offers to turn a repeating monthly entry into a recurring rule. One suggestion at a time. */
export function RecurringSuggestionCard() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const rules = useLiveQuery(() => db.recurring.toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  if (!transactions || !rules || !categories) return null;
  const suggestion = findRecurringSuggestions(transactions, rules, categories, dismissed)[0];
  if (!suggestion) return null;

  function dismiss() {
    const next = new Set(dismissed).add(suggestion.key);
    saveDismissed(next);
    setDismissed(next);
  }

  async function accept() {
    await db.recurring.add({
      id: newId(),
      amount: suggestion.amount,
      transactionType: suggestion.type,
      dayOfMonth: suggestion.dayOfMonth,
      accountId: suggestion.accountId,
      categoryId: suggestion.categoryId,
      note: suggestion.note,
      lastGenerated: initialLastGenerated(suggestion.dayOfMonth),
    });
    scheduleAutoSync();
    await showSaved('ตั้งเป็นรายการประจำแล้ว 🔁');
  }

  return (
    <section>
      <div className="card suggest-card">
        <Mascot mood="happy" size={56} />
        <div className="suggest-main">
          <div className="suggest-title">เจอรายการซ้ำทุกเดือน 🔁</div>
          <div className="suggest-sub">
            {suggestion.label} {formatCurrency(suggestion.amount)} · ทุกวันที่ {suggestion.dayOfMonth} ({suggestion.months} เดือนล่าสุด) ตั้งเป็นรายการประจำเลยมั้ย?
          </div>
          <div className="suggest-actions">
            <button className="confirm-btn cancel" onClick={dismiss}>ไม่ต้อง</button>
            <button className="confirm-btn ok" onClick={accept}>ตั้งเลย</button>
          </div>
        </div>
      </div>
    </section>
  );
}
