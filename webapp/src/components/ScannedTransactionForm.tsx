import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { db } from '../db/db';
import { addTransaction } from '../db/transactionManager';
import type { ParsedData } from '../ocr/ocrService';
import { accountMatchesBank } from '../ocr/parseSlip';
import { accountForSuffix, forgetSuffix, rememberSuffix } from '../ocr/slipMemory';
import { categoryFor, sortAccounts } from '../lib/lookup';
import { formatCurrency, formatDateTime } from '../lib/format';
import { TRANSACTION_TYPE_LABEL } from '../lib/labels';

type Mode = 'expense' | 'transfer';

// A saved transaction this close in time with the same amount is flagged as a possible duplicate
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

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
  const accounts = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const [date] = useState(() => defaultDate ?? new Date());
  const [mode, setMode] = useState<Mode>('expense');
  const [amount, setAmount] = useState(String(parsedData.amount ?? ''));
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('สแกนจากสลิป');
  const [transferReason, setTransferReason] = useState<'name' | 'remembered' | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [senderSuffix, receiverSuffix] = parsedData.accountSuffixes;
  const accountNumberCount = parsedData.accountSuffixes.length;

  // Pick the source account and, if the receiver is one of the user's own
  // accounts we've seen before, preselect "transfer to my account". Runs once
  // so it never overrides what the user picks afterwards.
  useEffect(() => {
    if (initialized || !accounts.length) return;
    const exists = (id?: string) => (id && accounts.some((a) => a.id === id) ? id : undefined);

    const fromRemembered = accountNumberCount >= 2 ? exists(accountForSuffix(senderSuffix)) : undefined;
    const fromKeyword = parsedData.accountKeyword
      ? accounts.find((a) => accountMatchesBank(a.name, parsedData.accountKeyword!))?.id
      : undefined;
    const fromId = fromRemembered ?? fromKeyword ?? accounts[0].id;
    setAccountId(fromId);

    // Receiver is the user's own account if the slip shows the same person on
    // both sides, or if this receiver number was confirmed as theirs before.
    const rememberedReceiver = accountNumberCount >= 2 ? exists(accountForSuffix(receiverSuffix)) : undefined;
    const usableRemembered = rememberedReceiver !== fromId ? rememberedReceiver : undefined;
    if (parsedData.sameName || usableRemembered) {
      const receiverBank = parsedData.bankKeywords[1];
      const byBank = receiverBank
        ? accounts.find((a) => a.id !== fromId && accountMatchesBank(a.name, receiverBank))?.id
        : undefined;
      setMode('transfer');
      setToAccountId(usableRemembered ?? byBank ?? '');
      setNote('โอนเข้าบัญชีตัวเอง');
      setTransferReason(parsedData.sameName ? 'name' : 'remembered');
    }
    setInitialized(true);
  }, [initialized, accounts, accountNumberCount, senderSuffix, receiverSuffix, parsedData.accountKeyword, parsedData.sameName, parsedData.bankKeywords]);

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

  const nearby = useLiveQuery(
    () => db.transactions
      .where('date')
      .between(new Date(date.getTime() - DUPLICATE_WINDOW_MS), new Date(date.getTime() + DUPLICATE_WINDOW_MS), true, true)
      .toArray(),
    [date.getTime()],
  ) ?? [];
  const possibleDuplicates = amountNum > 0
    ? nearby.filter((t) => t.transactionType !== 'income' && Math.abs(t.amount - amountNum) < 0.005)
    : [];

  function switchMode(next: Mode) {
    setMode(next);
    setTransferReason(null);
    if (next === 'transfer' && note === 'สแกนจากสลิป') setNote('โอนเข้าบัญชีตัวเอง');
    if (next === 'expense' && note === 'โอนเข้าบัญชีตัวเอง') setNote('สแกนจากสลิป');
  }

  const validAmount = !!amountNum && amountNum > 0;
  const disabled = mode === 'expense'
    ? !validAmount || !accountId || !categoryId
    : !validAmount || !accountId || !toAccountId || accountId === toAccountId;

  async function save() {
    if (disabled) return;
    if (mode === 'transfer') {
      await addTransaction({ amount: amountNum, type: 'transfer', date, note, accountId, toAccountId });
    } else {
      await addTransaction({ amount: amountNum, type: 'expense', date, note, accountId, categoryId });
    }

    // Learn from the confirmed choice. Only trust sender/receiver order when the
    // slip shows both account numbers.
    if (accountNumberCount >= 2) {
      rememberSuffix(senderSuffix, accountId);
      if (mode === 'transfer') rememberSuffix(receiverSuffix, toAccountId);
      else forgetSuffix(receiverSuffix);
    }

    await onSaved?.();
    onClose();
  }

  return (
    <Modal title={`ยืนยันสลิป${titleSuffix ?? ''}`} onCancel={onClose} onSave={save} saveDisabled={disabled}>
      <div className="segmented">
        <button className={mode === 'expense' ? 'active' : ''} onClick={() => switchMode('expense')}>รายจ่าย</button>
        <button className={mode === 'transfer' ? 'active' : ''} onClick={() => switchMode('transfer')}>โอนเข้าบัญชีตัวเอง</button>
      </div>

      {transferReason && (
        <div className="text-secondary-sm" style={{ marginBottom: 12 }}>
          {transferReason === 'name'
            ? `ชื่อผู้โอนและผู้รับเป็นชื่อเดียวกัน (${parsedData.names[0]}) จึงเดาว่าเป็นการโอนเข้าบัญชีตัวเอง`
            : `เลขบัญชีปลายทาง (ลงท้าย ${receiverSuffix}) เป็นบัญชีของคุณ ครั้งก่อนเคยบันทึกเป็นการโอนเข้าบัญชีตัวเอง`}
          {' '}ถ้าไม่ใช่ กด รายจ่าย
        </div>
      )}

      {possibleDuplicates.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--yellow)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13 }}>
            <strong>อาจซ้ำกับรายการที่บันทึกไว้แล้ว</strong>
            {possibleDuplicates.map((t) => (
              <div key={t.id} className="text-secondary-sm">
                {formatCurrency(t.amount)} · {categoryFor(categories, t.categoryId)?.name ?? t.note ?? TRANSACTION_TYPE_LABEL[t.transactionType]} · {formatDateTime(t.date)}
              </div>
            ))}
            <div className="text-secondary-sm">ถ้าเป็นรายการเดียวกัน กด ยกเลิก แล้วกด ข้าม ที่สลิปนี้</div>
          </div>
        </div>
      )}

      <div className="form-section">
        <div className="form-section-title">ตรวจสอบข้อมูลที่อ่านได้</div>
        <div className="form-field">
          <div className="form-row">
            <label>จำนวนเงิน (฿)</label>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-row">
            <label>{mode === 'transfer' ? 'จากบัญชี' : 'บัญชี'}</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {mode === 'transfer' ? (
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
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
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
