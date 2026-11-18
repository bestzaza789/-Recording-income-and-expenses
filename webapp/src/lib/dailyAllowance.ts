import type { Budget, Category, RecurringRule, Transaction } from '../db/db';

export interface DailyAllowance {
  /** Total monthly budget minus what budgeted categories have spent this month. */
  remainingBudget: number;
  /** Recurring expenses (in budgeted categories) due later this month and not generated yet. */
  upcomingRecurring: number;
  /** Days left in the month, counting today. */
  daysLeft: number;
  /** What can still be spent per day; negative when the month is already over budget. */
  perDay: number;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * "How much can I still spend today": remaining budget, minus recurring bills still to
 * come this month, spread over the remaining days. Only budgeted expense categories
 * count, mirroring the Budget tab. Null when no budget is set.
 */
export function computeDailyAllowance(
  transactions: Transaction[],
  budgets: Budget[],
  categories: Category[],
  recurring: RecurringRule[],
  now: Date = new Date(),
): DailyAllowance | null {
  const expenseIds = new Set(categories.filter((c) => c.type === 'expense').map((c) => c.id));
  const budgeted = new Map(budgets.filter((b) => expenseIds.has(b.categoryId)).map((b) => [b.categoryId, b.monthlyLimit]));
  if (budgeted.size === 0) return null;

  const limit = [...budgeted.values()].reduce((s, v) => s + v, 0);
  let spent = 0;
  for (const t of transactions) {
    if (t.transactionType !== 'expense' || !t.categoryId || !budgeted.has(t.categoryId)) continue;
    const d = new Date(t.date);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) spent += t.amount;
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const currentKey = monthKey(now);
  let upcomingRecurring = 0;
  for (const r of recurring) {
    if (r.transactionType !== 'expense' || !r.categoryId || !budgeted.has(r.categoryId)) continue;
    if (r.lastGenerated >= currentKey) continue; // this month's bill already generated
    if (Math.min(r.dayOfMonth, lastDay) > today) upcomingRecurring += r.amount;
  }

  const daysLeft = lastDay - today + 1;
  const remainingBudget = limit - spent;
  return { remainingBudget, upcomingRecurring, daysLeft, perDay: (remainingBudget - upcomingRecurring) / daysLeft };
}
