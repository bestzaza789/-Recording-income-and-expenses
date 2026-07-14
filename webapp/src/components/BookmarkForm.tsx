import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { db, type Bookmark, type CategoryType } from '../db/db';
import { addBookmark, updateBookmark } from '../db/transactionManager';

export function BookmarkForm({ onClose, existing }: { onClose: () => void; existing?: Bookmark }) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<CategoryType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [accountId, setAccountId] = useState(existing?.accountId ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!accountId && accounts.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, categories.length]);

  const amountNum = parseFloat(amount);
  const disabled = !name || !amountNum || amountNum <= 0 || !accountId || !categoryId;

  async function save() {
    if (disabled) return;
    const input = { name, type, amount: amountNum, accountId, categoryId, note: note || undefined };
    if (existing) {
      await updateBookmark(existing.id, input);
    } else {
      await addBookmark(input);
    }
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit Quick Add' : 'New Quick Add'} onCancel={onClose} onSave={save} saveDisabled={disabled}>
      <div className="segmented">
        <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>Expense</button>
        <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>Income</button>
      </div>

      <div className="form-section">
        <div className="form-section-title">Details</div>
        <div className="form-field">
          <div className="form-row">
            <label>Label</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BTS to work" />
          </div>
          <div className="form-row">
            <label>Amount (฿)</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
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
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Defaults to label" style={{ textAlign: 'left' }} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
