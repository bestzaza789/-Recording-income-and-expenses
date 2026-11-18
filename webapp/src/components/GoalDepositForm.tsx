import { useState } from 'react';
import { Modal } from './Modal';
import { db, type Goal } from '../db/db';
import { formatCurrency } from '../lib/format';
import { showSaved } from '../lib/saveFeedback';

type Mode = 'deposit' | 'withdraw';

export function GoalDepositForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('deposit');
  const [input, setInput] = useState('');

  const amount = Number(input);
  const tooMuch = mode === 'withdraw' && amount > goal.savedAmount;
  const valid = input !== '' && !Number.isNaN(amount) && amount > 0 && !tooMuch;

  async function save() {
    if (!valid) return;
    const next = mode === 'deposit' ? goal.savedAmount + amount : goal.savedAmount - amount;
    await db.goals.update(goal.id, { savedAmount: next });
    const reached = goal.savedAmount < goal.targetAmount && next >= goal.targetAmount;
    await showSaved(reached ? 'ถึงเป้าแล้ว! เก่งมากกก 🎉' : mode === 'deposit' ? 'ฝากแล้วจ้า 🐷' : 'ถอนแล้ว', { celebrate: reached });
    onClose();
  }

  return (
    <Modal title={`${goal.emoji} ${goal.name}`} onCancel={onClose} onSave={save} saveDisabled={!valid}>
      <div className="form-section">
        <div className="segmented" style={{ marginBottom: 12 }}>
          <button className={mode === 'deposit' ? 'active' : ''} onClick={() => setMode('deposit')}>ฝากเข้า</button>
          <button className={mode === 'withdraw' ? 'active' : ''} onClick={() => setMode('withdraw')}>ถอนออก</button>
        </div>
        <div className="form-field">
          <div className="form-row">
            <label>จำนวนเงิน</label>
            <input type="number" inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0.00" autoFocus />
          </div>
        </div>
        <div style={{ fontSize: 12, color: tooMuch ? 'var(--red)' : 'var(--text-secondary)', marginTop: 6 }}>
          {tooMuch ? 'ถอนเกินยอดที่ฝากไว้' : `ตอนนี้ฝากไว้ ${formatCurrency(goal.savedAmount)} / ${formatCurrency(goal.targetAmount)}`}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          เป็นการจดแยกต่างหาก ไม่กระทบยอดคงเหลือของบัญชี
        </div>
      </div>
    </Modal>
  );
}
