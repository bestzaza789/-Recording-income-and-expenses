import { db, newId, type AccountType, type CategoryType, type TransactionType } from '../db/db';
import { addTransaction } from '../db/transactionManager';
import { requestAccessToken, isGoogleSyncConfigured } from './googleAuth';
import { formatDate } from './format';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'credit'];

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID_KEY = 'googleSheetsSyncSpreadsheetId';

const TRANSACTIONS_SHEET = 'Transactions';
const ACCOUNTS_SHEET = 'Accounts';
const CATEGORIES_SHEET = 'Categories';
const BUDGETS_SHEET = 'Budgets';
const BOOKMARKS_SHEET = 'Quick Add';
const RECURRING_SHEET = 'Recurring';
const ALL_SHEETS = [TRANSACTIONS_SHEET, ACCOUNTS_SHEET, CATEGORIES_SHEET, BUDGETS_SHEET, BOOKMARKS_SHEET, RECURRING_SHEET];

export function getStoredSpreadsheetId(): string | null {
  return localStorage.getItem(SPREADSHEET_ID_KEY);
}

export function getSpreadsheetUrl(): string | null {
  const id = getStoredSpreadsheetId();
  return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : null;
}

function clearStoredSpreadsheetId() {
  localStorage.removeItem(SPREADSHEET_ID_KEY);
}

async function apiFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

async function createSpreadsheet(token: string): Promise<string> {
  const res = await apiFetch(SHEETS_API, token, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: 'Personal Finance Backup' },
      sheets: ALL_SHEETS.map((title) => ({ properties: { title } })),
    }),
  });
  if (!res.ok) throw new Error(`Failed to create spreadsheet: ${res.status}`);
  const data = await res.json();
  localStorage.setItem(SPREADSHEET_ID_KEY, data.spreadsheetId);
  return data.spreadsheetId;
}

async function ensureSpreadsheet(token: string): Promise<string> {
  const existing = getStoredSpreadsheetId();
  if (!existing) return createSpreadsheet(token);

  const res = await apiFetch(`${SHEETS_API}/${existing}`, token);
  if (res.status === 404) {
    clearStoredSpreadsheetId();
    return createSpreadsheet(token);
  }
  if (!res.ok) throw new Error(`Failed to verify spreadsheet: ${res.status}`);
  return existing;
}

async function ensureSheetTabs(token: string, spreadsheetId: string): Promise<void> {
  const res = await apiFetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, token);
  if (!res.ok) throw new Error(`Failed to read spreadsheet tabs: ${res.status}`);
  const data = await res.json();
  const existingTitles = new Set((data.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title));

  const missing = ALL_SHEETS.filter((title) => !existingTitles.has(title));
  if (missing.length === 0) return;

  const batchRes = await apiFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    }),
  });
  if (!batchRes.ok) {
    const body = await batchRes.text();
    throw new Error(`Failed to create tabs (${missing.join(', ')}): ${batchRes.status} ${body}`);
  }
}

async function writeSheet(token: string, spreadsheetId: string, sheetTitle: string, rows: string[][]): Promise<void> {
  await apiFetch(`${SHEETS_API}/${spreadsheetId}/values/${sheetTitle}:clear`, token, { method: 'POST' });
  const res = await apiFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${sheetTitle}!A1?valueInputOption=USER_ENTERED`,
    token,
    { method: 'PUT', body: JSON.stringify({ values: rows }) }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to write ${sheetTitle}: ${res.status} ${body}`);
  }
}

async function buildTransactionRows(): Promise<string[][]> {
  const [accounts, categories, transactions] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.orderBy('date').reverse().toArray(),
  ]);

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? '';
  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name ?? '';

  const header = ['Date', 'Type', 'Amount', 'Account', 'To Account', 'Category', 'Note'];
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.transactionType,
    t.amount.toFixed(2),
    accountName(t.accountId),
    accountName(t.toAccountId),
    categoryName(t.categoryId),
    t.note ?? '',
  ]);

  return [header, ...rows];
}

async function buildAccountRows(): Promise<string[][]> {
  const accounts = await db.accounts.toArray();
  const header = ['Name', 'Type', 'Initial Balance', 'Current Balance'];
  const rows = accounts.map((a) => [a.name, a.accountType, a.initialBalance.toFixed(2), a.currentBalance.toFixed(2)]);
  return [header, ...rows];
}

async function buildCategoryRows(): Promise<string[][]> {
  const categories = await db.categories.toArray();
  const header = ['Name', 'Type', 'Icon', 'Color'];
  const rows = categories.map((c) => [c.name, c.type, c.iconName, c.hexColor]);
  return [header, ...rows];
}

async function buildBudgetRows(): Promise<string[][]> {
  const [budgets, categories] = await Promise.all([db.budgets.toArray(), db.categories.toArray()]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '';
  const header = ['Category', 'Monthly Limit'];
  const rows = budgets.map((b) => [categoryName(b.categoryId), b.monthlyLimit.toFixed(2)]);
  return [header, ...rows];
}

async function buildBookmarkRows(): Promise<string[][]> {
  const [bookmarks, accounts, categories] = await Promise.all([
    db.bookmarks.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
  ]);
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '';
  const header = ['Label', 'Type', 'Amount', 'Account', 'Category', 'Note'];
  const rows = bookmarks.map((b) => [b.name, b.type, b.amount.toFixed(2), accountName(b.accountId), categoryName(b.categoryId), b.note ?? '']);
  return [header, ...rows];
}

async function buildRecurringRows(): Promise<string[][]> {
  const [rules, accounts, categories] = await Promise.all([
    db.recurring.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
  ]);
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '';
  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name ?? '';
  const header = ['Note', 'Type', 'Amount', 'Day of Month', 'Account', 'Category'];
  const rows = rules.map((r) => [r.note ?? '', r.transactionType, r.amount.toFixed(2), String(r.dayOfMonth), accountName(r.accountId), categoryName(r.categoryId)]);
  return [header, ...rows];
}

export async function syncToGoogleSheets(interactive: boolean): Promise<{ url: string; rowCount: number }> {
  if (!isGoogleSyncConfigured()) throw new Error('Google sync is not configured');

  const token = await requestAccessToken(interactive);
  const spreadsheetId = await ensureSpreadsheet(token);
  await ensureSheetTabs(token, spreadsheetId);

  const [transactionRows, accountRows, categoryRows, budgetRows, bookmarkRows, recurringRows] = await Promise.all([
    buildTransactionRows(),
    buildAccountRows(),
    buildCategoryRows(),
    buildBudgetRows(),
    buildBookmarkRows(),
    buildRecurringRows(),
  ]);

  await writeSheet(token, spreadsheetId, TRANSACTIONS_SHEET, transactionRows);
  await writeSheet(token, spreadsheetId, ACCOUNTS_SHEET, accountRows);
  await writeSheet(token, spreadsheetId, CATEGORIES_SHEET, categoryRows);
  await writeSheet(token, spreadsheetId, BUDGETS_SHEET, budgetRows);
  await writeSheet(token, spreadsheetId, BOOKMARKS_SHEET, bookmarkRows);
  await writeSheet(token, spreadsheetId, RECURRING_SHEET, recurringRows);

  return {
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rowCount: transactionRows.length - 1,
  };
}

async function readSheetValues(token: string, spreadsheetId: string, sheetTitle: string): Promise<string[][]> {
  const res = await apiFetch(`${SHEETS_API}/${spreadsheetId}/values/${sheetTitle}`, token);
  if (!res.ok) {
    if (res.status === 400) return [];
    throw new Error(`Failed to read ${sheetTitle}: ${res.status}`);
  }
  const data = await res.json();
  return (data.values ?? []) as string[][];
}

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
  if (!isGoogleSyncConfigured()) throw new Error('Google sync is not configured');
  const spreadsheetId = getStoredSpreadsheetId();
  if (!spreadsheetId) throw new Error('No spreadsheet connected yet — sync at least once first');

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
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? '';
  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name ?? '';
  const existingKeys = new Set(
    existingTransactions.map((t) =>
      [formatDate(t.date), t.transactionType, t.amount.toFixed(2), accountName(t.accountId), accountName(t.toAccountId), categoryName(t.categoryId), t.note ?? ''].join('|')
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
