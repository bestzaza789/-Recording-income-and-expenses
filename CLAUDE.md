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

**Slip inbox (`src/lib/sheets/inbox.ts`, `SlipInboxCard.tsx`, `SlipInboxSetup.tsx`):** opt-in "auto slip" flow for iPhone. An iOS Shortcut (triggered when a bank app closes) OCRs the newest slip photo with Live Text and sends it as a GET `.../exec?text=<url-encoded>` (POSTs from Shortcuts never reached the script) to a Google Apps Script (source in `APPS_SCRIPT_CODE`) bound to the user's backup spreadsheet, which appends a row to an `Inbox` tab (`id, receivedAt, text, status`). The Dashboard card reads rows with empty `status`, runs them through `ocr/parseSlip.ts`, and writes `saved`/`skipped` back after the user confirms. Only active when Sheets sync is connected and the user enabled it in Management. `parseSlip.ts` is kept free of `tesseract.js` so the main bundle doesn't pull it in. `ScannedTransactionForm` lets the user record a slip as an expense or a transfer to one of their own accounts; `parseSlip` extracts masked account numbers (`accountSuffixes`: sender first, receiver second) and `ocr/slipMemory.ts` (localStorage) learns which suffix belongs to which `Account`, so a receiver seen before as the user's own account preselects "transfer"; it also preselects "transfer" when the sender and receiver names on the slip match (`parseSlip` `names`/`sameName`, prefix match because banks truncate surnames). Editing any existing transaction goes through `EditTransactionForm`, which can switch between expense, income and transfer (`ManualEntryForm`/`TransferForm` are create-only wizards). The form also warns when a same-amount, non-income transaction exists within 30 minutes (possible duplicate).

**Engagement features:** `lib/dailyAllowance.ts` (Dashboard "วันนี้ใช้ได้อีก" card: a daily limit the user types in Management (`DailyLimitSetting`, stored in localStorage) minus today's expenses; hidden when unset). The limit can be restricted to chosen expense categories (`daily-limit-categories`; empty = all, `'other'` = uncategorized) and can roll over: with `daily-limit-rollover` (start-of-day timestamp of when it was switched on) each earlier day since then, within the current month, adds the limit and subtracts what was spent into today's budget (`computeAllowance`); resets monthly. All three settings live in localStorage and sync to a key/value `Settings` sheet tab (categories by name); import restores them only when this device has no limit set. `Loan` table (`LoansSection` on the Budget page): recording a loan touches no balance; `transactionManager.settleLoan` marks it repaid and adds an income/expense in the dedicated "รับเงินยืมคืน"/"คืนเงินยืม" category. Loans sync to a `Loans` tab (matched on import by person+direction+amount+created day); badges are not synced to Google Sheets. `lib/badges.ts` defines the badge stickers derived from data; `BadgeWatcher` (mounted in `App`) persists newly earned ones into `db.badges` so a badge stays earned even if the data later changes. `WrappedModal` (Analytics → monthly) renders a month summary as one inline SVG and exports it to PNG by cloning it with CSS-derived colours inlined, then share/download.

**Guided tours (`src/lib/tour/{tours,tourStore}.ts`, `components/TourOverlay.tsx`, `pages/Guide.tsx`):** the `/guide` page lists tours; each is an ordered list of steps that spotlight a real element on the real page and wait for the user to use it. `tours.ts` is the only file to edit to add or change a tour: targets are CSS selectors (optionally narrowed by visible text, `a|b` = either) so tours need no markup changes — scope selectors inside sheets with `.modal-sheet`. Step modes: `click` (default with a target; advances when a button inside the target is pressed, optionally `clickText`), `fill` (user fills the target, tip's Next runs `validate`), `info` (highlight only). While a tour runs, `TourOverlay` blocks every click outside the target and tip, navigates to a step's `route`, polls with `setInterval` (not rAF — throttled in background tabs) until the target appears, and silently skips `optional` steps whose target never shows. Running tours write real data. Finished tours are remembered in localStorage (`tours-done`, not synced). Entry points: Management top card, Dashboard footer link, and the last Onboarding step (starts `first-expense`).

**Routing (`src/App.tsx`):** flat `HashRouter` route list — `/`, `/transactions`, `/management`, `/analytics`, `/budget`, `/account/:id`, `/guide` — plus a persistent `BottomNav`. Pages are the route-level containers; most cross-page-reused UI lives in `src/components/`.

**Modal conventions (`src/components/Modal.tsx`, `WizardShell.tsx`):** all forms and sheets use the same bottom-sheet `.modal-overlay`/`.modal-sheet` pattern, dismissed by backdrop click or a header Cancel button. `WizardShell` is the multi-step variant (step dots, optional Back) used by flows like "New Manual Entry" and "New Transfer" — reach for it instead of one-off multi-screen state when a flow has more than one step.

**Formatting (`src/lib/format.ts`):** all date/currency/month formatting goes through this module (`formatCurrency`, `formatDate`, `formatTime`, `formatDateTime`, `formatMonth`, `startOfDay`, `startOfMonth`) — reuse it rather than calling `toLocaleString`/`Intl` inline, to keep formatting consistent across pages.

## Domain notes

- A `Transaction.categoryId` is optional — uncategorized transactions are grouped under a synthetic `'other'` key in UI aggregations (e.g. `Analytics.tsx`), not a real `Category` row. When filtering by category, match with `(t.categoryId ?? 'other') === categoryId`.
- `Transaction.note` is a free-text field distinct from category; several rows (e.g. `TransactionRow`) only show it as a fallback title when there's no category, so it's easy to assume notes aren't rendered anywhere — check call sites before assuming a note is or isn't displayed.
- `docs/superpowers/plans/` and `docs/superpowers/specs/` contain one-off design docs for already-shipped features (Budget tab, Budgets↔Sheets sync, Recurring transactions) — useful as historical context, not living documentation.
