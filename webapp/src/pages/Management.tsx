import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Account, type Category, type CategoryType, type RecurringRule } from '../db/db';
import { CategoryIcon } from '../lib/icons';
import { formatCurrency } from '../lib/format';
import { AccountForm } from '../components/AccountForm';
import { CategoryForm } from '../components/CategoryForm';
import { RecurringForm } from '../components/RecurringForm';
import { GoogleSyncCard } from '../components/GoogleSyncCard';
import { scheduleAutoSync } from '../lib/autoSync';
import { Plus, Trash2, Pencil } from 'lucide-react';

type AccountModal = 'new' | Account | null;
type CategoryModal = { type: CategoryType; existing?: Category } | null;

export function Management() {
  const [tab, setTab] = useState<'accounts' | 'categories' | 'recurring'>('accounts');
  const [accountModal, setAccountModal] = useState<AccountModal>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModal>(null);
  const [recurringModal, setRecurringModal] = useState<'new' | RecurringRule | null>(null);

  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const recurringRules = useLiveQuery(() => db.recurring.toArray(), []) ?? [];
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  async function deleteAccount(id: string) {
    const count = await db.transactions.where('accountId').equals(id).count();
    if (count > 0) {
      alert('Cannot delete an account with existing transactions.');
      return;
    }
    await db.accounts.delete(id);
    scheduleAutoSync();
  }

  async function deleteCategory(id: string) {
    await db.categories.delete(id);
    scheduleAutoSync();
  }

  async function deleteRecurring(id: string) {
    await db.recurring.delete(id);
  }

  return (
    <div className="page">
      <h1 className="page-title">Management</h1>
      <div className="segmented">
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Accounts</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categories</button>
        <button className={tab === 'recurring' ? 'active' : ''} onClick={() => setTab('recurring')}>Recurring</button>
      </div>

      {tab === 'accounts' && (
        <div className="card">
          {accounts.length === 0 && <div className="empty-state">No accounts yet.</div>}
          {accounts.map((a) => (
            <div className="list-item" key={a.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.accountType} · {formatCurrency(a.currentBalance)}</div>
              </div>
              <div>
                <button className="icon-btn" onClick={() => setAccountModal(a)}><Pencil size={14} /></button>
                <button className="delete-btn" onClick={() => deleteAccount(a.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setAccountModal('new')}>
            <Plus size={16} /> Add Account
          </button>
        </div>
      )}

      {tab === 'categories' && (
        <>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Expense</div>
            {expenseCategories.map((c) => (
              <div className="list-item" key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CategoryIcon name={c.iconName} color={`#${c.hexColor}`} />
                  {c.name}
                </div>
                <div>
                  <button className="icon-btn" onClick={() => setCategoryModal({ type: 'expense', existing: c })}><Pencil size={14} /></button>
                  <button className="delete-btn" onClick={() => deleteCategory(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setCategoryModal({ type: 'expense' })}>
              <Plus size={16} /> Add Expense Category
            </button>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Income</div>
            {incomeCategories.map((c) => (
              <div className="list-item" key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CategoryIcon name={c.iconName} color={`#${c.hexColor}`} />
                  {c.name}
                </div>
                <div>
                  <button className="icon-btn" onClick={() => setCategoryModal({ type: 'income', existing: c })}><Pencil size={14} /></button>
                  <button className="delete-btn" onClick={() => deleteCategory(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setCategoryModal({ type: 'income' })}>
              <Plus size={16} /> Add Income Category
            </button>
          </div>
        </>
      )}

      {tab === 'recurring' && (
        <div className="card">
          {recurringRules.length === 0 && <div className="empty-state">No recurring transactions yet.</div>}
          {recurringRules.map((r) => {
            const category = categories.find((c) => c.id === r.categoryId);
            const account = accounts.find((a) => a.id === r.accountId);
            return (
              <div className="list-item" key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CategoryIcon name={category?.iconName} color={category ? `#${category.hexColor}` : undefined} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.note || category?.name || 'Recurring'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatCurrency(r.amount)} · day {r.dayOfMonth} · {account?.name ?? 'Unknown account'}
                    </div>
                  </div>
                </div>
                <div>
                  <button className="icon-btn" onClick={() => setRecurringModal(r)}><Pencil size={14} /></button>
                  <button className="delete-btn" onClick={() => deleteRecurring(r.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
          <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setRecurringModal('new')}>
            <Plus size={16} /> Add Recurring
          </button>
        </div>
      )}

      <GoogleSyncCard />

      {accountModal && (
        <AccountForm
          existing={accountModal === 'new' ? undefined : accountModal}
          onClose={() => setAccountModal(null)}
        />
      )}
      {categoryModal && (
        <CategoryForm
          defaultType={categoryModal.type}
          existing={categoryModal.existing}
          onClose={() => setCategoryModal(null)}
        />
      )}
      {recurringModal && (
        <RecurringForm
          accounts={accounts}
          categories={categories}
          existing={recurringModal === 'new' ? undefined : recurringModal}
          onClose={() => setRecurringModal(null)}
        />
      )}
    </div>
  );
}
