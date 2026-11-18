import type { Transaction } from '../db/db';
import { startOfDay } from './format';

const KEY = 'daily-limit';

/** The daily spending limit the user typed in Management, or null when not set. */
export function getDailyLimit(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setDailyLimit(amount: number | null) {
  try {
    if (amount && amount > 0) localStorage.setItem(KEY, String(amount));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Sum of today's expenses (transfers and income don't count). */
export function spentToday(transactions: Transaction[], now: Date = new Date()): number {
  const today = startOfDay(now);
  return transactions
    .filter((t) => t.transactionType === 'expense' && startOfDay(t.date) === today)
    .reduce((s, t) => s + t.amount, 0);
}
