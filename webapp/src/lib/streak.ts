function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export interface Streak {
  count: number;
  /** false means the streak is still alive but needs an entry today to continue. */
  loggedToday: boolean;
}

/**
 * Consecutive calendar days (ending today, or yesterday if nothing is logged yet
 * today) that have at least one transaction. Counted by transaction date, so a
 * backdated entry fills that day too.
 */
export function computeStreak(dates: Date[], now: Date = new Date()): Streak {
  const days = new Set(dates.map((d) => dayKey(new Date(d))));
  const loggedToday = days.has(dayKey(now));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!loggedToday) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { count, loggedToday };
}

/** Longest run of consecutive calendar days that each have at least one transaction. */
export function bestStreak(dates: Date[]): number {
  const days = [...new Set(dates.map((d) => new Date(d).setHours(0, 0, 0, 0)))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ms of days) {
    const cur = new Date(ms);
    const expected: Date | null = prev && new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
    run = expected && expected.getTime() === cur.getTime() ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}
