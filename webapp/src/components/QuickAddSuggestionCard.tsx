import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addBookmark } from '../db/transactionManager';
import { formatCurrency } from '../lib/format';
import { findQuickAddSuggestions } from '../lib/quickAddSuggest';
import { showSaved } from '../lib/saveFeedback';
import { Mascot } from './Mascot';

const KEY = 'quickAddDismissed';

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

/** Offers to turn an entry the user keeps logging into a quick-add button. One suggestion at a time. */
export function QuickAddSuggestionCard() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  // Edited names, per suggestion, so moving to the next suggestion starts from its own default
  const [names, setNames] = useState<Record<string, string>>({});

  if (!transactions || !bookmarks || !categories) return null;
  const suggestion = findQuickAddSuggestions(transactions, bookmarks, categories, dismissed)[0];
  if (!suggestion) return null;

  const name = names[suggestion.key] ?? suggestion.label;
  const trimmed = name.trim();

  function dismiss() {
    const next = new Set(dismissed).add(suggestion.key);
    saveDismissed(next);
    setDismissed(next);
  }

  async function accept() {
    if (!trimmed) return;
    await addBookmark({
      name: trimmed,
      type: suggestion.type,
      amount: suggestion.amount,
      accountId: suggestion.accountId,
      categoryId: suggestion.categoryId,
      note: suggestion.note,
    });
    await showSaved('เพิ่มเป็นรายการด่วนแล้ว ⚡');
  }

  return (
    <section>
      <div className="card suggest-card">
        <Mascot mood="happy" size={56} />
        <div className="suggest-main">
          <div className="suggest-title">จดบ่อยจัง ทำปุ่มลัดมั้ย? ⚡</div>
          <div className="suggest-sub">
            {suggestion.label} {formatCurrency(suggestion.amount)} · จดมาแล้ว {suggestion.count} ครั้งใน 6 เดือน ตั้งชื่อปุ่มแล้วเพิ่มเป็นรายการด่วนเลยมั้ย?
          </div>
          <input
            className="suggest-name"
            value={name}
            onChange={(e) => setNames((n) => ({ ...n, [suggestion.key]: e.target.value }))}
            placeholder="ชื่อปุ่ม"
            maxLength={30}
            aria-label="ชื่อปุ่มรายการด่วน"
          />
          <div className="suggest-actions">
            <button className="confirm-btn cancel" onClick={dismiss}>ไม่ต้อง</button>
            <button className="confirm-btn ok" onClick={accept} disabled={!trimmed}>เพิ่มเลย</button>
          </div>
        </div>
      </div>
    </section>
  );
}
