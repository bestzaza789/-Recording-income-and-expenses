import { db, newId, type Account, type Bookmark, type CategoryType, type LoanDirection, type Transaction, type TransactionType } from './db';
import { EMOJI_PREFIX } from '../lib/iconData';
import { scheduleAutoSync } from '../lib/autoSync';
import { nextAccountSortOrder } from '../lib/lookup';

async function applyDelta(accountId: string, delta: number) {
  const account = await db.accounts.get(accountId);
  if (!account) return;
  await db.accounts.update(accountId, { currentBalance: account.currentBalance + delta });
}

async function applyImpact(type: TransactionType, amount: number, accountId: string, toAccountId?: string) {
  if (type === 'transfer' && toAccountId) {
    await applyDelta(accountId, -amount);
    await applyDelta(toAccountId, amount);
  } else if (type === 'expense') {
    await applyDelta(accountId, -amount);
  } else if (type === 'income') {
    await applyDelta(accountId, amount);
  }
}

async function reverseImpact(transaction: Transaction) {
  if (transaction.transactionType === 'transfer' && transaction.toAccountId) {
    await applyDelta(transaction.accountId, transaction.amount);
    await applyDelta(transaction.toAccountId, -transaction.amount);
  } else if (transaction.transactionType === 'expense') {
    await applyDelta(transaction.accountId, transaction.amount);
  } else if (transaction.transactionType === 'income') {
    await applyDelta(transaction.accountId, -transaction.amount);
  }
}

export interface AddTransactionInput {
  amount: number;
  type: TransactionType;
  date: Date;
  note?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
}

export async function addTransaction(input: AddTransactionInput): Promise<string> {
  const id = newId();
  const transaction: Transaction = {
    id,
    amount: input.amount,
    transactionType: input.type,
    date: input.date,
    note: input.note,
    accountId: input.accountId,
    toAccountId: input.type === 'transfer' ? input.toAccountId : undefined,
    categoryId: input.categoryId,
  };

  await db.transaction('rw', db.transactions, db.accounts, async () => {
    await db.transactions.add(transaction);
    await applyImpact(input.type, input.amount, input.accountId, transaction.toAccountId);
  });

  scheduleAutoSync();
  return id;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const transaction = await db.transactions.get(transactionId);
    if (!transaction) return;
    await reverseImpact(transaction);
    await db.transactions.delete(transactionId);
  });

  scheduleAutoSync();
}

export interface UpdateTransactionInput {
  amount: number;
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  date: Date;
  note?: string;
}

// A Google Sheets import once read the sheet's Buddhist-era dates (year 2569)
// as Gregorian, re-adding every transaction ~543 years in the future and
// doubling account balances. No real transaction is dated past 2400, so
// delete those rows and reverse their balance impact. Idempotent; returns
// how many rows were removed.
export async function removeBuddhistEraImports(): Promise<number> {
  const cutoff = new Date(2400, 0, 1);
  let removed = 0;
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const bogus = await db.transactions.where('date').aboveOrEqual(cutoff).toArray();
    for (const t of bogus) {
      await reverseImpact(t);
      await db.transactions.delete(t.id);
    }
    removed = bogus.length;
  });
  return removed;
}

export async function updateTransaction(transactionId: string, input: UpdateTransactionInput): Promise<void> {
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const existing = await db.transactions.get(transactionId);
    if (!existing) return;

    await reverseImpact(existing);

    const toAccountId = input.type === 'transfer' ? input.toAccountId : undefined;
    await db.transactions.update(transactionId, {
      amount: input.amount,
      transactionType: input.type,
      accountId: input.accountId,
      toAccountId,
      categoryId: input.categoryId,
      date: input.date,
      note: input.note,
    });

    await applyImpact(input.type, input.amount, input.accountId, toAccountId);
  });

  scheduleAutoSync();
}

export async function addAccount(name: string, accountType: Account['accountType'], initialBalance: number): Promise<string> {
  const id = newId();
  const sortOrder = nextAccountSortOrder(await db.accounts.toArray());
  await db.accounts.add({ id, name, accountType, initialBalance, currentBalance: initialBalance, sortOrder });
  scheduleAutoSync();
  return id;
}

/** Callers must make sure the account has no transactions first. */
export async function deleteAccount(id: string): Promise<void> {
  await db.accounts.delete(id);
  scheduleAutoSync();
}

/** Persist a new display order: `orderedIds[0]` is shown first. */
export async function reorderAccounts(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.accounts, async () => {
    await Promise.all(orderedIds.map((id, i) => db.accounts.update(id, { sortOrder: i })));
  });
  scheduleAutoSync();
}

export async function updateAccount(id: string, name: string, accountType: Account['accountType'], initialBalance: number): Promise<void> {
  const account = await db.accounts.get(id);
  if (!account) return;
  const delta = initialBalance - account.initialBalance;
  await db.accounts.update(id, {
    name,
    accountType,
    initialBalance,
    currentBalance: account.currentBalance + delta,
  });
  scheduleAutoSync();
}

export interface BookmarkInput {
  name: string;
  type: CategoryType;
  amount: number;
  accountId: string;
  categoryId: string;
  note?: string;
}

export async function addBookmark(input: BookmarkInput): Promise<string> {
  const id = newId();
  await db.bookmarks.add({ id, ...input });
  scheduleAutoSync();
  return id;
}

export async function updateBookmark(id: string, input: BookmarkInput): Promise<void> {
  await db.bookmarks.update(id, { ...input });
  scheduleAutoSync();
}

export async function deleteBookmark(id: string): Promise<void> {
  await db.bookmarks.delete(id);
  scheduleAutoSync();
}

export async function addFromBookmark(bookmark: Bookmark): Promise<string> {
  return addTransaction({
    amount: bookmark.amount,
    type: bookmark.type,
    date: new Date(),
    note: bookmark.note || bookmark.name,
    accountId: bookmark.accountId,
    categoryId: bookmark.categoryId,
  });
}

// ---------- Loans ----------

export async function addLoan(input: { person: string; amount: number; direction: LoanDirection; note?: string }): Promise<string> {
  const id = newId();
  await db.loans.add({ id, ...input, createdAt: new Date(), settled: false });
  return id;
}

export async function deleteLoan(id: string): Promise<void> {
  await db.loans.delete(id);
}

const LOAN_CATEGORY: Record<LoanDirection, { name: string; type: CategoryType }> = {
  lent: { name: 'รับเงินยืมคืน', type: 'income' },
  borrowed: { name: 'คืนเงินยืม', type: 'expense' },
};

async function loanCategoryId(direction: LoanDirection): Promise<string> {
  const { name, type } = LOAN_CATEGORY[direction];
  const existing = (await db.categories.toArray()).find((c) => c.name === name && c.type === type);
  if (existing) return existing.id;
  const id = newId();
  await db.categories.add({ id, name, type, iconName: EMOJI_PREFIX + '🤝', hexColor: '5856D6' });
  return id;
}

/**
 * Marks a loan as paid back and records the money moving: someone repaying us is income
 * into `accountId`, us repaying someone is an expense from it.
 */
export async function settleLoan(loanId: string, accountId: string): Promise<void> {
  const loan = await db.loans.get(loanId);
  if (!loan || loan.settled) return;
  const categoryId = await loanCategoryId(loan.direction);
  await db.transaction('rw', db.loans, db.transactions, db.accounts, async () => {
    await addTransaction({
      amount: loan.amount,
      type: loan.direction === 'lent' ? 'income' : 'expense',
      date: new Date(),
      note: loan.direction === 'lent' ? `${loan.person} คืนเงิน` : `คืนเงิน ${loan.person}`,
      accountId,
      categoryId,
    });
    await db.loans.update(loanId, { settled: true, settledAt: new Date() });
  });
}
