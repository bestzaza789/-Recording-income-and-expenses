# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The active application is **`webapp/`** — a React + Vite PWA. All recent development happens there.

The root `README.md` and `TODO.md` describe an earlier, unrelated iOS/SwiftUI plan (`PersonalFinanceApp/`, a native Swift project). That native project is not under active development; recent git history only touches `webapp/`. Do not use the root README as a guide to the current architecture — treat this file and `webapp/src/db/db.ts` as the source of truth instead.

## Commands

All commands run from `webapp/`:

```bash
npm run dev       # start Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview   # preview a production build
```

There is no test suite configured.

## Architecture

**Stack:** React 19, TypeScript, Vite, `react-router-dom` (`HashRouter`), Dexie (IndexedDB) via `dexie-react-hooks`, Recharts for charts, `tesseract.js` for OCR, `vite-plugin-pwa`. No backend/server — the app is 100% client-side and offline-first; all data lives in IndexedDB on the device.

**Data layer (`src/db/db.ts`):** Dexie schema is the single source of truth for domain types (`Account`, `Category`, `Transaction`, `Budget`, `RecurringRule`, `Bookmark`). Schema changes go through incrementing `db.version(n).stores({...})` — add a new version block rather than editing an existing one. Components read data reactively with `useLiveQuery(() => db.table.toArray(), [deps])`; there is no separate state-management library.

**Balance recalculation (`src/db/transactionManager.ts`):** all transaction/account writes must go through this module (`addTransaction`, `updateTransaction`, `deleteTransaction`, `addAccount`, `updateAccount`, bookmark helpers) — never write to `db.transactions`/`db.accounts` directly from a component. Every write applies or reverses a balance delta on the affected account(s) inside a single Dexie `db.transaction('rw', ...)`, and schedules a debounced Google Sheets sync (`scheduleAutoSync`). `transactionType` is one of `'income' | 'expense' | 'transfer'`; a transfer debits `accountId` and credits `toAccountId` without touching net worth.

**Recurring transactions (`src/db/recurringEngine.ts`):** `generateDueRecurring()` walks each `RecurringRule` forward from its `lastGenerated` month key, generating one transaction per elapsed due date via `transactionManager.addTransaction`, and advances `lastGenerated`. Month keys are `'YYYY-MM'` strings; day-of-month is clamped to the last day of shorter months.

**Google Sheets sync (`src/lib/sheets/{api,export,import}.ts`, `src/lib/googleAuth.ts`, `src/lib/autoSync.ts`):** optional two-way backup/import to a user's Google Sheet (one sheet tab per table). `sheets/api.ts` is the low-level fetch/spreadsheet plumbing, `sheets/export.ts` builds per-table rows and pushes them, `sheets/import.ts` reads rows back and matches existing records by name/composite key to avoid duplicates before inserting. Sync is opt-in and silently no-ops when not configured or offline.

**Lookups (`src/lib/lookup.ts`):** `categoryFor`/`accountFor`/`accountNameFor` are the shared helpers for resolving a `Category`/`Account` by id from an already-fetched array — use these instead of writing another local `.find()` closure.

**OCR slip scanning (`src/ocr/ocrService.ts`, `src/components/SlipScanner.tsx`, `ScannedTransactionForm.tsx`):** `tesseract.js` (`tha+eng`) extracts raw text from a bank transfer slip image; `parseExtractedText` regexes out an amount and guesses account/category from keyword lists (bank names, merchant names). Parsed output pre-fills a confirmation form — it is a best-effort guess, never auto-submitted.

**Routing (`src/App.tsx`):** flat `HashRouter` route list — `/`, `/transactions`, `/management`, `/analytics`, `/budget`, `/account/:id` — plus a persistent `BottomNav`. Pages are the route-level containers; most cross-page-reused UI lives in `src/components/`.

**Modal conventions (`src/components/Modal.tsx`, `WizardShell.tsx`):** all forms and sheets use the same bottom-sheet `.modal-overlay`/`.modal-sheet` pattern, dismissed by backdrop click or a header Cancel button. `WizardShell` is the multi-step variant (step dots, optional Back) used by flows like "New Manual Entry" and "New Transfer" — reach for it instead of one-off multi-screen state when a flow has more than one step.

**Formatting (`src/lib/format.ts`):** all date/currency/month formatting goes through this module (`formatCurrency`, `formatDate`, `formatTime`, `formatDateTime`, `formatMonth`, `startOfDay`, `startOfMonth`) — reuse it rather than calling `toLocaleString`/`Intl` inline, to keep formatting consistent across pages.

## Domain notes

- A `Transaction.categoryId` is optional — uncategorized transactions are grouped under a synthetic `'other'` key in UI aggregations (e.g. `Analytics.tsx`), not a real `Category` row. When filtering by category, match with `(t.categoryId ?? 'other') === categoryId`.
- `Transaction.note` is a free-text field distinct from category; several rows (e.g. `TransactionRow`) only show it as a fallback title when there's no category, so it's easy to assume notes aren't rendered anywhere — check call sites before assuming a note is or isn't displayed.
- `docs/superpowers/plans/` and `docs/superpowers/specs/` contain one-off design docs for already-shipped features (Budget tab, Budgets↔Sheets sync, Recurring transactions) — useful as historical context, not living documentation.
