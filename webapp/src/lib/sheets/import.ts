import { db, newId, type AccountType, type CategoryType, type TransactionType } from '../../db/db';
import { addTransaction } from '../../db/transactionManager';
import { requestAccessToken, isGoogleSyncConfigured } from '../googleAuth';
import { formatSheetDate } from '../format';
import { categoryFor, accountNameFor } from '../lookup';
import {
  ACCOUNTS_SHEET, CATEGORIES_SHEET, TRANSACTIONS_SHEET, BUDGETS_SHEET, BOOKMARKS_SHEET, RECURRING_SHEET,
  getStoredSpreadsheetId, readSheetValues,
} from './api';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'credit'];

export interface ImportResult {
  accountsAdded: number;
  categoriesAdded: number;
  budgetsAdded: number;
  bookmarksAdded: number;
  recurringAdded: number;
  transactionsImported: number;
  transactionsSkipped: number;
}

export async function importFromGoogleSheets(interactive: boolean): Promise<ImportResult> {
  if (!isGoogleSyncConfigured()) throw new Error('ยังไม่ได้ตั้งค่าการซิงก์ Google');
  const spreadsheetId = getStoredSpreadsheetId();
  if (!spreadsheetId) throw new Error('ยังไม่ได้เชื่อมสเปรดชีต — กดซิงก์อย่างน้อยหนึ่งครั้งก่อน');

  const token = await requestAccessToken(interactive);

  const [accountRows, categoryRows, transactionRows, budgetRows, bookmarkRows, recurringRows] = await Promise.all([
    readSheetValues(token, spreadsheetId, ACCOUNTS_SHEET),
    readSheetValues(token, spreadsheetId, CATEGORIES_SHEET),
    readSheetValues(token, spreadsheetId, TRANSACTIONS_SHEET),
    readSheetValues(token, spreadsheetId, BUDGETS_SHEET),
    readSheetValues(token, spreadsheetId, BOOKMARKS_SHEET),
    readSheetValues(token, spreadsheetId, RECURRING_SHEET),
  ]);

  const accounts = await db.accounts.toArray();
  const categories = await db.categories.toArray();

  let accountsAdded = 0;
  for (const [name, type, initialBalanceStr] of accountRows.slice(1)) {
    if (!name) continue;
    if (accounts.some((a) => a.name.toLowerCase() === name.toLowerCase())) continue;
    const accountType = (ACCOUNT_TYPES as string[]).includes(type) ? (type as AccountType) : 'bank';
    const initialBalance = parseFloat(initialBalanceStr) || 0;
    const account = { id: newId(), name, accountType, initialBalance, currentBalance: initialBalance };
    await db.accounts.add(account);
    accounts.push(account);
    accountsAdded++;
  }

  let categoriesAdded = 0;
  for (const [name, type, icon, color] of categoryRows.slice(1)) {
    if (!name) continue;
    const categoryType: CategoryType = type === 'income' ? 'income' : 'expense';
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.type === categoryType)) continue;
    const category = { id: newId(), name, type: categoryType, iconName: icon || 'banknote', hexColor: color || '808080' };
    await db.categories.add(category);
    categories.push(category);
    categoriesAdded++;
  }

  const existingBudgets = await db.budgets.toArray();
  let budgetsAdded = 0;
  for (const [catName, limitStr] of budgetRows.slice(1)) {
    if (!catName) continue;
    const limit = parseFloat(limitStr);
    if (!limit || limit <= 0) continue;
    const category = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase() && c.type === 'expense');
    if (!category) continue;
    if (existingBudgets.some((b) => b.categoryId === category.id)) continue;
    const budget = { id: newId(), categoryId: category.id, monthlyLimit: limit };
    await db.budgets.add(budget);
    existingBudgets.push(budget);
    budgetsAdded++;
  }

  const existingBookmarks = await db.bookmarks.toArray();
  let bookmarksAdded = 0;
  for (const [label, type, amountStr, accName, catName, note] of bookmarkRows.slice(1)) {
    if (!label) continue;
    if (existingBookmarks.some((b) => b.name.toLowerCase() === label.toLowerCase())) continue;
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) continue;
    const account = accounts.find((a) => a.name.toLowerCase() === (accName ?? '').toLowerCase());
    const category = categories.find((c) => c.name.toLowerCase() === (catName ?? '').toLowerCase());
    if (!account || !category) continue;
    const bookmarkType: CategoryType = type === 'income' ? 'income' : 'expense';
    const bookmark = { id: newId(), name: label, type: bookmarkType, amount, accountId: account.id, categoryId: category.id, note: note || undefined };
    await db.bookmarks.add(bookmark);
    existingBookmarks.push(bookmark);
    bookmarksAdded++;
  }

  const existingRecurring = await db.recurring.toArray();
  let recurringAdded = 0;
  for (const [note, type, amountStr, dayStr, accName, catName] of recurringRows.slice(1)) {
    const amount = parseFloat(amountStr);
    const dayOfMonth = parseInt(dayStr, 10);
    if (!amount || amount <= 0 || !dayOfMonth) continue;
    const account = accounts.find((a) => a.name.toLowerCase() === (accName ?? '').toLowerCase());
    if (!account) continue;
    const category = catName ? categories.find((c) => c.name.toLowerCase() === catName.toLowerCase()) : undefined;
    const recurringType = type === 'income' ? 'income' : 'expense';
    const isDuplicate = existingRecurring.some(
      (r) => r.amount === amount && r.dayOfMonth === dayOfMonth && r.accountId === account.id && (r.note ?? '') === (note ?? '')
    );
    if (isDuplicate) continue;
    const rule = {
      id: newId(),
      amount,
      transactionType: recurringType as 'income' | 'expense',
      dayOfMonth,
      accountId: account.id,
      categoryId: category?.id,
      note: note || undefined,
      lastGenerated: '',
    };
    await db.recurring.add(rule);
    existingRecurring.push(rule);
    recurringAdded++;
  }

  const existingTransactions = await db.transactions.toArray();
  const existingKeys = new Set(
    existingTransactions.map((t) =>
      [formatSheetDate(t.date), t.transactionType, t.amount.toFixed(2), accountNameFor(accounts, t.accountId), accountNameFor(accounts, t.toAccountId), categoryFor(categories, t.categoryId)?.name ?? '', t.note ?? ''].join('|')
    )
  );

  let transactionsImported = 0;
  let transactionsSkipped = 0;
  for (const [dateStr, type, amountStr, accName, toAccName, catName, note] of transactionRows.slice(1)) {
    if (!dateStr || !type || !amountStr) continue;
    const amount = parseFloat(amountStr);
    if (!amount) { transactionsSkipped++; continue; }

    const key = [dateStr, type, amount.toFixed(2), accName ?? '', toAccName ?? '', catName ?? '', note ?? ''].join('|');
    if (existingKeys.has(key)) { transactionsSkipped++; continue; }

    const account = accounts.find((a) => a.name.toLowerCase() === (accName ?? '').toLowerCase());
    if (!account) { transactionsSkipped++; continue; }
    const toAccount = toAccName ? accounts.find((a) => a.name.toLowerCase() === toAccName.toLowerCase()) : undefined;
    const category = catName ? categories.find((c) => c.name.toLowerCase() === catName.toLowerCase()) : undefined;

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) { transactionsSkipped++; continue; }

    await addTransaction({
      amount,
      type: type as TransactionType,
      date,
      note: note || undefined,
      accountId: account.id,
      toAccountId: toAccount?.id,
      categoryId: category?.id,
    });
    existingKeys.add(key);
    transactionsImported++;
  }

  return { accountsAdded, categoriesAdded, budgetsAdded, bookmarksAdded, recurringAdded, transactionsImported, transactionsSkipped };
}
