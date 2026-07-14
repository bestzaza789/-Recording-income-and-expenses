import { useState } from 'react';
import { RefreshCw, ExternalLink, Download } from 'lucide-react';
import { isGoogleSyncConfigured, requestAccessToken } from '../lib/googleAuth';
import { syncToGoogleSheets, importFromGoogleSheets, getSpreadsheetUrl } from '../lib/googleSheetsSync';
import { isAutoSyncEnabled, setAutoSyncEnabled } from '../lib/autoSync';

export function GoogleSyncCard() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState(getSpreadsheetUrl());
  const [enabled, setEnabled] = useState(isAutoSyncEnabled());

  if (!isGoogleSyncConfigured()) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Google Sheets Sync</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Not configured. Set VITE_GOOGLE_CLIENT_ID to enable backup to Google Sheets.
        </div>
      </div>
    );
  }

  async function connectAndSync() {
    setBusy(true);
    setStatus(null);
    try {
      await requestAccessToken(true);
      setAutoSyncEnabled(true);
      setEnabled(true);
      const result = await syncToGoogleSheets(false);
      setSheetUrl(result.url);
      setStatus(`Synced ${result.rowCount} transactions just now.`);
    } catch (e) {
      setStatus(`Sync failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await syncToGoogleSheets(true);
      setSheetUrl(result.url);
      setStatus(`Synced ${result.rowCount} transactions just now.`);
    } catch (e) {
      setStatus(`Sync failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function importNow() {
    if (!confirm('Import data from the connected Google Sheet? New accounts, categories, budgets, and non-duplicate transactions will be added to this device.')) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await importFromGoogleSheets(true);
      setStatus(
        `Imported: ${result.accountsAdded} accounts, ${result.categoriesAdded} categories, ${result.budgetsAdded} budgets, ${result.transactionsImported} transactions (${result.transactionsSkipped} skipped as duplicates/unmatched).`
      );
    } catch (e) {
      setStatus(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    setAutoSyncEnabled(false);
    setEnabled(false);
    setStatus('Auto-sync turned off. Local data is unaffected.');
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title" style={{ marginTop: 0 }}>Google Sheets Sync</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {enabled
          ? 'Auto-sync is on. Data pushes to your Google Sheet after every change.'
          : 'Data stays local only until you connect a Google account.'}
      </div>

      <button className="upload-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={enabled ? syncNow : connectAndSync} disabled={busy}>
        <RefreshCw size={16} className={busy ? 'spin' : ''} />
        {busy ? 'Syncing...' : enabled ? 'Sync Now' : 'Connect Google Sheets'}
      </button>

      {sheetUrl && (
        <>
          <a href={sheetUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, color: 'var(--accent)' }}>
            <ExternalLink size={14} /> Open spreadsheet
          </a>
          <button className="icon-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10, marginRight: 0, padding: '10px 0' }} onClick={importNow} disabled={busy}>
            <Download size={16} style={{ marginRight: 6 }} /> Import from Sheet
          </button>
        </>
      )}

      {status && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{status}</div>}

      {enabled && (
        <button className="delete-btn" style={{ marginTop: 10 }} onClick={disconnect}>Turn off auto-sync</button>
      )}
    </div>
  );
}
