# Recurring Transactions — Design

## Context

Users re-enter the same bills (rent, internet, subscriptions) and salary manually every month. This feature auto-generates those transactions on a monthly schedule. App: `webapp/` (React + TS + Vite + Dexie).

## Data model

New Dexie table (version 3) in [db.ts](../../../webapp/src/db/db.ts):

```ts
export interface RecurringRule {
  id: string;
  amount: number;
  transactionType: 'income' | 'expense';  // transfers out of scope
  dayOfMonth: number;      // 1-31; clamped to the month's last day at generation time
  accountId: string;
  categoryId?: string;
  note?: string;
  lastGenerated: string;   // 'YYYY-MM' month key of the last month generated
}
```

`db.version(3).stores({ ..., recurring: 'id' })` — restating all prior tables per Dexie convention.

Monthly frequency only. Rules are templates: editing or deleting a rule never touches transactions already generated from it.

## Generation engine

New file `webapp/src/db/recurringEngine.ts`:

- `generateDueRecurring(now?)` — for each rule, walk month keys from the month after `lastGenerated` up to the current month; for each month whose due date (dayOfMonth clamped to month length, e.g. day 31 in February → Feb 28/29) is **on or before today**, create the transaction via the existing `addTransaction()` (so balance recalculation and auto-sync fire normally) with the due date as the transaction date, then advance `lastGenerated`. This backfills every missed month when the app hasn't been opened for a while.
- `initialLastGenerated(dayOfMonth, now?)` — used at rule creation: if this month's due date has already passed (strictly before today), the rule starts generating next month (the user has presumably already recorded this month's bill manually); if the due date is today or later, it starts this month. Due today = generates today.
- Runs once at startup in [main.tsx](../../../webapp/src/main.tsx), chained after `seedDefaultsIfEmpty()` and before render — running pre-render avoids StrictMode double-effect races. `lastGenerated` is updated per generated month, making reruns idempotent.
- Month keys are `'YYYY-MM'` strings; lexicographic comparison is safe.

## UI

Third segment **Recurring** in [Management.tsx](../../../webapp/src/pages/Management.tsx) (`Accounts | Categories | Recurring`):

- List of rules: category icon/color, title (note if present, else category name, else "Recurring"), subtitle `฿amount · day N · account name`, edit/delete buttons — same `list-item` pattern as the other segments.
- Delete removes the rule immediately (generated transactions stay). Empty state: "No recurring transactions yet."
- New component `webapp/src/components/RecurringForm.tsx` — Modal form matching `ManualEntryForm`'s conventions: Expense/Income toggle, amount, day-of-month (1-31), account select, category select (filtered by chosen type), optional note. `existing` prop for edit. Validation: amount > 0, integer day 1-31, account required.
- Editing a rule keeps its `lastGenerated` — changes apply from the next generation onward.

## Error handling

- If a rule's category no longer exists, the transaction is still created (categoryId simply dangles like any deleted category — existing app behavior).
- If a rule's account was deleted, skip generation for that rule (do not advance `lastGenerated`); `addTransaction` would otherwise create a transaction whose balance impact silently no-ops.
- Form validation mirrors existing forms; no new failure modes.

## Testing

`npm run build` + `npm run lint`, plus manual browser pass:
1. Create rule with dayOfMonth = today → reload → transaction appears with today's date, account balance updated, rule doesn't re-fire on further reloads.
2. Create rule with a future dayOfMonth → reload → nothing generated.
3. Edit and delete flows; empty state; category filtering by type in the form.

## Out of scope

- Weekly/custom frequencies; recurring transfers.
- Syncing rules to Google Sheets.
- Pause/skip-one-month controls.
- Backfilling the current month for a rule created after its due day.
