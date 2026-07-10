import { syncToGoogleSheets } from './googleSheetsSync';
import { isGoogleSyncConfigured } from './googleAuth';

const ENABLED_KEY = 'googleSheetsSyncEnabled';

export function isAutoSyncEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export function setAutoSyncEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSync() {
  if (!isGoogleSyncConfigured() || !isAutoSyncEnabled()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    syncToGoogleSheets(false).catch(() => {
      // silent: offline, not signed in, or token expired — user can sync manually
    });
  }, 3000);
}
