export const TRANSACTIONS_SHEET = 'Transactions';
export const ACCOUNTS_SHEET = 'Accounts';
export const CATEGORIES_SHEET = 'Categories';
export const BUDGETS_SHEET = 'Budgets';
export const BOOKMARKS_SHEET = 'Quick Add';
export const RECURRING_SHEET = 'Recurring';
export const ALL_SHEETS = [TRANSACTIONS_SHEET, ACCOUNTS_SHEET, CATEGORIES_SHEET, BUDGETS_SHEET, BOOKMARKS_SHEET, RECURRING_SHEET];

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID_KEY = 'googleSheetsSyncSpreadsheetId';

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

export async function ensureSpreadsheet(token: string): Promise<string> {
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

export async function ensureSheetTabs(token: string, spreadsheetId: string): Promise<void> {
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

export async function writeSheet(token: string, spreadsheetId: string, sheetTitle: string, rows: string[][]): Promise<void> {
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

export async function readSheetValues(token: string, spreadsheetId: string, sheetTitle: string): Promise<string[][]> {
  const res = await apiFetch(`${SHEETS_API}/${spreadsheetId}/values/${sheetTitle}`, token);
  if (!res.ok) {
    if (res.status === 400) return [];
    throw new Error(`Failed to read ${sheetTitle}: ${res.status}`);
  }
  const data = await res.json();
  return (data.values ?? []) as string[][];
}

export async function writeRange(token: string, spreadsheetId: string, range: string, values: string[][]): Promise<void> {
  const res = await apiFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    token,
    { method: 'PUT', body: JSON.stringify({ values }) }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to write ${range}: ${res.status} ${body}`);
  }
}
