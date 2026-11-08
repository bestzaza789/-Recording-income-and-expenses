// "Slip inbox": an iOS Shortcut OCRs a bank slip with Live Text and POSTs the
// text to a Google Apps Script bound to the user's backup spreadsheet, which
// appends a row to the `Inbox` tab. The app reads pending rows here and marks
// them saved/skipped once the user has confirmed them.
import { isGoogleSyncConfigured, requestAccessToken } from '../googleAuth';
import { isAutoSyncEnabled } from '../autoSync';
import { getStoredSpreadsheetId, readSheetValues, writeRange } from './api';

export const INBOX_SHEET = 'Inbox';
const INBOX_ENABLED_KEY = 'slipInboxEnabled';

export interface InboxSlip {
  row: number; // 1-based sheet row, used to write the status back
  id: string;
  receivedAt: Date;
  text: string;
}

export function isSlipInboxEnabled(): boolean {
  return localStorage.getItem(INBOX_ENABLED_KEY) === 'true';
}

export function setSlipInboxEnabled(enabled: boolean) {
  localStorage.setItem(INBOX_ENABLED_KEY, String(enabled));
}

// Usable only once Google Sheets sync is connected and the user turned it on.
export function canUseSlipInbox(): boolean {
  return isSlipInboxEnabled() && isGoogleSyncConfigured() && isAutoSyncEnabled() && !!getStoredSpreadsheetId();
}

export async function fetchPendingSlips(): Promise<InboxSlip[]> {
  const spreadsheetId = getStoredSpreadsheetId();
  if (!spreadsheetId) return [];
  const token = await requestAccessToken(false);
  const rows = await readSheetValues(token, spreadsheetId, INBOX_SHEET);

  const pending: InboxSlip[] = [];
  rows.slice(1).forEach(([id, receivedAt, text, status], i) => {
    if (!id || !text || status) return;
    const date = new Date(receivedAt);
    pending.push({
      row: i + 2,
      id,
      receivedAt: Number.isNaN(date.getTime()) ? new Date() : date,
      text,
    });
  });
  return pending.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
}

export async function markSlip(slip: InboxSlip, status: 'saved' | 'skipped'): Promise<void> {
  const spreadsheetId = getStoredSpreadsheetId();
  if (!spreadsheetId) return;
  const token = await requestAccessToken(false);
  await writeRange(token, spreadsheetId, `${INBOX_SHEET}!D${slip.row}`, [[status]]);
}

// Pasted by the user into Extensions → Apps Script of their backup spreadsheet
// and deployed as a web app. The iOS Shortcut calls it with GET
// `.../exec?text=<url-encoded slip text>` — POSTs from Shortcuts were rejected
// by Google before reaching the script. doPost is kept for other clients.
export const APPS_SCRIPT_CODE = `const SHEET_NAME = 'Inbox';

function doGet(e) {
  const text = String((e.parameter && e.parameter.text) || '').trim();
  // Opening the URL in a browser with no text just confirms the script is live
  if (!text) return reply({ ok: true, ready: true });
  return addSlip(text);
}

function doPost(e) {
  const body = JSON.parse((e.postData && e.postData.contents) || '{}');
  return addSlip(String(body.text || '').trim());
}

function addSlip(text) {
  if (!text) return reply({ ok: false, error: 'empty text' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 4).setValues([['id', 'receivedAt', 'text', 'status']]);
  }

  // Skip a slip that was already sent (e.g. the bank app was closed twice)
  const last = sheet.getLastRow();
  if (last > 1) {
    const texts = sheet.getRange(2, 3, last - 1, 1).getValues().map(function (r) { return r[0]; });
    if (texts.indexOf(text) !== -1) return reply({ ok: true, duplicate: true });
  }

  const row = sheet.getRange(last + 1, 1, 1, 4);
  row.setNumberFormat('@');
  row.setValues([[Utilities.getUuid(), new Date().toISOString(), text, '']]);
  return reply({ ok: true });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;
