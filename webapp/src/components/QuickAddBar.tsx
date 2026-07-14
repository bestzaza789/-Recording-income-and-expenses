import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useBookmark } from '../db/transactionManager';
import { CategoryIcon } from '../lib/icons';
import { formatCurrency } from '../lib/format';

export function QuickAddBar() {
  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (bookmarks.length === 0) return null;

  function categoryFor(id: string) {
    return categories.find((c) => c.id === id);
  }

  async function tap(bookmark: (typeof bookmarks)[number]) {
    if (busyId) return;
    setBusyId(bookmark.id);
    try {
      await useBookmark(bookmark);
      setSavedId(bookmark.id);
      setTimeout(() => setSavedId((cur) => (cur === bookmark.id ? null : cur)), 1500);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="section-title">Quick Add</div>
      <div className="quick-add-row">
        {bookmarks.map((b) => {
          const category = categoryFor(b.categoryId);
          return (
            <button key={b.id} className="quick-add-chip" onClick={() => tap(b)} disabled={busyId === b.id}>
              <CategoryIcon name={category?.iconName} color={category ? `#${category.hexColor}` : undefined} size={18} />
              <span className="quick-add-label">{b.name}</span>
              <span className="quick-add-amount">{formatCurrency(b.amount)}</span>
              {savedId === b.id && <span className="quick-add-added">Added ✓</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
