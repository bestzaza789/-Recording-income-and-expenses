import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageSkeleton } from '../components/Skeleton';
import { db, type Account, type Bookmark, type Category, type CategoryType, type RecurringRule } from '../db/db';
import { EMPTY } from '../lib/empty';
import { AccountForm } from '../components/AccountForm';
import { CategoryForm } from '../components/CategoryForm';
import { BookmarkForm } from '../components/BookmarkForm';
import { RecurringForm } from '../components/RecurringForm';
import { GoogleSyncCard } from '../components/GoogleSyncCard';
import { ThemePicker } from '../components/ThemePicker';
import { DailyLimitSetting } from '../components/DailyLimitSetting';
import { AccountsSection } from '../components/management/AccountsSection';
import { CategoriesSection } from '../components/management/CategoriesSection';
import { QuickAddSection } from '../components/management/QuickAddSection';
import { RecurringSection } from '../components/management/RecurringSection';
import { deleteAccount as removeAccount, deleteBookmark } from '../db/transactionManager';
import { alertDialog, confirmDelete } from '../lib/confirm';
import { formatCurrency } from '../lib/format';
import { scheduleAutoSync } from '../lib/autoSync';
import { accountNameFor, categoryFor, sortAccounts } from '../lib/lookup';

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

  const accountsQuery = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []);
  const accounts = accountsQuery ?? EMPTY;
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? EMPTY;
  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []) ?? EMPTY;
  const recurringRules = useLiveQuery(() => db.recurring.toArray(), []) ?? EMPTY;
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  async function deleteAccount(id: string) {
    const count = await db.transactions.where('accountId').equals(id).count();
    if (count > 0) {
      await alertDialog('ลบบัญชีนี้ไม่ได้', `บัญชีนี้ยังมี ${count} รายการ — ลบหรือย้ายรายการออกก่อน`);
      return;
    }
    const name = accountNameFor(accounts, id);
    if (!(await confirmDelete(`บัญชี "${name}"`))) return;
    await removeAccount(id);
  }

  async function deleteCategory(id: string) {
    const name = categoryFor(categories, id)?.name ?? '';
    if (!(await confirmDelete(`หมวดหมู่ "${name}"`, 'รายการเดิมในหมวดนี้จะแสดงเป็น "อื่น ๆ" · กู้คืนไม่ได้'))) return;
    await db.categories.delete(id);
    scheduleAutoSync();
  }

  async function deleteRecurring(id: string) {
    const rule = recurringRules.find((r) => r.id === id);
    const name = rule ? (rule.note || categoryFor(categories, rule.categoryId)?.name || 'รายการประจำ') : '';
    if (!(await confirmDelete(`รายการประจำ "${name}"`, rule ? `${formatCurrency(rule.amount)} ทุกวันที่ ${rule.dayOfMonth} · รายการที่สร้างไปแล้วจะยังอยู่` : undefined))) return;
    await db.recurring.delete(id);
    scheduleAutoSync();
  }

  if (!accountsQuery) {
    return <div className="page"><PageSkeleton variant="list" /></div>;
  }

  return (
    <div className="page">
      <h1 className="page-title">จัดการ</h1>
      <ThemePicker />
      <DailyLimitSetting />
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
          onDelete={async (id) => {
            const name = bookmarks.find((b) => b.id === id)?.name ?? '';
            if (await confirmDelete(`รายการด่วน "${name}"`)) await deleteBookmark(id);
          }}
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
