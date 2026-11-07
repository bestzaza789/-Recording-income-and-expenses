import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { db } from '../db/db';
import { TransactionRow } from '../components/TransactionRow';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { TransferForm } from '../components/TransferForm';
import { deleteTransaction } from '../db/transactionManager';
import { formatCurrency, formatDate, formatMonth, startOfDay, startOfMonth } from '../lib/format';
import { categoryFor } from '../lib/lookup';
import { ACCOUNT_TYPE_LABEL } from '../lib/labels';
import type { Transaction } from '../db/db';

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Transaction | null>(null);

  const account = useLiveQuery(() => (id ? db.accounts.get(id) : undefined), [id]);
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const related = useMemo(
    () => allTransactions.filter((t) => t.accountId === id || t.toAccountId === id),
    [allTransactions, id]
  );

  // Walk oldest -> newest from the account's initial balance so each row's
  // running balance can be cross-checked against the stored currentBalance.
  const withRunningBalance = useMemo(() => {
    if (!account) return [];
    const ascending = [...related].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = account.initialBalance;
    const rows: { transaction: Transaction; delta: number; balanceAfter: number }[] = [];
    for (const t of ascending) {
      let delta = 0;
      if (t.transactionType === 'expense' && t.accountId === id) delta = -t.amount;
      else if (t.transactionType === 'income' && t.accountId === id) delta = t.amount;
      else if (t.transactionType === 'transfer' && t.accountId === id) delta = -t.amount;
      else if (t.transactionType === 'transfer' && t.toAccountId === id) delta = t.amount;
      running += delta;
      rows.push({ transaction: t, delta, balanceAfter: running });
    }
    return rows.reverse();
  }, [related, account, id]);

  const computedFinalBalance = withRunningBalance[0]?.balanceAfter ?? account?.initialBalance ?? 0;
  const mismatch = account ? Math.abs(computedFinalBalance - account.currentBalance) > 0.005 : false;

  const grouped = useMemo(() => {
    const monthMap = new Map<number, Map<number, typeof withRunningBalance>>();
    for (const row of withRunningBalance) {
      const monthKey = startOfMonth(row.transaction.date);
      const dayKey = startOfDay(row.transaction.date);
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());
      const dayMap = monthMap.get(monthKey)!;
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(row);
    }
    return Array.from(monthMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([monthKey, dayMap]) => ({
        monthKey,
        days: Array.from(dayMap.entries()).sort((a, b) => b[0] - a[0]),
      }));
  }, [withRunningBalance]);

  async function handleDelete(txId: string) {
    await deleteTransaction(txId);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
  }

  if (!account) {
    return (
      <div className="page">
        <div className="empty-state">ไม่พบบัญชีนี้</div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="icon-btn" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> ย้อนกลับ
      </button>

      <h1 className="page-title" style={{ marginBottom: 4 }}>{account.name}</h1>
      <div className="net-worth-value" style={{ color: account.currentBalance >= 0 ? 'var(--text)' : 'var(--red)' }}>
        {formatCurrency(account.currentBalance)}
      </div>
      <div className="text-secondary-sm" style={{ marginTop: 4 }}>
        {ACCOUNT_TYPE_LABEL[account.accountType]} · ยอดเริ่มต้น {formatCurrency(account.initialBalance)}
      </div>

      {mismatch && (
        <div className="card" style={{ marginTop: 16, borderColor: 'var(--red)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13 }}>
            <strong>ยอดเงินไม่ตรงกัน</strong> เมื่อคำนวณทุกรายการจากยอดเริ่มต้นได้{' '}
            {formatCurrency(computedFinalBalance)} แต่ยอดคงเหลือที่บันทึกไว้คือ {formatCurrency(account.currentBalance)}
            เลื่อนดูรายการด้านล่าง (ยอดคงเหลือแสดงใต้จำนวนเงินแต่ละรายการ) เพื่อหาจุดที่เริ่มคลาดเคลื่อน
          </div>
        </div>
      )}

      {grouped.length === 0 && <div className="empty-state" style={{ marginTop: 16 }}>บัญชีนี้ยังไม่มีรายการ</div>}

      {grouped.map(({ monthKey, days }) => (
        <div key={monthKey}>
          <div className="month-group-header">{formatMonth(new Date(monthKey))}</div>
          {days.map(([dateKey, rows]) => (
            <div key={dateKey}>
              <div className="date-group-header">{formatDate(new Date(dateKey))}</div>
              <div className="card">
                {rows.map(({ transaction, delta, balanceAfter }) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    category={categoryFor(categories, transaction.categoryId)}
                    deltaOverride={delta}
                    runningBalance={balanceAfter}
                    onEdit={() => openEdit(transaction)}
                    onDelete={() => handleDelete(transaction.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {editing && editing.transactionType === 'transfer' && (
        <TransferForm existing={editing} onClose={() => setEditing(null)} />
      )}
      {editing && editing.transactionType !== 'transfer' && (
        <ManualEntryForm existing={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
