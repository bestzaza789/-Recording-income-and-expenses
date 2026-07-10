import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction } from '../db/db';
import { TransactionRow } from '../components/TransactionRow';
import { ManualEntryForm } from '../components/ManualEntryForm';
import { TransferForm } from '../components/TransferForm';
import { deleteTransaction } from '../db/transactionManager';
import { formatDate, formatMonth, startOfDay, startOfMonth } from '../lib/format';

export function Transactions() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  function categoryFor(id?: string) {
    return categories.find((c) => c.id === id);
  }
  function accountNameFor(id?: string) {
    return accounts.find((a) => a.id === id)?.name ?? '';
  }

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) =>
      t.note?.toLowerCase().includes(q) ||
      categoryFor(t.categoryId)?.name.toLowerCase().includes(q) ||
      accountNameFor(t.accountId).toLowerCase().includes(q) ||
      accountNameFor(t.toAccountId).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, transactions, accounts, categories]);

  const grouped = useMemo(() => {
    const monthMap = new Map<number, Map<number, typeof filtered>>();
    for (const t of filtered) {
      const monthKey = startOfMonth(t.date);
      const dayKey = startOfDay(t.date);
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());
      const dayMap = monthMap.get(monthKey)!;
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(t);
    }
    return Array.from(monthMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([monthKey, dayMap]) => ({
        monthKey,
        days: Array.from(dayMap.entries()).sort((a, b) => b[0] - a[0]),
      }));
  }, [filtered]);

  async function handleDelete(id: string) {
    await deleteTransaction(id);
  }

  return (
    <div className="page">
      <h1 className="page-title">Transactions</h1>
      <input className="search-bar" placeholder="Search note, category, or account" value={search} onChange={(e) => setSearch(e.target.value)} />

      {transactions.length === 0 && <div className="empty-state">No transactions yet.</div>}
      {transactions.length > 0 && filtered.length === 0 && <div className="empty-state">No results for '{search}'</div>}

      {grouped.map(({ monthKey, days }) => (
        <div key={monthKey}>
          <div className="month-group-header">{formatMonth(new Date(monthKey))}</div>
          {days.map(([dateKey, items]) => (
            <div key={dateKey}>
              <div className="date-group-header">{formatDate(new Date(dateKey))}</div>
              <div className="card">
                {items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    category={categoryFor(t.categoryId)}
                    onDelete={() => handleDelete(t.id)}
                    onEdit={() => setEditing(t)}
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
