import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from './Modal';
import { db } from '../db/db';
import { addTransaction } from '../db/transactionManager';
import type { ParsedData } from '../ocr/ocrService';
import { accountMatchesBank } from '../ocr/parseSlip';

export function ScannedTransactionForm({
  parsedData,
  onClose,
  titleSuffix,
  defaultDate,
  onSaved,
}: {
  parsedData: ParsedData;
  onClose: () => void;
  titleSuffix?: string;
  defaultDate?: Date;
  onSaved?: () => void | Promise<void>;
}) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const [amount, setAmount] = useState(String(parsedData.amount ?? ''));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('สแกนจากสลิป');

  useEffect(() => {
    if (!accounts.length) return;
    const byKeyword = parsedData.accountKeyword
      ? accounts.find((a) => accountMatchesBank(a.name, parsedData.accountKeyword!))
      : undefined;
    setAccountId((byKeyword ?? accounts[0]).id);
  }, [accounts, parsedData.accountKeyword]);

  useEffect(() => {
    if (!expenseCategories.length) return;
    let match;
    if (parsedData.categoryKeyword === 'food') {
      match = expenseCategories.find((c) => c.name.toLowerCase().includes('food') || c.name.includes('อาหาร'));
    } else if (parsedData.categoryKeyword === 'transport') {
      match = expenseCategories.find((c) => c.name.toLowerCase().includes('transport') || c.name.includes('เดิน'));
    }
    setCategoryId((match ?? expenseCategories[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, parsedData.categoryKeyword]);

  const amountNum = parseFloat(amount);
  const disabled = !amountNum || amountNum <= 0 || !accountId || !categoryId;

  async function save() {
    if (disabled) return;
    await addTransaction({
      amount: amountNum,
      type: 'expense',
      date: defaultDate ?? new Date(),
      note,
      accountId,
      categoryId,
    });
    await onSaved?.();
    onClose();
  }

  return (
    <Modal title={`ยืนยันสลิป${titleSuffix ?? ''}`} onCancel={onClose} onSave={save} saveDisabled={disabled}>
      <div className="form-section">
        <div className="form-section-title">ตรวจสอบข้อมูลที่อ่านได้</div>
        <div className="form-field">
          <div className="form-row">
            <label>จำนวนเงิน (฿)</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
              {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="form-section">
        <div className="form-section-title">โน้ต</div>
        <div className="form-field">
          <div className="form-row">
            <input value={note} onChange={(e) => setNote(e.target.value)} style={{ textAlign: 'left' }} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
