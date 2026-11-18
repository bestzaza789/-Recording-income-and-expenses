import { useState } from 'react';
import { Modal } from './Modal';
import { db, newId, type Goal } from '../db/db';
import { showSaved } from '../lib/saveFeedback';
import { scheduleAutoSync } from '../lib/autoSync';
import { confirmDelete } from '../lib/confirm';

export const GOAL_EMOJIS = ['🐷', '✈️', '🏠', '🚗', '📱', '🎮', '🎁', '🏖️'];

export function GoalForm({ existing, onClose }: { existing?: Goal; onClose: () => void }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? GOAL_EMOJIS[0]);
  const [targetInput, setTargetInput] = useState(existing ? String(existing.targetAmount) : '');

  const target = Number(targetInput);
  const valid = name.trim() !== '' && targetInput !== '' && !Number.isNaN(target) && target > 0;

  async function save() {
    if (!valid) return;
    if (existing) {
      await db.goals.update(existing.id, { name: name.trim(), emoji, targetAmount: target });
    } else {
      await db.goals.add({ id: newId(), name: name.trim(), emoji, targetAmount: target, savedAmount: 0, createdAt: new Date() });
    }
    scheduleAutoSync();
    await showSaved();
    onClose();
  }

  async function remove() {
    if (!existing) return;
    const detail = existing.savedAmount > 0 ? 'เงินที่ฝากไว้ในเป้าหมายนี้จะหายไปจากรายการ · กู้คืนไม่ได้' : undefined;
    if (!(await confirmDelete(`เป้าหมาย "${existing.name}"`, detail))) return;
    await db.goals.delete(existing.id);
    scheduleAutoSync();
    onClose();
  }

  return (
    <Modal title={existing ? 'แก้ไขเป้าหมาย' : 'เป้าหมายใหม่'} onCancel={onClose} onSave={save} saveDisabled={!valid}>
      <div className="form-section">
        <div className="form-field">
          <div className="form-row">
            <label>ชื่อ</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เที่ยวญี่ปุ่น" />
          </div>
          <div className="form-row">
            <label>เป้าหมาย</label>
            <input type="number" inputMode="decimal" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="emoji-picker" role="radiogroup" aria-label="ไอคอน">
          {GOAL_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              className={`emoji-chip${emoji === e ? ' is-active' : ''}`}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
        {existing && (
          <button className="delete-btn" style={{ marginTop: 16 }} onClick={remove}>ลบเป้าหมาย</button>
        )}
      </div>
    </Modal>
  );
}
