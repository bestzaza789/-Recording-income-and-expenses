import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Account, type Bookmark, type Category, type CategoryType } from '../db/db';
import { CategoryIcon } from '../lib/icons';
import { formatCurrency } from '../lib/format';
import { AccountForm } from '../components/AccountForm';
import { CategoryForm } from '../components/CategoryForm';
import { BookmarkForm } from '../components/BookmarkForm';
import { GoogleSyncCard } from '../components/GoogleSyncCard';
import { deleteBookmark } from '../db/transactionManager';
import { scheduleAutoSync } from '../lib/autoSync';
import { Plus, Trash2, Pencil } from 'lucide-react';

type AccountModal = 'new' | Account | null;
type CategoryModal = { type: CategoryType; existing?: Category } | null;
type BookmarkModal = 'new' | Bookmark | null;

export function Management() {
  const [tab, setTab] = useState<'accounts' | 'categories' | 'quickadd'>('accounts');
  const [accountModal, setAccountModal] = useState<AccountModal>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModal>(null);
  const [bookmarkModal, setBookmarkModal] = useState<BookmarkModal>(null);

  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []) ?? [];
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  function categoryFor(id: string) {
    return categories.find((c) => c.id === id);
  }

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

  return (
    <div className="page">
      <h1 className="page-title">Management</h1>
      <div className="segmented">
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Accounts</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categories</button>
        <button className={tab === 'quickadd' ? 'active' : ''} onClick={() => setTab('quickadd')}>Quick Add</button>
      </div>

      {tab === 'accounts' ? (
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
      ) : tab === 'categories' ? (
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
      ) : (
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            One-tap presets for recurring but irregularly-timed spends (e.g. commute, regular meal) — shown on the Dashboard.
          </div>
          {bookmarks.length === 0 && <div className="empty-state">No quick-add presets yet.</div>}
          {bookmarks.map((b) => (
            <div className="list-item" key={b.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CategoryIcon name={categoryFor(b.categoryId)?.iconName} color={categoryFor(b.categoryId) ? `#${categoryFor(b.categoryId)!.hexColor}` : undefined} />
                <div>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.type} · {formatCurrency(b.amount)}</div>
                </div>
              </div>
              <div>
                <button className="icon-btn" onClick={() => setBookmarkModal(b)}><Pencil size={14} /></button>
                <button className="delete-btn" onClick={() => deleteBookmark(b.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setBookmarkModal('new')}>
            <Plus size={16} /> Add Quick Add Preset
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
      {bookmarkModal && (
        <BookmarkForm
          existing={bookmarkModal === 'new' ? undefined : bookmarkModal}
          onClose={() => setBookmarkModal(null)}
        />
      )}
    </div>
  );
}
