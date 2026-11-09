import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { db, type Transaction, type TransactionType } from '../db/db';
import { updateTransaction } from '../db/transactionManager';
import { toDatetimeLocalValue } from '../lib/format';
import { sortAccounts } from '../lib/lookup';

// One edit form for every transaction type, so a slip saved as the wrong kind
// can be switched between "money out" (expense), income, and a move between
// the user's own accounts (transfer). updateTransaction reverses the old
// balance impact and applies the new one, so changing the type is safe.
export function EditTransactionForm({ existing, onClose }: { existing: Transaction; onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [type, setType] = useState<TransactionType>(existing.transactionType);
  const [amount, setAmount] = useState(String(existing.amount));
  const [date, setDate] = useState(() => toDatetimeLocalValue(new Date(existing.date)));
  const [accountId, setAccountId] = useState(existing.accountId);
  const [toAccountId, setToAccountId] = useState(existing.toAccountId ?? '');
  const [categoryId, setCategoryId] = useState(existing.categoryId ?? '');
  const [note, setNote] = useState(existing.note ?? '');

  const typeCategories = type === 'transfer' ? [] : categories.filter((c) => c.type === type);
  // Keep the category only if it fits the chosen type; otherwise fall back to the first one
  const effectiveCategoryId = typeCategories.some((c) => c.id === categoryId) ? categoryId : typeCategories[0]?.id ?? '';

  const amountNum = parseFloat(amount);
  const validAmount = !!amountNum && amountNum > 0;
  const disabled = type === 'transfer'
    ? !validAmount || !accountId || !toAccountId || accountId === toAccountId
    : !validAmount || !accountId || !effectiveCategoryId;

  function switchType(next: TransactionType) {
    // The slip form's default note would be wrong once it's no longer a transfer
    if (next !== 'transfer' && note === 'โอนเข้าบัญชีตัวเอง') setNote('');
    setType(next);
  }

  async function save() {
    if (disabled) return;
    await updateTransaction(existing.id, {
      amount: amountNum,
      type,
      date: new Date(date),
      note: note || undefined,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'transfer' ? undefined : effectiveCategoryId,
    });
    onClose();
  }

  return (
    <Modal title="แก้ไขรายการ" onCancel={onClose} onSave={save} saveDisabled={disabled}>
      <div className="segmented">
        <button className={type === 'expense' ? 'active' : ''} onClick={() => switchType('expense')}>จ่าย/โอนออก</button>
        <button className={type === 'income' ? 'active' : ''} onClick={() => switchType('income')}>รายรับ</button>
        <button className={type === 'transfer' ? 'active' : ''} onClick={() => switchType('transfer')}>โอนย้ายบัญชี</button>
      </div>
      {type === 'transfer' && (
        <div className="text-secondary-sm" style={{ marginBottom: 12 }}>
          ย้ายเงินระหว่างบัญชีของคุณเอง ไม่นับเป็นรายจ่าย
        </div>
      )}

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
            <label>{type === 'transfer' ? 'จากบัญชี' : 'บัญชี'}</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {type === 'transfer' ? (
            <div className="form-row">
              <label>ไปยังบัญชี</label>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">เลือกบัญชีปลายทาง</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-row">
              <label>หมวดหมู่</label>
              <select value={effectiveCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {typeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
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
