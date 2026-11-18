import type { Category, Transaction } from '../db/db';
import { categoryFor } from './lookup';

export interface Wrapped {
  month: Date;
  income: number;
  expense: number;
  saved: number;
  topCategory: { name: string; amount: number; pct: number } | null;
  heaviestDay: { date: Date; amount: number } | null;
  /** Consecutive months, ending at this one, where income beat expenses. */
  savingStreak: number;
  loggedDays: number;
}

function monthOf(t: Transaction): number {
  const d = new Date(t.date);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function buildWrapped(transactions: Transaction[], categories: Category[], monthStart: number): Wrapped {
  const month = new Date(monthStart);
  const byMonth = new Map<number, number>();
  for (const t of transactions) {
    if (t.transactionType === 'transfer') continue;
    byMonth.set(monthOf(t), (byMonth.get(monthOf(t)) ?? 0) + (t.transactionType === 'income' ? t.amount : -t.amount));
  }

  const inMonth = transactions.filter((t) => monthOf(t) === monthStart);
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  const byDay = new Map<number, number>();
  const days = new Set<number>();
  for (const t of inMonth) {
    days.add(new Date(t.date).setHours(0, 0, 0, 0));
    if (t.transactionType === 'income') income += t.amount;
    if (t.transactionType !== 'expense') continue;
    expense += t.amount;
    const key = t.categoryId ?? 'other';
    byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    const day = new Date(t.date).setHours(0, 0, 0, 0);
    byDay.set(day, (byDay.get(day) ?? 0) + t.amount);
  }

  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const heavy = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];

  let savingStreak = 0;
  for (let m = new Date(month); (byMonth.get(m.getTime()) ?? 0) > 0; m = new Date(m.getFullYear(), m.getMonth() - 1, 1)) savingStreak++;

  return {
    month,
    income,
    expense,
    saved: income - expense,
    topCategory: top ? { name: categoryFor(categories, top[0])?.name ?? 'อื่น ๆ', amount: top[1], pct: expense > 0 ? top[1] / expense : 0 } : null,
    heaviestDay: heavy ? { date: new Date(heavy[0]), amount: heavy[1] } : null,
    savingStreak,
    loggedDays: days.size,
  };
}
