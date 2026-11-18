import type { Budget, Transaction } from '../db/db';

export interface MonthEndResult {
  /** 'YYYY-MM' of the month that just ended. */
  monthKey: string;
  month: Date;
  underBudget: boolean;
  spent: number;
  limit: number;
}

/**
 * Did the previous calendar month stay within the total of the budgets that are set
 * now? Returns null when there is nothing to judge (no budgets, or no spending in
 * budgeted categories that month).
 */
export function evaluatePreviousMonth(transactions: Transaction[], budgets: Budget[], now: Date = new Date()): MonthEndResult | null {
  if (budgets.length === 0) return null;
  const month = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const budgeted = new Map(budgets.map((b) => [b.categoryId, b.monthlyLimit]));
  const limit = [...budgeted.values()].reduce((s, v) => s + v, 0);

  let spent = 0;
  let any = false;
  for (const t of transactions) {
    if (t.transactionType !== 'expense' || !t.categoryId || !budgeted.has(t.categoryId)) continue;
    const d = new Date(t.date);
    if (d.getFullYear() !== month.getFullYear() || d.getMonth() !== month.getMonth()) continue;
    spent += t.amount;
    any = true;
  }
  if (!any || limit <= 0) return null;

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  return { monthKey, month, underBudget: spent <= limit, spent, limit };
}
