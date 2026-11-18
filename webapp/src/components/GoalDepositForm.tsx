import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { db, newId, type CategoryType, type Goal } from '../db/db';
import { EMPTY } from '../lib/empty';
import { addTransaction } from '../db/transactionManager';
import { EMOJI_PREFIX } from '../lib/iconData';
import { sortAccounts } from '../lib/lookup';
import { formatCurrency } from '../lib/format';
import { showSaved } from '../lib/saveFeedback';
import { scheduleAutoSync } from '../lib/autoSync';

type Mode = 'deposit' | 'withdraw';

// Moving money to/from a goal through a real account is recorded as an ordinary
// transaction in these dedicated categories, so balances stay correct and the
// savings show up (separately) in the stats.
const SAVING_CATEGORY: Record<Mode, { name: string; type: CategoryType }> = {
  deposit: { name: 'ออมเงิน', type: 'expense' },
  withdraw: { name: 'ถอนเงินออม', type: 'income' },
};

async function savingCategoryId(mode: Mode): Promise<string> {
  const { name, type } = SAVING_CATEGORY[mode];
  const existing = (await db.categories.toArray()).find((c) => c.name === name && c.type === type);
  if (existing) return existing.id;
  const id = newId();
  await db.categories.add({ id, name, type, iconName: EMOJI_PREFIX + '💰', hexColor: '34C759' });
  return id;
}

export function GoalDepositForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('deposit');
  const [input, setInput] = useState('');
  const [accountId, setAccountId] = useState('');
  const accounts = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []) ?? EMPTY;

  const amount = Number(input);
  const tooMuch = mode === 'withdraw' && amount > goal.savedAmount;
  const valid = input !== '' && !Number.isNaN(amount) && amount > 0 && !tooMuch;

  async function save() {
    if (!valid) return;
    const next = mode === 'deposit' ? goal.savedAmount + amount : goal.savedAmount - amount;
    if (accountId) {
      await addTransaction({
        amount,
        type: mode === 'deposit' ? 'expense' : 'income',
        date: new Date(),
        note: `${mode === 'deposit' ? 'ออมเข้า' : 'ถอนจาก'}เป้าหมาย: ${goal.name}`,
        accountId,
        categoryId: await savingCategoryId(mode),
      });
    }
    await db.goals.update(goal.id, { savedAmount: next });
    scheduleAutoSync();
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
          <div className="form-row">
            <label>{mode === 'deposit' ? 'หักจากบัญชี' : 'เข้าบัญชี'}</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">ไม่ผูกบัญชี (จดอย่างเดียว)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 12, color: tooMuch ? 'var(--red)' : 'var(--text-secondary)', marginTop: 6 }}>
          {tooMuch ? 'ถอนเกินยอดที่ฝากไว้' : `ตอนนี้ฝากไว้ ${formatCurrency(goal.savedAmount)} / ${formatCurrency(goal.targetAmount)}`}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          {accountId
            ? 'จะบันทึกเป็นรายการในบัญชี (หมวด "' + SAVING_CATEGORY[mode].name + '") และปรับยอดคงเหลือ'
            : 'เป็นการจดแยกต่างหาก ไม่กระทบยอดคงเหลือของบัญชี'}
        </div>
      </div>
    </Modal>
  );
}
