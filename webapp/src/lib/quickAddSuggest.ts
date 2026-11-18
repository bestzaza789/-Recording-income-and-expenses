import type { Bookmark, Category, Transaction } from '../db/db';
import { categoryFor } from './lookup';

export interface QuickAddSuggestion {
  key: string;
  type: 'income' | 'expense';
  amount: number;
  accountId: string;
  categoryId: string;
  note?: string;
  label: string;
  count: number;
}

const WINDOW_MONTHS = 6;
const MIN_COUNT = 3;
const MAX_STALE_DAYS = 40;

function monthIndex(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * Finds entries logged the same way (type, amount, account, category, note) at
 * least 3 times in the last 6 months and still in use, which are not already a
 * quick-add button. A category is required because quick-add buttons need one.
 */
export function findQuickAddSuggestions(
  transactions: Transaction[],
  bookmarks: Bookmark[],
  categories: Category[],
  dismissed: ReadonlySet<string>,
  now: Date = new Date(),
): QuickAddSuggestion[] {
  const nowIndex = monthIndex(now);
  const groups = new Map<string, Transaction[]>();

  for (const t of transactions) {
    if (t.transactionType === 'transfer' || !t.categoryId) continue;
    const age = nowIndex - monthIndex(new Date(t.date));
    if (age < 0 || age >= WINDOW_MONTHS) continue;
    const note = (t.note ?? '').trim().toLowerCase();
    const key = [t.transactionType, t.accountId, t.categoryId, note, t.amount.toFixed(2)].join('|');
    const list = groups.get(key);
    if (list) list.push(t);
    else groups.set(key, [t]);
  }

  const out: QuickAddSuggestion[] = [];
  for (const [key, list] of groups) {
    if (dismissed.has(key) || list.length < MIN_COUNT) continue;

    const latest = Math.max(...list.map((t) => +new Date(t.date)));
    if (+now - latest > MAX_STALE_DAYS * 86_400_000) continue;

    const sample = list[0];
    const type = sample.transactionType as 'income' | 'expense';
    const exists = bookmarks.some(
      (b) => b.type === type && b.accountId === sample.accountId && b.categoryId === sample.categoryId && b.amount === sample.amount,
    );
    if (exists) continue;

    out.push({
      key,
      type,
      amount: sample.amount,
      accountId: sample.accountId,
      categoryId: sample.categoryId!,
      note: sample.note?.trim() || undefined,
      label: sample.note?.trim() || categoryFor(categories, sample.categoryId)?.name || 'รายการ',
      count: list.length,
    });
  }
  // Most frequent first, then biggest amount
  return out.sort((a, b) => b.count - a.count || b.amount - a.amount);
}
