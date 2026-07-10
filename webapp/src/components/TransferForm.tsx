import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { db } from '../db/db';
import { addTransaction } from '../db/transactionManager';

export function TransferForm({ onClose }: { onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');

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

  return (
    <Modal title="Transfer" onCancel={onClose} onSave={save} saveDisabled={disabled}>
      <div className="form-section">
        <div className="form-section-title">Transfer Details</div>
        <div className="form-field">
          <div className="form-row">
            <label>Amount (฿)</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-row">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
