import { useState } from 'react';
import { Modal } from './Modal';
import { db, newId, type Account, type Category, type RecurringRule } from '../db/db';
import { initialLastGenerated } from '../db/recurringEngine';

export function RecurringForm({
  accounts,
  categories,
  existing,
  onClose,
}: {
  accounts: Account[];
  categories: Category[];
  existing?: RecurringRule;
  onClose: () => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>(existing?.transactionType ?? 'expense');
  const [amountInput, setAmountInput] = useState(existing ? String(existing.amount) : '');
  const [dayInput, setDayInput] = useState(existing ? String(existing.dayOfMonth) : '1');
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

  const amount = Number(amountInput);
  const day = Number(dayInput);
  const typeCategories = categories.filter((c) => c.type === type);
  const valid = amount > 0 && Number.isInteger(day) && day >= 1 && day <= 31 && !!accountId;

  async function save() {
    if (!valid) return;
    // A category picked for the other type is dropped rather than saved inconsistently
    const safeCategoryId = typeCategories.some((c) => c.id === categoryId) ? categoryId : undefined;
    if (existing) {
      await db.recurring.update(existing.id, {
        amount,
        transactionType: type,
        dayOfMonth: day,
        accountId,
        categoryId: safeCategoryId,
        note: note || undefined,
      });
    } else {
      await db.recurring.add({
        id: newId(),
        amount,
        transactionType: type,
        dayOfMonth: day,
        accountId,
        categoryId: safeCategoryId,
        note: note || undefined,
        lastGenerated: initialLastGenerated(day),
      });
    }
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit Recurring' : 'New Recurring'} onCancel={onClose} onSave={save} saveDisabled={!valid}>
      <div className="segmented" style={{ marginBottom: 12 }}>
        <button className={type === 'expense' ? 'active' : ''} onClick={() => { setType('expense'); setCategoryId(''); }}>Expense</button>
        <button className={type === 'income' ? 'active' : ''} onClick={() => { setType('income'); setCategoryId(''); }}>Income</button>
      </div>

      <div className="form-section">
        <div className="form-section-title">Details</div>
        <div className="form-field">
          <div className="form-row">
            <label>Amount (฿)</label>
            <input
              type="number"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-row">
            <label>Day of month</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {typeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rent" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
