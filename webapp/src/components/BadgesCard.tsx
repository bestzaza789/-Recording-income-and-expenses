import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { BADGES } from '../lib/badges';
import { EMPTY } from '../lib/empty';
import { formatDate } from '../lib/format';

/** Sticker collection: earned badges in colour, the rest greyed out with a hint. */
export function BadgesCard() {
  const earned = useLiveQuery(() => db.badges.toArray(), []) ?? EMPTY;
  const earnedAt = new Map(earned.map((b) => [b.id, b.earnedAt]));

  return (
    <section>
      <div className="section-title">เหรียญรางวัล · {BADGES.filter((b) => earnedAt.has(b.id)).length}/{BADGES.length}</div>
      <div className="card badge-grid">
        {BADGES.map((b) => {
          const at = earnedAt.get(b.id);
          return (
            <div key={b.id} className={`badge-sticker${at ? ' is-earned' : ''}`} title={b.hint}>
              <div className="badge-emoji" aria-hidden="true">{at ? b.emoji : '🔒'}</div>
              <div className="badge-title">{b.title}</div>
              <div className="badge-sub">{at ? formatDate(at) : b.hint}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
