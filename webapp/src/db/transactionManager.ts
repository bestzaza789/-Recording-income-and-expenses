import { db, newId, type Account, type Transaction, type TransactionType } from './db';

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

  return id;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    const transaction = await db.transactions.get(transactionId);
    if (!transaction) return;
    await reverseImpact(transaction);
    await db.transactions.delete(transactionId);
  });
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
}

export async function addAccount(name: string, accountType: Account['accountType'], initialBalance: number): Promise<string> {
  const id = newId();
  await db.accounts.add({ id, name, accountType, initialBalance, currentBalance: initialBalance });
  return id;
}
