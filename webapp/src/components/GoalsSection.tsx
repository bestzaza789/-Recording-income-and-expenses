import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus } from 'lucide-react';
import { db, type Goal } from '../db/db';
import { formatCurrency } from '../lib/format';
import { Mascot, type MascotMood } from './Mascot';
import { GoalForm } from './GoalForm';
import { GoalDepositForm } from './GoalDepositForm';

function moodFor(pct: number): MascotMood {
  if (pct >= 1) return 'cheer';
  if (pct > 0) return 'happy';
  return 'sleepy';
}

/** The mascot grows with the savings: 44px empty → 88px at the goal. */
function sizeFor(pct: number): number {
  return Math.round(44 + Math.min(pct, 1) * 44);
}

export function GoalsSection() {
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [depositing, setDepositing] = useState<Goal | null>(null);

  const goals = useLiveQuery(() => db.goals.toArray().then((g) => g.sort((a, b) => +a.createdAt - +b.createdAt)), []) ?? [];

  return (
    <section>
      <div className="section-title goals-title">
        <span>เป้าหมายออมเงิน</span>
        <button className="icon-btn" onClick={() => setEditing('new')} aria-label="เพิ่มเป้าหมาย"><Plus size={16} /></button>
      </div>
      {goals.length === 0 && (
        <div className="card goal-empty">
          <Mascot mood="sleepy" size={64} />
          <div>ยังไม่มีเป้าหมาย ตั้งสักอันแล้วเริ่มเก็บกันเถอะ~ 🐷</div>
        </div>
      )}
      {goals.map((g) => {
        const pct = g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0;
        return (
          <div className="card goal-card" key={g.id}>
            <div className="goal-mascot"><Mascot mood={moodFor(pct)} size={sizeFor(pct)} /></div>
            <div className="goal-main">
              <div className="goal-head">
                <div className="goal-name">{g.emoji} {g.name}</div>
                <button className="icon-btn" onClick={() => setEditing(g)} aria-label="แก้ไขเป้าหมาย"><Pencil size={14} /></button>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(pct * 100, 100)}%`, background: 'var(--accent)' }} />
              </div>
              <div className="goal-sub">
                {formatCurrency(g.savedAmount)} / {formatCurrency(g.targetAmount)} · {Math.floor(pct * 100)}%
              </div>
              <button className="goal-deposit" onClick={() => setDepositing(g)}>
                {pct >= 1 ? 'ถึงเป้าแล้ว 🎉 จัดการเงิน' : 'ฝาก / ถอน'}
              </button>
            </div>
          </div>
        );
      })}
      {editing && <GoalForm existing={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {depositing && <GoalDepositForm goal={depositing} onClose={() => setDepositing(null)} />}
    </section>
  );
}
