# Budget Tab — Design

## Context

App is `webapp/` (React + Vite + TypeScript + Dexie/IndexedDB), a rewrite of the earlier native SwiftUI prototype (`PersonalFinanceApp/`, no longer being developed). Existing tabs: Dashboard, Transactions, Management, Analytics (see [App.tsx](../../../webapp/src/App.tsx), [BottomNav.tsx](../../../webapp/src/components/BottomNav.tsx)).

Goal: let users set a monthly spending limit per expense category and see how much of it they've used this month.

## Data Model

New Dexie table in [db.ts](../../../webapp/src/db/db.ts):

```ts
export interface Budget {
  id: string;
  categoryId: string;   // unique — one budget per category
  monthlyLimit: number;
}
```

Bump to `db.version(2).stores({ ..., budgets: 'id, categoryId' })`. No migration of existing data needed (new table only).

The limit is a single recurring value per category — it applies every calendar month. There is no per-month history of budget amounts; only the current limit is stored. Changing a limit takes effect immediately for the current month's display.

## Scope

- Only `type === 'expense'` categories can have a budget. Income categories are excluded from the Budget tab entirely.
- A category with no `Budget` row shows a "Set budget" CTA instead of a progress bar.

## Components

- **`pages/Budget.tsx`** (new) — route `/budget`, added to `App.tsx` routes and as a 5th item in `BottomNav.tsx` (icon: `Wallet` from lucide-react).
- Reuses the existing spent-this-month-by-category calculation pattern already present in `Dashboard.tsx` (filter transactions where `transactionType === 'expense'` and `date` falls in current month/year, grouped by `categoryId`).
- For each expense category:
  - Has budget: name, icon/color, `spent / monthlyLimit`, progress bar.
  - No budget: name, icon/color, "Set budget" button.
- Editing a limit: inline number input or small modal (follow the existing modal pattern used by `CategoryForm.tsx`). Saving with a value writes/updates the `Budget` row; there is no separate "delete budget" affordance in this iteration — set focus stays on create/update.

## Data Flow

Purely derived/display feature — it does not touch `transactionManager.ts` or the balance recalculation engine. Reads via `useLiveQuery` on `db.budgets`, `db.categories`, `db.transactions`, same pattern as `Dashboard.tsx`.

## Progress Bar Color

Static thresholds, computed client-side, no persistence, no notifications:
- `< 80%` of limit: green
- `80–100%`: yellow
- `> 100%`: red

## Error Handling

- Limit input must be a positive number (`> 0`); reject/ignore save otherwise (same validation style as existing forms, e.g. `AccountForm.tsx`).
- No other error states — this feature has no network calls and no destructive operations.

## Testing (manual)

1. Set a budget on a category, add expense transactions against it, confirm spent amount and progress bar update.
2. Confirm the progress bar color transitions at the 80% and 100% thresholds.
3. Confirm a category with no budget shows the "Set budget" CTA instead of a bar.
4. Reload the page and confirm budgets persist (IndexedDB).

## Out of Scope (this iteration)

- Per-month budget history / different limits for different months.
- Push notifications or toast alerts when over budget.
- Budgets on income categories.
- A "Dashboard summary card" version of this — superseded by the dedicated tab (decided during brainstorming).
