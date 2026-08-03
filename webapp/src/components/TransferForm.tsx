import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { WizardShell, WizardOption } from './WizardShell';
import { db, type Transaction } from '../db/db';
import { addTransaction, updateTransaction } from '../db/transactionManager';
import { toDatetimeLocalValue } from '../lib/format';

const STEP_TITLES = ['Amount', 'Date & Time', 'From Account', 'To Account', 'Note'];

export function TransferForm({ onClose, existing }: { onClose: () => void; existing?: Transaction }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [date, setDate] = useState(() => toDatetimeLocalValue(existing ? new Date(existing.date) : new Date()));
  const [fromAccountId, setFromAccountId] = useState(existing?.accountId ?? '');
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!fromAccountId && accounts.length) setFromAccountId(accounts[0].id);
  }, [accounts, fromAccountId]);

  const amountNum = parseFloat(amount);
  const disabled = !amountNum || amountNum <= 0 || !fromAccountId || !toAccountId || fromAccountId === toAccountId;

  async function save() {
    if (disabled) return;
    if (existing) {
      await updateTransaction(existing.id, {
        amount: amountNum,
        type: 'transfer',
        date: new Date(date),
        note: note || undefined,
        accountId: fromAccountId,
        toAccountId,
      });
    } else {
      await addTransaction({
        amount: amountNum,
        type: 'transfer',
        date: new Date(date),
        note: note || undefined,
        accountId: fromAccountId,
        toAccountId,
      });
    }
    onClose();
  }

  if (existing) {
    return (
      <Modal title="Edit Transfer" onCancel={onClose} onSave={save} saveDisabled={disabled}>
        <div className="form-section">
          <div className="form-section-title">Transfer Details</div>
          <div className="form-field">
            <div className="form-row">
              <label>Amount (฿)</label>
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-row">
              <label>Date & Time</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Accounts</div>
          <div className="form-field">
            <div className="form-row">
              <label>From</label>
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>To</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Select Destination</option>
                {accounts.filter((a) => a.id !== fromAccountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Note (Optional)</div>
          <div className="form-field">
            <div className="form-row">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" style={{ textAlign: 'left' }} />
            </div>
          </div>
        </div>
      </Modal>
    );
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
            Next
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="wizard-input-step">
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={() => setStep(2)}>
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-options">
          {accounts.length === 0 && <div className="empty-state">No accounts yet — add one in Management first.</div>}
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
          {toOptions.length === 0 && <div className="empty-state">Add another account to transfer to.</div>}
          {toOptions.map((a) => (
            <WizardOption key={a.id} onClick={() => { setToAccountId(a.id); setStep(4); }}>
              {a.name}
            </WizardOption>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="wizard-input-step">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" style={{ textAlign: 'left' }} />
          <button className="upload-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} disabled={disabled} onClick={save}>
            Save
          </button>
        </div>
      )}
    </WizardShell>
  );
}
