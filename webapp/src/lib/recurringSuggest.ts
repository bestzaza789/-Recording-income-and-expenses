import type { Category, RecurringRule, Transaction } from '../db/db';
import { categoryFor } from './lookup';

export interface RecurringSuggestion {
  key: string;
  type: 'income' | 'expense';
  amount: number;
  dayOfMonth: number;
  accountId: string;
  categoryId?: string;
  note?: string;
  label: string;
  months: number;
}

const WINDOW_MONTHS = 6;
const MIN_MONTHS = 3;
const MAX_STALE_DAYS = 40;

function monthIndex(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Finds transactions that repeat with the same type, amount, account, category and
 * note in at least 3 of the last 6 months, still recent, and not already covered by
 * a recurring rule. The day of month is the median day they happened on.
 */
export function findRecurringSuggestions(
  transactions: Transaction[],
  rules: RecurringRule[],
  categories: Category[],
  dismissed: ReadonlySet<string>,
  now: Date = new Date(),
): RecurringSuggestion[] {
  const nowIndex = monthIndex(now);
  const groups = new Map<string, Transaction[]>();

  for (const t of transactions) {
    if (t.transactionType === 'transfer') continue;
    const date = new Date(t.date);
    const age = nowIndex - monthIndex(date);
    if (age < 0 || age >= WINDOW_MONTHS) continue;
    const note = (t.note ?? '').trim().toLowerCase();
    if (!note && !t.categoryId) continue; // nothing to tell one repeat from another
    const key = [t.transactionType, t.accountId, t.categoryId ?? '', note, t.amount.toFixed(2)].join('|');
    const list = groups.get(key);
    if (list) list.push(t);
    else groups.set(key, [t]);
  }

  const out: RecurringSuggestion[] = [];
  for (const [key, list] of groups) {
    if (dismissed.has(key)) continue;
    const months = new Set(list.map((t) => monthIndex(new Date(t.date))));
    if (months.size < MIN_MONTHS) continue;

    const latest = Math.max(...list.map((t) => +new Date(t.date)));
    if (+now - latest > MAX_STALE_DAYS * 86_400_000) continue;

    const sample = list[0];
    const type = sample.transactionType as 'income' | 'expense';
    const covered = rules.some(
      (r) => r.transactionType === type && r.accountId === sample.accountId && r.amount === sample.amount && (r.categoryId ?? '') === (sample.categoryId ?? ''),
    );
    if (covered) continue;

    out.push({
      key,
      type,
      amount: sample.amount,
      dayOfMonth: median(list.map((t) => new Date(t.date).getDate())),
      accountId: sample.accountId,
      categoryId: sample.categoryId,
      note: sample.note?.trim() || undefined,
      label: sample.note?.trim() || categoryFor(categories, sample.categoryId)?.name || 'รายการ',
      months: months.size,
    });
  }
  // Most repeats first, then biggest amount
  return out.sort((a, b) => b.months - a.months || b.amount - a.amount);
}
