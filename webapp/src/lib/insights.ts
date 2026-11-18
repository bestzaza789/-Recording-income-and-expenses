import type { Category, Transaction } from '../db/db';
import { categoryFor } from './lookup';
import type { MascotMood } from '../components/Mascot';

export interface InsightResult {
  mood: MascotMood;
  lines: string[];
}

function totals(transactions: Transaction[]) {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.transactionType === 'income') income += t.amount;
    else if (t.transactionType === 'expense') {
      expense += t.amount;
      const key = t.categoryId ?? 'other';
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    }
  }
  return { income, expense, byCategory };
}

const pct = (n: number) => Math.round(n);

/**
 * Friendly month-over-month observations. Returns null when the selected month
 * has nothing to talk about. Thresholds keep it from nagging about small moves.
 */
export function buildInsights(current: Transaction[], previous: Transaction[], categories: Category[]): InsightResult | null {
  const cur = totals(current);
  if (cur.income === 0 && cur.expense === 0) return null;
  const prev = totals(previous);
  const nameOf = (key: string) => categoryFor(categories, key)?.name ?? 'อื่น ๆ';
  // Latin category names (e.g. the default "Food") need a space after the Thai word before them.
  const spaced = (name: string) => (/^[A-Za-z0-9]/.test(name) ? ` ${name}` : name);

  const lines: string[] = [];
  let worse = false;
  let better = false;

  if (prev.expense > 0 && cur.expense > 0) {
    const change = ((cur.expense - prev.expense) / prev.expense) * 100;
    if (change >= 10) {
      lines.push(`เดือนนี้ใช้มากกว่าเดือนก่อน ${pct(change)}% 😥`);
      if (change >= 20) worse = true;
    } else if (change <= -10) {
      lines.push(`เดือนนี้ใช้น้อยกว่าเดือนก่อน ${pct(-change)}% เก่งมาก 🎉`);
      better = true;
    } else {
      lines.push('เดือนนี้ใช้ใกล้เคียงเดือนก่อน 😊');
    }
  }

  // The single most notable category move (needs a real amount, not just a big %).
  let best: { text: string; diff: number } | null = null;
  for (const [key, amount] of cur.byCategory) {
    const before = prev.byCategory.get(key);
    if (!before) continue;
    const diff = amount - before;
    const change = (diff / before) * 100;
    if (Math.abs(diff) < 100 || Math.abs(change) < 20) continue;
    if (!best || Math.abs(diff) > best.diff) {
      best = {
        diff: Math.abs(diff),
        text: diff > 0 ? `ค่า${spaced(nameOf(key))} เพิ่มขึ้น ${pct(change)}% จากเดือนก่อน` : `ค่า${spaced(nameOf(key))} ลดลง ${pct(-change)}% จากเดือนก่อน 👏`,
      };
    }
  }
  if (best) lines.push(best.text);

  if (cur.income > 0) {
    const rate = ((cur.income - cur.expense) / cur.income) * 100;
    if (rate >= 20) {
      lines.push(`เก็บได้ ${pct(rate)}% ของรายรับ 🐷`);
      better = true;
    } else if (rate < 0) {
      lines.push('เดือนนี้ใช้เกินรายรับ ระวังหน่อยนะ');
      worse = true;
    }
  }

  if (lines.length === 0 && cur.expense > 0) {
    const [topKey, topAmount] = [...cur.byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    lines.push(`${nameOf(topKey)} กินไปมากสุด ${pct((topAmount / cur.expense) * 100)}% ของรายจ่าย`);
  }
  if (lines.length === 0) return null;

  const mood: MascotMood = worse ? 'shocked' : better ? 'cheer' : 'happy';
  return { mood, lines: lines.slice(0, 3) };
}
