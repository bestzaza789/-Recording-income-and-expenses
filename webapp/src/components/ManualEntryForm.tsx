import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { db, type TransactionType } from '../db/db';
import { addTransaction } from '../db/transactionManager';

export function ManualEntryForm({ onClose }: { onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

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
    <Modal title="Manual Entry" onCancel={onClose} onSave={save} saveDisabled={disabled}>
      <div className="segmented">
        <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>Expense</button>
        <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>Income</button>
      </div>

      <div className="form-section">
        <div className="form-section-title">Details</div>
        <div className="form-field">
          <div className="form-row">
            <label>Amount (฿)</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-row">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
