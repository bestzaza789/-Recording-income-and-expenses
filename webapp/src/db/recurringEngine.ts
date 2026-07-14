import { db } from './db';
import { addTransaction } from './transactionManager';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m, 1)); // m is 1-based, so month index m = next month
}

function dueDateInMonth(key: string, dayOfMonth: number): Date {
  const [y, m] = key.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(dayOfMonth, lastDay));
}

// At rule creation: if this month's due date already passed, start next month
// (the user has presumably recorded this month's bill manually). Due today or
// later starts this month, so a due-today rule generates on next startup.
export function initialLastGenerated(dayOfMonth: number, now = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = dueDateInMonth(monthKey(now), dayOfMonth);
  if (due < today) return monthKey(now);
  return monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

export async function generateDueRecurring(now = new Date()): Promise<number> {
  const rules = await db.recurring.toArray();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentKey = monthKey(now);
  let generated = 0;

  for (const rule of rules) {
    const account = await db.accounts.get(rule.accountId);
    if (!account) continue; // account deleted: skip without advancing lastGenerated

    let key = nextMonthKey(rule.lastGenerated);
    while (key <= currentKey) {
      const due = dueDateInMonth(key, rule.dayOfMonth);
      if (due > today) break;
      await addTransaction({
        amount: rule.amount,
        type: rule.transactionType,
        date: due,
        note: rule.note,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
      });
      await db.recurring.update(rule.id, { lastGenerated: key });
      generated++;
      key = nextMonthKey(key);
    }
  }
  return generated;
}
