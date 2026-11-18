import { db } from '../db/db';

const NEAR = 0.8;

/**
 * Call right after saving an expense. Returns a warning only when THIS expense is
 * what pushed the category's month-to-date spend across 80% or 100% of its budget,
 * so it never nags on every save once a budget is already close or exceeded.
 */
export async function budgetWarningAfterExpense(categoryId: string | undefined, amount: number, date: Date): Promise<string | null> {
  if (!categoryId) return null;
  const when = new Date(date);
  const now = new Date();
  if (when.getFullYear() !== now.getFullYear() || when.getMonth() !== now.getMonth()) return null;

  const [budget, category, transactions] = await Promise.all([
    db.budgets.where('categoryId').equals(categoryId).first(),
    db.categories.get(categoryId),
    db.transactions.where('categoryId').equals(categoryId).toArray(),
  ]);
  if (!budget || budget.monthlyLimit <= 0) return null;

  const spent = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.transactionType === 'expense' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, t) => s + t.amount, 0);
  const before = spent - amount;
  const limit = budget.monthlyLimit;
  const name = category?.name ?? 'หมวดนี้';

  if (before <= limit && spent > limit) return `บันทึกแล้ว · งบ ${name} เกินแล้ว 😱`;
  if (before < limit * NEAR && spent >= limit * NEAR) {
    return `บันทึกแล้ว · งบ ${name} ใช้ไป ${Math.floor((spent / limit) * 100)}% แล้วนะ 😥`;
  }
  return null;
}
