import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { BADGES, earnedBadgeIds } from '../lib/badges';
import { celebrate, showSaved } from '../lib/saveFeedback';

/** Renders nothing: records newly earned badges and announces them. */
export function BadgeWatcher() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  const budgets = useLiveQuery(() => db.budgets.toArray(), []);
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const loans = useLiveQuery(() => db.loans.toArray(), []);
  const badges = useLiveQuery(() => db.badges.toArray(), []);
  const pending = useRef(new Set<string>());

  useEffect(() => {
    if (!transactions || !budgets || !goals || !loans || !badges) return;
    const have = new Set(badges.map((b) => b.id));
    const fresh = [...earnedBadgeIds({ transactions, budgets, goals, loans })].filter((id) => !have.has(id) && !pending.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => pending.current.add(id));
    const now = new Date();
    void db.badges.bulkPut(fresh.map((id) => ({ id, earnedAt: now }))).then(() => {
      // The very first badge on a fresh install is just "first entry" — still worth a cheer.
      const def = BADGES.find((b) => b.id === fresh[0]);
      const message = fresh.length === 1 && def ? `ได้เหรียญใหม่! ${def.emoji} ${def.title}` : `ได้เหรียญใหม่ ${fresh.length} ใบ! 🏅`;
      void showSaved(message);
      void celebrate();
    });
  }, [transactions, budgets, goals, loans, badges]);

  return null;
}
