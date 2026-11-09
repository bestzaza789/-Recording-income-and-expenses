import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { WizardShell, WizardOption } from './WizardShell';
import { db } from '../db/db';
import { addTransaction } from '../db/transactionManager';
import { toDatetimeLocalValue } from '../lib/format';
import { sortAccounts } from '../lib/lookup';

const STEP_TITLES = ['จำนวนเงิน', 'วันและเวลา', 'จากบัญชี', 'ไปยังบัญชี', 'โน้ต'];

export function TransferForm({ onClose }: { onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []) ?? [];

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => toDatetimeLocalValue(new Date()));
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!fromAccountId && accounts.length) setFromAccountId(accounts[0].id);
  }, [accounts, fromAccountId]);

  const amountNum = parseFloat(amount);
  const disabled = !amountNum || amountNum <= 0 || !fromAccountId || !toAccountId || fromAccountId === toAccountId;

  async function save() {
    if (disabled) return;
    await addTransaction({
      amount: amountNum,
      type: 'transfer',
      date: new Date(date),
      note: note || undefined,
      accountId: fromAccountId,
      toAccountId,
    });
    onClose();
  }

  const toOptions = accounts.filter((a) => a.id !== fromAccountId);

  return (
    <WizardShell
      title={STEP_TITLES[step]}
      step={step}
      totalSteps={STEP_TITLES.length}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
      onCancel={onClose}
    >
      {step === 0 && (
        <div className="wizard-input-step">
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          <button className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} disabled={!amountNum || amountNum <= 0} onClick={() => setStep(1)}>
            ถัดไป
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="wizard-input-step">
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={() => setStep(2)}>
            ถัดไป
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-options">
          {accounts.length === 0 && <div className="empty-state">ยังไม่มีบัญชี — เพิ่มบัญชีที่หน้า จัดการ ก่อน</div>}
          {accounts.map((a) => (
            <WizardOption
              key={a.id}
              onClick={() => {
                setFromAccountId(a.id);
                if (toAccountId === a.id) setToAccountId('');
                setStep(3);
              }}
            >
              {a.name}
            </WizardOption>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="wizard-options">
          {toOptions.length === 0 && <div className="empty-state">ต้องมีบัญชีอื่นอีกอย่างน้อย 1 บัญชีจึงจะโอนได้</div>}
          {toOptions.map((a) => (
            <WizardOption key={a.id} onClick={() => { setToAccountId(a.id); setStep(4); }}>
              {a.name}
            </WizardOption>
          ))}
        </div>
      )}

      {step === 4 && (
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
