# Budgets → Google Sheets Sync — Design

## Context

The Budget tab (merged 2026-07-11, see `2026-07-11-budget-tab-design.md`) stores per-category monthly limits in the local Dexie `budgets` table only. Everything else the user enters (accounts, categories, transactions) is backed up to Google Sheets via [googleSheetsSync.ts](../../../webapp/src/lib/googleSheetsSync.ts). Budgets are currently the only user-entered data lost when browser storage is cleared.

Goal: include budgets in the existing export/import sync, with no changes to the sync architecture.

## Export

- New sheet tab `Budgets`, added to `ALL_SHEETS` — the existing `ensureSheetTabs()` already adds missing tabs to previously created spreadsheets, so old spreadsheets upgrade automatically.
- Columns: `Category` (category name), `Monthly Limit` (fixed 2-decimal string, matching the Amount convention in the Transactions sheet).
- One row per `Budget` record; category resolved to its name the same way transactions resolve account/category names.

## Import

Follows the existing merge/skip-duplicates convention in `importFromGoogleSheets()`:

- Match the row's category name (case-insensitive) against **expense** categories only.
- No matching category → skip the row.
- Category already has a budget locally → skip (do not overwrite the local limit).
- Otherwise add a new `Budget` row with the sheet's limit.
- Rows with a missing/non-positive limit are skipped.
- `ImportResult` gains `budgetsAdded: number`; the status message in [GoogleSyncCard.tsx](../../../webapp/src/components/GoogleSyncCard.tsx) reports it.

## Auto-sync trigger

`BudgetForm.save()` now calls `scheduleAutoSync()` after writing, matching `CategoryForm`/`AccountForm`. (This was deliberately omitted when budgets were local-only; that reason no longer holds.)

## Error handling

No new error paths — reuses `readSheetValues`' existing tolerance (missing sheet → empty array) and `writeSheet`'s existing error propagation.

## Testing

`npm run build` + `npm run lint` must pass. End-to-end verification against a real Google account (sheet gains a Budgets tab, import restores budgets on a fresh profile) is left to the user, since OAuth is interactive.

## Out of scope

- Overwriting/merging changed limits on import (skip-if-exists only, same as categories).
- Syncing recurring-transaction rules (separate feature).
