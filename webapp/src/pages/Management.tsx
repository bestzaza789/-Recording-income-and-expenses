import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Account, type Bookmark, type Category, type CategoryType, type RecurringRule } from '../db/db';
import { AccountForm } from '../components/AccountForm';
import { CategoryForm } from '../components/CategoryForm';
import { BookmarkForm } from '../components/BookmarkForm';
import { RecurringForm } from '../components/RecurringForm';
import { GoogleSyncCard } from '../components/GoogleSyncCard';
import { AccountsSection } from '../components/management/AccountsSection';
import { CategoriesSection } from '../components/management/CategoriesSection';
import { QuickAddSection } from '../components/management/QuickAddSection';
import { RecurringSection } from '../components/management/RecurringSection';
import { deleteBookmark } from '../db/transactionManager';
import { scheduleAutoSync } from '../lib/autoSync';
import { sortAccounts } from '../lib/lookup';

type AccountModal = 'new' | Account | null;
type CategoryModal = { type: CategoryType; existing?: Category } | null;
type BookmarkModal = 'new' | Bookmark | null;
type RecurringModal = 'new' | RecurringRule | null;
type ManagementTab = 'accounts' | 'categories' | 'quickadd' | 'recurring';

export function Management() {
  const [tab, setTab] = useState<ManagementTab>('accounts');
  const [accountModal, setAccountModal] = useState<AccountModal>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModal>(null);
  const [bookmarkModal, setBookmarkModal] = useState<BookmarkModal>(null);
  const [recurringModal, setRecurringModal] = useState<RecurringModal>(null);

  const accounts = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []) ?? [];
  const recurringRules = useLiveQuery(() => db.recurring.toArray(), []) ?? [];
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  async function deleteAccount(id: string) {
    const count = await db.transactions.where('accountId').equals(id).count();
    if (count > 0) {
      alert('ลบบัญชีที่ยังมีรายการอยู่ไม่ได้');
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
    scheduleAutoSync();
  }

  return (
    <div className="page">
      <h1 className="page-title">จัดการ</h1>
      <div className="segmented">
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>บัญชี</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>หมวดหมู่</button>
        <button className={tab === 'quickadd' ? 'active' : ''} onClick={() => setTab('quickadd')}>รายการด่วน</button>
        <button className={tab === 'recurring' ? 'active' : ''} onClick={() => setTab('recurring')}>รายการประจำ</button>
      </div>

      {tab === 'accounts' && (
        <AccountsSection
          accounts={accounts}
          onEdit={setAccountModal}
          onDelete={deleteAccount}
          onAdd={() => setAccountModal('new')}
        />
      )}

      {tab === 'categories' && (
        <CategoriesSection
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          onEdit={(type, existing) => setCategoryModal({ type, existing })}
          onAdd={(type) => setCategoryModal({ type })}
          onDelete={deleteCategory}
        />
      )}

      {tab === 'quickadd' && (
        <QuickAddSection
          bookmarks={bookmarks}
          categories={categories}
          onEdit={setBookmarkModal}
          onDelete={deleteBookmark}
          onAdd={() => setBookmarkModal('new')}
        />
      )}

      {tab === 'recurring' && (
        <RecurringSection
          recurringRules={recurringRules}
          categories={categories}
          accounts={accounts}
          onEdit={setRecurringModal}
          onDelete={deleteRecurring}
          onAdd={() => setRecurringModal('new')}
        />
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
