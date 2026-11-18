import Dexie, { type EntityTable } from 'dexie';

export type AccountType = 'cash' | 'bank' | 'credit';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  initialBalance: number;
  currentBalance: number;
  sortOrder?: number;  // display order (ascending); unset sorts last. Not indexed — sort in memory via sortAccounts().
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  iconName: string;
  hexColor: string;
}

export interface Budget {
  id: string;
  categoryId: string;  // one budget per category — enforced unique below
  monthlyLimit: number;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;  // tracked on its own; does not touch any account balance
  createdAt: Date;
}

export type LoanDirection = 'lent' | 'borrowed';

/** Money lent to someone ('lent': they owe us) or borrowed from someone ('borrowed': we owe them). */
export interface Loan {
  id: string;
  person: string;
  amount: number;
  direction: LoanDirection;
  note?: string;
  createdAt: Date;
  settled: boolean;
  settledAt?: Date;
}

/** A collected achievement sticker. `id` is the badge key from lib/badges.ts. */
export interface EarnedBadge {
  id: string;
  earnedAt: Date;
}

export interface RecurringRule {
  id: string;
  amount: number;
  transactionType: 'income' | 'expense';
  dayOfMonth: number;      // 1-31; clamped to the month's last day at generation time
  accountId: string;
  categoryId?: string;
  note?: string;
  lastGenerated: string;   // 'YYYY-MM' month key of the last month generated
}

export interface Transaction {
  id: string;
  amount: number;
  transactionType: TransactionType;
  date: Date;
  note?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
}

export interface Bookmark {
  id: string;
  name: string;
  type: CategoryType;
  amount: number;
  accountId: string;
  categoryId: string;
  note?: string;
}

export const db = new Dexie('PersonalFinanceDB') as Dexie & {
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  budgets: EntityTable<Budget, 'id'>;
  recurring: EntityTable<RecurringRule, 'id'>;
  bookmarks: EntityTable<Bookmark, 'id'>;
  goals: EntityTable<Goal, 'id'>;
  loans: EntityTable<Loan, 'id'>;
  badges: EntityTable<EarnedBadge, 'id'>;
};

db.version(1).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
});

db.version(2).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
  budgets: 'id, &categoryId',
});

db.version(3).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
  budgets: 'id, &categoryId',
  recurring: 'id',
});

db.version(4).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
  budgets: 'id, &categoryId',
  recurring: 'id',
  bookmarks: 'id, name, type',
});

db.version(5).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
  budgets: 'id, &categoryId',
  recurring: 'id',
  bookmarks: 'id, name, type',
  goals: 'id',
});

db.version(6).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
  budgets: 'id, &categoryId',
  recurring: 'id',
  bookmarks: 'id, name, type',
  goals: 'id',
  loans: 'id',
  badges: 'id',
});

export function newId(): string {
  return crypto.randomUUID();
}

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', type: 'expense', iconName: 'utensils', hexColor: 'FF9500' },
  { name: 'Transport', type: 'expense', iconName: 'car', hexColor: '007AFF' },
  { name: 'Shopping', type: 'expense', iconName: 'shopping-cart', hexColor: 'FF2D55' },
  { name: 'Bills', type: 'expense', iconName: 'zap', hexColor: 'FFCC00' },
  { name: 'Health', type: 'expense', iconName: 'heart', hexColor: 'FF3B30' },
  { name: 'Salary', type: 'income', iconName: 'banknote', hexColor: '34C759' },
  { name: 'Other Income', type: 'income', iconName: 'gift', hexColor: '5856D6' },
];

export async function seedDefaultsIfEmpty() {
  const accountCount = await db.accounts.count();
  const categoryCount = await db.categories.count();

  if (accountCount === 0) {
    await db.accounts.add({
      id: newId(),
      name: 'Cash',
      accountType: 'cash',
      initialBalance: 0,
      currentBalance: 0,
    });
  }

  if (categoryCount === 0) {
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, id: newId() }))
    );
  }
}
