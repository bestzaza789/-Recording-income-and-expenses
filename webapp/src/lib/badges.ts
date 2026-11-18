import type { Budget, Goal, Loan, Transaction } from '../db/db';
import { evaluatePreviousMonth } from './monthEnd';
import { bestStreak } from './streak';

export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  hint: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-entry', emoji: '🌱', title: 'ก้าวแรก', hint: 'จดรายการแรก' },
  { id: 'streak-7', emoji: '🔥', title: 'จดครบ 7 วัน', hint: 'จดติดต่อกัน 7 วัน' },
  { id: 'streak-30', emoji: '🏅', title: 'จดครบ 30 วัน', hint: 'จดติดต่อกัน 30 วัน' },
  { id: 'budget-month', emoji: '🛡️', title: 'อยู่ในงบทั้งเดือน', hint: 'ใช้ไม่เกินงบตลอดเดือน' },
  { id: 'saver-month', emoji: '🐷', title: 'เดือนแห่งการออม', hint: 'รายรับมากกว่ารายจ่ายทั้งเดือน' },
  { id: 'goal-done', emoji: '🎯', title: 'เป้าหมายสำเร็จ', hint: 'เก็บเงินถึงเป้าออมเงิน' },
  { id: 'loan-clear', emoji: '🤝', title: 'เคลียร์หนี้', hint: 'ติ๊กว่าคืนเงินยืมแล้ว' },
];

export interface BadgeInput {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  loans: Loan[];
}

/** Ids of every badge the current data qualifies for. */
export function earnedBadgeIds({ transactions, budgets, goals, loans }: BadgeInput, now: Date = new Date()): Set<string> {
  const earned = new Set<string>();
  if (transactions.length > 0) earned.add('first-entry');

  const best = bestStreak(transactions.map((t) => t.date));
  if (best >= 7) earned.add('streak-7');
  if (best >= 30) earned.add('streak-30');

  // Judge each completed month: from the first month with data up to last month.
  const net = new Map<string, number>();
  const income = new Map<string, number>();
  let first = Infinity;
  for (const t of transactions) {
    const d = new Date(t.date);
    first = Math.min(first, new Date(d.getFullYear(), d.getMonth(), 1).getTime());
    if (t.transactionType === 'transfer') continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    net.set(key, (net.get(key) ?? 0) + (t.transactionType === 'income' ? t.amount : -t.amount));
    if (t.transactionType === 'income') income.set(key, (income.get(key) ?? 0) + t.amount);
  }
  if (Number.isFinite(first)) {
    const start = new Date(first);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let m = new Date(start); m < thisMonth; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const key = `${m.getFullYear()}-${m.getMonth()}`;
      if ((income.get(key) ?? 0) > 0 && (net.get(key) ?? 0) > 0) earned.add('saver-month');
      const judged = evaluatePreviousMonth(transactions, budgets, new Date(m.getFullYear(), m.getMonth() + 1, 1));
      if (judged?.underBudget) earned.add('budget-month');
    }
  }

  if (goals.some((g) => g.targetAmount > 0 && g.savedAmount >= g.targetAmount)) earned.add('goal-done');
  if (loans.some((l) => l.settled)) earned.add('loan-clear');
  return earned;
}
