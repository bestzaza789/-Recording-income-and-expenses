import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { WizardShell, WizardOption } from './WizardShell';
import { db, type Transaction, type TransactionType } from '../db/db';
import { addTransaction, updateTransaction } from '../db/transactionManager';
import { toDatetimeLocalValue } from '../lib/format';
import { CategoryIcon } from '../lib/icons';

const STEP_TITLES = ['รายจ่ายหรือรายรับ?', 'จำนวนเงิน', 'วันและเวลา', 'บัญชี', 'หมวดหมู่', 'โน้ต'];

export function ManualEntryForm({ onClose, existing }: { onClose: () => void; existing?: Transaction }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [type, setType] = useState<TransactionType>(existing?.transactionType === 'income' ? 'income' : 'expense');
  const [date, setDate] = useState(() => toDatetimeLocalValue(existing ? new Date(existing.date) : new Date()));
  const [accountId, setAccountId] = useState(existing?.accountId ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [initialized, setInitialized] = useState(!!existing);
  const [step, setStep] = useState(0);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    if (!initialized) {
      setCategoryId(filteredCategories[0]?.id ?? '');
    } else {
      setInitialized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, categories.length]);

  const amountNum = parseFloat(amount);
  const disabled = !amountNum || amountNum <= 0 || !accountId || !categoryId;

  async function save() {
    if (disabled) return;
    if (existing) {
      await updateTransaction(existing.id, {
        amount: amountNum,
        type,
        date: new Date(date),
        note: note || undefined,
        accountId,
        categoryId,
      });
    } else {
      await addTransaction({
        amount: amountNum,
        type,
        date: new Date(date),
        note: note || undefined,
        accountId,
        categoryId,
      });
    }
    onClose();
  }

  if (existing) {
    return (
      <Modal title="แก้ไขรายการ" onCancel={onClose} onSave={save} saveDisabled={disabled}>
        <div className="segmented">
          <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>รายจ่าย</button>
          <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>รายรับ</button>
        </div>

        <div className="form-section">
          <div className="form-section-title">รายละเอียด</div>
          <div className="form-field">
            <div className="form-row">
              <label>จำนวนเงิน (฿)</label>
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-row">
              <label>วันและเวลา</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-row">
              <label>บัญชี</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>หมวดหมู่</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">โน้ต (ไม่บังคับ)</div>
          <div className="form-field">
            <div className="form-row">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ต" style={{ textAlign: 'left' }} />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <WizardShell
      title={STEP_TITLES[step]}
      step={step}
      totalSteps={STEP_TITLES.length}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
      onCancel={onClose}
    >
      {step === 0 && (
        <div className="wizard-type-options">
          <button className="wizard-type-option" onClick={() => { setType('expense'); setStep(1); }}>รายจ่าย</button>
          <button className="wizard-type-option" onClick={() => { setType('income'); setStep(1); }}>รายรับ</button>
        </div>
      )}

      {step === 1 && (
        <div className="wizard-input-step">
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          <button className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} disabled={!amountNum || amountNum <= 0} onClick={() => setStep(2)}>
            ถัดไป
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-input-step">
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={() => setStep(3)}>
            ถัดไป
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-options">
          {accounts.length === 0 && <div className="empty-state">ยังไม่มีบัญชี — เพิ่มบัญชีที่หน้า จัดการ ก่อน</div>}
          {accounts.map((a) => (
            <WizardOption key={a.id} onClick={() => { setAccountId(a.id); setStep(4); }}>
              {a.name}
            </WizardOption>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="wizard-options">
          {filteredCategories.length === 0 && <div className="empty-state">ยังไม่มีหมวดหมู่{type === 'income' ? 'รายรับ' : 'รายจ่าย'} — เพิ่มที่หน้า จัดการ ก่อน</div>}
          {filteredCategories.map((c) => (
            <WizardOption key={c.id} onClick={() => { setCategoryId(c.id); setStep(5); }}>
              <CategoryIcon name={c.iconName} color={`#${c.hexColor}`} />
              {c.name}
            </WizardOption>
          ))}
        </div>
      )}

      {step === 5 && (
        <div className="wizard-input-step">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ต (ไม่บังคับ)" style={{ textAlign: 'left' }} />
          <button className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} disabled={disabled} onClick={save}>
            บันทึก
          </button>
        </div>
      )}
    </WizardShell>
  );
}
