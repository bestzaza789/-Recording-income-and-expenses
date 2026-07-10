import { db } from '../db/db';
import { requestAccessToken, isGoogleSyncConfigured } from './googleAuth';
import { formatDate } from './format';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID_KEY = 'googleSheetsSyncSpreadsheetId';

const TRANSACTIONS_SHEET = 'Transactions';
const ACCOUNTS_SHEET = 'Accounts';
const CATEGORIES_SHEET = 'Categories';
const ALL_SHEETS = [TRANSACTIONS_SHEET, ACCOUNTS_SHEET, CATEGORIES_SHEET];

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

export async function syncToGoogleSheets(interactive: boolean): Promise<{ url: string; rowCount: number }> {
  if (!isGoogleSyncConfigured()) throw new Error('Google sync is not configured');

  const token = await requestAccessToken(interactive);
  const spreadsheetId = await ensureSpreadsheet(token);
  await ensureSheetTabs(token, spreadsheetId);

  const [transactionRows, accountRows, categoryRows] = await Promise.all([
    buildTransactionRows(),
    buildAccountRows(),
    buildCategoryRows(),
  ]);

  await writeSheet(token, spreadsheetId, TRANSACTIONS_SHEET, transactionRows);
  await writeSheet(token, spreadsheetId, ACCOUNTS_SHEET, accountRows);
  await writeSheet(token, spreadsheetId, CATEGORIES_SHEET, categoryRows);

  return {
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rowCount: transactionRows.length - 1,
  };
}
