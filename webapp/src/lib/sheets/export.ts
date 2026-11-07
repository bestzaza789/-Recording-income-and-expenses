import { db } from '../../db/db';
import { formatDate } from '../format';
import { categoryFor, accountNameFor } from '../lookup';
import { isGoogleSyncConfigured, requestAccessToken } from '../googleAuth';
import {
  TRANSACTIONS_SHEET, ACCOUNTS_SHEET, CATEGORIES_SHEET, BUDGETS_SHEET, BOOKMARKS_SHEET, RECURRING_SHEET,
  ensureSpreadsheet, ensureSheetTabs, writeSheet,
} from './api';

async function buildTransactionRows(): Promise<string[][]> {
  const [accounts, categories, transactions] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.orderBy('date').reverse().toArray(),
  ]);

  const header = ['Date', 'Type', 'Amount', 'Account', 'To Account', 'Category', 'Note'];
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.transactionType,
    t.amount.toFixed(2),
    accountNameFor(accounts, t.accountId),
    accountNameFor(accounts, t.toAccountId),
    categoryFor(categories, t.categoryId)?.name ?? '',
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
  const header = ['Category', 'Monthly Limit'];
  const rows = budgets.map((b) => [categoryFor(categories, b.categoryId)?.name ?? '', b.monthlyLimit.toFixed(2)]);
  return [header, ...rows];
}

async function buildBookmarkRows(): Promise<string[][]> {
  const [bookmarks, accounts, categories] = await Promise.all([
    db.bookmarks.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
  ]);
  const header = ['Label', 'Type', 'Amount', 'Account', 'Category', 'Note'];
  const rows = bookmarks.map((b) => [
    b.name, b.type, b.amount.toFixed(2),
    accountNameFor(accounts, b.accountId),
    categoryFor(categories, b.categoryId)?.name ?? '',
    b.note ?? '',
  ]);
  return [header, ...rows];
}

async function buildRecurringRows(): Promise<string[][]> {
  const [rules, accounts, categories] = await Promise.all([
    db.recurring.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
  ]);
  const header = ['Note', 'Type', 'Amount', 'Day of Month', 'Account', 'Category'];
  const rows = rules.map((r) => [
    r.note ?? '', r.transactionType, r.amount.toFixed(2), String(r.dayOfMonth),
    accountNameFor(accounts, r.accountId),
    categoryFor(categories, r.categoryId)?.name ?? '',
  ]);
  return [header, ...rows];
}

export async function syncToGoogleSheets(interactive: boolean): Promise<{ url: string; rowCount: number }> {
  if (!isGoogleSyncConfigured()) throw new Error('ยังไม่ได้ตั้งค่าการซิงก์ Google');

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
