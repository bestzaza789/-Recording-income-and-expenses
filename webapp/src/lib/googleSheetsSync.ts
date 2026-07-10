import { db } from '../db/db';
import { requestAccessToken, isGoogleSyncConfigured } from './googleAuth';
import { formatDate } from './format';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID_KEY = 'googleSheetsSyncSpreadsheetId';
const SHEET_TITLE = 'Transactions';

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
      sheets: [{ properties: { title: SHEET_TITLE } }],
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

async function buildRows(): Promise<string[][]> {
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

export async function syncToGoogleSheets(interactive: boolean): Promise<{ url: string; rowCount: number }> {
  if (!isGoogleSyncConfigured()) throw new Error('Google sync is not configured');

  const token = await requestAccessToken(interactive);
  const spreadsheetId = await ensureSpreadsheet(token);
  const rows = await buildRows();

  await apiFetch(`${SHEETS_API}/${spreadsheetId}/values/${SHEET_TITLE}:clear`, token, { method: 'POST' });

  const range = `${SHEET_TITLE}!A1`;
  const res = await apiFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    token,
    { method: 'PUT', body: JSON.stringify({ values: rows }) }
  );
  if (!res.ok) throw new Error(`Failed to write spreadsheet: ${res.status}`);

  return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, rowCount: rows.length - 1 };
}
