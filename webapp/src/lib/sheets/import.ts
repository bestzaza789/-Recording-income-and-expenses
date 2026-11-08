import { db, newId, type AccountType, type CategoryType, type TransactionType } from '../../db/db';
import { addTransaction } from '../../db/transactionManager';
import { requestAccessToken, isGoogleSyncConfigured } from '../googleAuth';
import { categoryFor, accountNameFor } from '../lookup';
import {
  ACCOUNTS_SHEET, CATEGORIES_SHEET, TRANSACTIONS_SHEET, BUDGETS_SHEET, BOOKMARKS_SHEET, RECURRING_SHEET,
  getStoredSpreadsheetId, readSheetValues,
} from './api';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'credit'];
const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense', 'transfer'];

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// Years past 2400 are Buddhist-era (th-TH), e.g. 2569 → 2026.
function toGregorianYear(year: number): number {
  return year > 2400 ? year - 543 : year;
}

// Parse a Date cell read with readSheetValues(raw = true). Dates Sheets
// recognised arrive as serial day numbers; anything typed that Sheets kept as
// text (Thai "8 พ.ย. 2569", "2026-11-08", "8/11/2569", "Nov 8, 2026") is
// parsed here. Returns local midnight-based dates, or null when unparseable.
function parseSheetDate(value: string): Date | null {
  const s = value.trim();
  if (!s) return null;

  if (/^\d+(\.\d+)?$/.test(s)) {
    // Sheets serial: days since 1899-12-30, fractional part = time of day.
    const serial = parseFloat(s);
    const days = Math.floor(serial);
    const ms = Math.round((serial - days) * 86_400_000);
    const d = new Date(1899, 11, 30 + days);
    d.setMilliseconds(ms);
    return d;
  }

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(toGregorianYear(+m[1]), +m[2] - 1, +m[3]);

  m = s.match(/^(\d{1,2})\s*(\S+?\.\S*?\.?)\s*(\d{4})$/);
  if (m) {
    const month = THAI_MONTHS.indexOf(m[2].endsWith('.') ? m[2] : `${m[2]}.`);
    if (month >= 0) return new Date(toGregorianYear(+m[3]), month, +m[1]);
  }

  // Slash dates follow the Thai day/month/year convention.
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(toGregorianYear(+m[3]), +m[2] - 1, +m[1]);

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function parseAmount(value: string | undefined): number {
  return parseFloat((value ?? '').replace(/[,\s฿]/g, ''));
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
  if (!isGoogleSyncConfigured()) throw new Error('ยังไม่ได้ตั้งค่าการซิงก์ Google');
  const spreadsheetId = getStoredSpreadsheetId();
  if (!spreadsheetId) throw new Error('ยังไม่ได้เชื่อมสเปรดชีต — กดซิงก์อย่างน้อยหนึ่งครั้งก่อน');

  const token = await requestAccessToken(interactive);

  const [accountRows, categoryRows, transactionRows, budgetRows, bookmarkRows, recurringRows] = await Promise.all([
    readSheetValues(token, spreadsheetId, ACCOUNTS_SHEET, true),
    readSheetValues(token, spreadsheetId, CATEGORIES_SHEET, true),
    readSheetValues(token, spreadsheetId, TRANSACTIONS_SHEET, true),
    readSheetValues(token, spreadsheetId, BUDGETS_SHEET, true),
    readSheetValues(token, spreadsheetId, BOOKMARKS_SHEET, true),
    readSheetValues(token, spreadsheetId, RECURRING_SHEET, true),
  ]);

  const accounts = await db.accounts.toArray();
  const categories = await db.categories.toArray();

  let accountsAdded = 0;
  for (const [name, type, initialBalanceStr] of accountRows.slice(1)) {
    if (!name) continue;
    if (accounts.some((a) => a.name.toLowerCase() === name.toLowerCase())) continue;
    const accountType = (ACCOUNT_TYPES as string[]).includes(type) ? (type as AccountType) : 'bank';
    const initialBalance = parseAmount(initialBalanceStr) || 0;
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
    const limit = parseAmount(limitStr);
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
    const amount = parseAmount(amountStr);
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
    const amount = parseAmount(amountStr);
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

  // Multiset of existing transactions, keyed by local day + fields, so a row
  // that is already in the app is skipped but a genuinely repeated purchase
  // (two identical rows on the same day) still imports the extra copy.
  const txKey = (date: Date, type: string, amount: number, acc: string, toAcc: string, cat: string, note: string) =>
    [dayKey(date), type, amount.toFixed(2), acc.trim().toLowerCase(), toAcc.trim().toLowerCase(), cat.trim().toLowerCase(), note.trim()].join('|');
  const existingCounts = new Map<string, number>();
  for (const t of await db.transactions.toArray()) {
    const key = txKey(
      t.date, t.transactionType, t.amount,
      accountNameFor(accounts, t.accountId), accountNameFor(accounts, t.toAccountId),
      categoryFor(categories, t.categoryId)?.name ?? '', t.note ?? ''
    );
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  let transactionsImported = 0;
  let transactionsSkipped = 0;
  for (const [dateStr, typeStr, amountStr, accName = '', toAccName = '', catName = '', note = ''] of transactionRows.slice(1)) {
    if (!dateStr || !typeStr || !amountStr) continue;
    const type = typeStr.trim().toLowerCase() as TransactionType;
    const amount = parseAmount(amountStr);
    const date = parseSheetDate(dateStr);
    if (!TRANSACTION_TYPES.includes(type) || !amount || amount <= 0 || !date) { transactionsSkipped++; continue; }

    const key = txKey(date, type, amount, accName, toAccName, catName, note);
    const remaining = existingCounts.get(key) ?? 0;
    if (remaining > 0) { existingCounts.set(key, remaining - 1); transactionsSkipped++; continue; }

    const findAccount = (name: string) => accounts.find((a) => a.name.trim().toLowerCase() === name.trim().toLowerCase());
    const account = findAccount(accName);
    if (!account) { transactionsSkipped++; continue; }
    const toAccount = toAccName.trim() ? findAccount(toAccName) : undefined;
    if (type === 'transfer' && !toAccount) { transactionsSkipped++; continue; }
    const category = catName.trim()
      ? categories.find((c) => c.name.trim().toLowerCase() === catName.trim().toLowerCase())
      : undefined;

    await addTransaction({
      amount,
      type,
      date,
      note: note.trim() || undefined,
      accountId: account.id,
      toAccountId: toAccount?.id,
      categoryId: category?.id,
    });
    transactionsImported++;
  }

  return { accountsAdded, categoriesAdded, budgetsAdded, bookmarksAdded, recurringAdded, transactionsImported, transactionsSkipped };
}
