import type { Transaction } from '../db/db';
import { startOfDay, startOfMonth } from './format';

const KEY = 'daily-limit';
const CATEGORIES_KEY = 'daily-limit-categories';
const ROLLOVER_KEY = 'daily-limit-rollover';

/** Row keys of these settings in the Google Sheets `Settings` tab. */
export const SETTING_DAILY_LIMIT = 'dailyLimit';
export const SETTING_DAILY_CATEGORIES = 'dailyLimitCategories';
export const SETTING_DAILY_ROLLOVER_FROM = 'dailyLimitRolloverFrom';

/** Synthetic key for expenses with no category (same convention as Analytics). */
export const UNCATEGORIZED = 'other';

const DAY_MS = 86_400_000;

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

/** Category ids (or `UNCATEGORIZED`) the limit applies to. Empty means every expense counts. */
export function getDailyCategories(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CATEGORIES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function setDailyCategories(ids: string[]) {
  try {
    if (ids.length > 0) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(ids));
    else localStorage.removeItem(CATEGORIES_KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Start-of-day timestamp from which unused (or overspent) amounts carry into later days,
 * or null when rollover is off. It is the day the user switched rollover on, so turning it on
 * mid-month doesn't hand out a retroactive surplus for days before that.
 */
export function getDailyRolloverFrom(): number | null {
  try {
    const v = Number(localStorage.getItem(ROLLOVER_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Turns rollover on from `now`'s day (or off). Pass the original day when restoring from a backup. */
export function setDailyRollover(on: boolean, now: Date = new Date()) {
  try {
    if (on) localStorage.setItem(ROLLOVER_KEY, String(startOfDay(now)));
    else localStorage.removeItem(ROLLOVER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export interface DailyAllowance {
  /** Counted expenses made today. */
  spent: number;
  /** Surplus (positive) or deficit (negative) carried in from earlier days this month; 0 without rollover. */
  carry: number;
  /** Today's budget: the daily limit plus `carry`. */
  available: number;
  /** `available - spent`; negative once over. */
  left: number;
}

/**
 * Today's allowance. Only expenses count (transfers and income don't), limited to
 * `categoryIds` when it isn't empty. With `rolloverFrom` set, every day from then (or the start
 * of the current month, whichever is later) up to yesterday adds `limit` and subtracts what was
 * spent, so the balance resets each month.
 */
export function computeAllowance(
  transactions: Transaction[],
  opts: { limit: number; categoryIds: string[]; rolloverFrom: number | null },
  now: Date = new Date(),
): DailyAllowance {
  const { limit, categoryIds, rolloverFrom } = opts;
  const today = startOfDay(now);
  const carryStart = Math.max(startOfMonth(now), rolloverFrom ?? 0);

  const counted = transactions.filter(
    (t) => t.transactionType === 'expense'
      && (categoryIds.length === 0 || categoryIds.includes(t.categoryId ?? UNCATEGORIZED)),
  );
  const sum = (list: Transaction[]) => list.reduce((s, t) => s + t.amount, 0);

  const spent = sum(counted.filter((t) => startOfDay(t.date) === today));

  let carry = 0;
  if (rolloverFrom !== null) {
    const daysBefore = Math.max(0, Math.round((today - carryStart) / DAY_MS));
    const spentBefore = sum(counted.filter((t) => {
      const day = startOfDay(t.date);
      return day >= carryStart && day < today;
    }));
    carry = limit * daysBefore - spentBefore;
  }

  const available = limit + carry;
  return { spent, carry, available, left: available - spent };
}
