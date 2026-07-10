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
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  iconName: string;
  hexColor: string;
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

export const db = new Dexie('PersonalFinanceDB') as Dexie & {
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
};

db.version(1).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
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
