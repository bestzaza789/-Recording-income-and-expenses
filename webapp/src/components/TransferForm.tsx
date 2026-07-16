import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { db, type Transaction } from '../db/db';
import { addTransaction, updateTransaction } from '../db/transactionManager';
import { toDatetimeLocalValue } from '../lib/format';

export function TransferForm({ onClose, existing }: { onClose: () => void; existing?: Transaction }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];

  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [date, setDate] = useState(() => toDatetimeLocalValue(existing ? new Date(existing.date) : new Date()));
  const [fromAccountId, setFromAccountId] = useState(existing?.accountId ?? '');
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

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

  return (
    <Modal title={existing ? 'Edit Transfer' : 'Transfer'} onCancel={onClose} onSave={save} saveDisabled={disabled}>
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
