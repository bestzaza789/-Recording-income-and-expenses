import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { WizardShell, WizardOption } from './WizardShell';
import { db, type TransactionType } from '../db/db';
import { addTransaction } from '../db/transactionManager';
import { toDatetimeLocalValue } from '../lib/format';
import { CategoryIcon } from '../lib/icons';
import { sortAccounts } from '../lib/lookup';

const STEP_TITLES = ['รายจ่ายหรือรายรับ?', 'จำนวนเงิน', 'วันและเวลา', 'บัญชี', 'หมวดหมู่', 'โน้ต'];

export function ManualEntryForm({ onClose }: { onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(() => toDatetimeLocalValue(new Date()));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    setCategoryId(filteredCategories[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, categories.length]);

  const amountNum = parseFloat(amount);
  const disabled = !amountNum || amountNum <= 0 || !accountId || !categoryId;

  async function save() {
    if (disabled) return;
    await addTransaction({
      amount: amountNum,
      type,
      date: new Date(date),
      note: note || undefined,
      accountId,
      categoryId,
    });
    onClose();
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
