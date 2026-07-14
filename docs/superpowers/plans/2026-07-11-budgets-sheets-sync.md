# Budgets → Google Sheets Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include the `budgets` table in the existing Google Sheets export/import so budget limits survive browser-data loss.

**Architecture:** Purely additive to [googleSheetsSync.ts](../../../webapp/src/lib/googleSheetsSync.ts): a fourth sheet tab `Budgets` in the export, a skip-duplicates import pass matching categories by name, and a `scheduleAutoSync()` call in `BudgetForm`. No changes to auth, spreadsheet management, or the sync architecture.

**Tech Stack:** React 19 + TypeScript + Vite, Dexie, Google Sheets REST API (existing wrapper). No test runner exists in `webapp/` — verification is `npm run build` + `npm run lint`; end-to-end Google verification is deferred to the user (OAuth is interactive).

**Spec:** `docs/superpowers/specs/2026-07-11-budgets-sheets-sync-design.md`

---

### Task 1: Export budgets sheet

**Files:**
- Modify: `webapp/src/lib/googleSheetsSync.ts`

- [ ] **Step 1: Add the sheet constant**

Change the sheet constants block (currently lines 11-14) to:

```ts
const TRANSACTIONS_SHEET = 'Transactions';
const ACCOUNTS_SHEET = 'Accounts';
const CATEGORIES_SHEET = 'Categories';
const BUDGETS_SHEET = 'Budgets';
const ALL_SHEETS = [TRANSACTIONS_SHEET, ACCOUNTS_SHEET, CATEGORIES_SHEET, BUDGETS_SHEET];
```

`ensureSheetTabs()` already creates any tab in `ALL_SHEETS` that's missing from an existing spreadsheet — no further migration code is needed.

- [ ] **Step 2: Add the row builder**

Add after `buildCategoryRows()`:

```ts
async function buildBudgetRows(): Promise<string[][]> {
  const [budgets, categories] = await Promise.all([db.budgets.toArray(), db.categories.toArray()]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '';
  const header = ['Category', 'Monthly Limit'];
  const rows = budgets.map((b) => [categoryName(b.categoryId), b.monthlyLimit.toFixed(2)]);
  return [header, ...rows];
}
```

- [ ] **Step 3: Write the sheet during sync**

In `syncToGoogleSheets()`, extend the parallel build and the writes:

```ts
  const [transactionRows, accountRows, categoryRows, budgetRows] = await Promise.all([
    buildTransactionRows(),
    buildAccountRows(),
    buildCategoryRows(),
    buildBudgetRows(),
  ]);

  await writeSheet(token, spreadsheetId, TRANSACTIONS_SHEET, transactionRows);
  await writeSheet(token, spreadsheetId, ACCOUNTS_SHEET, accountRows);
  await writeSheet(token, spreadsheetId, CATEGORIES_SHEET, categoryRows);
  await writeSheet(token, spreadsheetId, BUDGETS_SHEET, budgetRows);
```

- [ ] **Step 4: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/lib/googleSheetsSync.ts
git commit -m "feat: export budgets to a Budgets sheet in Google Sheets sync"
```

---

### Task 2: Import budgets

**Files:**
- Modify: `webapp/src/lib/googleSheetsSync.ts`

- [ ] **Step 1: Extend `ImportResult`**

```ts
export interface ImportResult {
  accountsAdded: number;
  categoriesAdded: number;
  budgetsAdded: number;
  transactionsImported: number;
  transactionsSkipped: number;
}
```

- [ ] **Step 2: Read the Budgets sheet**

In `importFromGoogleSheets()`, extend the parallel read:

```ts
  const [accountRows, categoryRows, transactionRows, budgetRows] = await Promise.all([
    readSheetValues(token, spreadsheetId, ACCOUNTS_SHEET),
    readSheetValues(token, spreadsheetId, CATEGORIES_SHEET),
    readSheetValues(token, spreadsheetId, TRANSACTIONS_SHEET),
    readSheetValues(token, spreadsheetId, BUDGETS_SHEET),
  ]);
```

(`readSheetValues` already returns `[]` for a missing sheet — old spreadsheets without a Budgets tab import cleanly.)

- [ ] **Step 3: Add the import pass**

Insert after the categories import loop (i.e. after `categoriesAdded` is finalized, before the transactions section), so imported categories are matchable in the same run:

```ts
  const existingBudgets = await db.budgets.toArray();
  let budgetsAdded = 0;
  for (const [catName, limitStr] of budgetRows.slice(1)) {
    if (!catName) continue;
    const limit = parseFloat(limitStr);
    if (!limit || limit <= 0) continue;
    const category = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase() && c.type === 'expense');
    if (!category) continue;
    if (existingBudgets.some((b) => b.categoryId === category.id)) continue;
    const budget = { id: newId(), categoryId: category.id, monthlyLimit: limit };
    await db.budgets.add(budget);
    existingBudgets.push(budget);
    budgetsAdded++;
  }
```

- [ ] **Step 4: Include the count in the return value**

```ts
  return { accountsAdded, categoriesAdded, budgetsAdded, transactionsImported, transactionsSkipped };
```

- [ ] **Step 5: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors. (`GoogleSyncCard` doesn't reference `budgetsAdded` yet, so nothing else breaks.)

- [ ] **Step 6: Commit**

```bash
git add webapp/src/lib/googleSheetsSync.ts
git commit -m "feat: import budgets from Google Sheets (skip existing)"
```

---

### Task 3: Surface the count and trigger auto-sync

**Files:**
- Modify: `webapp/src/components/GoogleSyncCard.tsx`
- Modify: `webapp/src/components/BudgetForm.tsx`

- [ ] **Step 1: Report budgets in the import status message**

In `GoogleSyncCard.tsx`'s `importNow()`, replace the `setStatus(...)` call with:

```ts
      setStatus(
        `Imported: ${result.accountsAdded} accounts, ${result.categoriesAdded} categories, ${result.budgetsAdded} budgets, ${result.transactionsImported} transactions (${result.transactionsSkipped} skipped as duplicates/unmatched).`
      );
```

- [ ] **Step 2: Trigger auto-sync from BudgetForm**

In `BudgetForm.tsx`, add the import:

```ts
import { scheduleAutoSync } from '../lib/autoSync';
```

and in `save()`, call it after the write, before `onClose()`:

```ts
  async function save() {
    if (!valid) return;
    if (existing) {
      await db.budgets.update(existing.id, { monthlyLimit: limit });
    } else {
      await db.budgets.add({ id: newId(), categoryId: category.id, monthlyLimit: limit });
    }
    scheduleAutoSync();
    onClose();
  }
```

- [ ] **Step 3: Type-check and lint**

Run: `cd webapp && npm run build && npm run lint`
Expected: build passes; lint shows only the 7 pre-existing warnings (in `icons.tsx` ×2, `TransferForm.tsx`, `ManualEntryForm.tsx`, `TransactionRow.tsx`, `Analytics.tsx`, `ScannedTransactionForm.tsx`) — nothing new.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/components/GoogleSyncCard.tsx webapp/src/components/BudgetForm.tsx
git commit -m "feat: report imported budgets and auto-sync on budget changes"
```

---

## Self-Review Notes

- **Spec coverage:** export sheet + columns (Task 1), skip-duplicates import with expense-only case-insensitive matching and `budgetsAdded` (Task 2), status message + `scheduleAutoSync()` in BudgetForm (Task 3). Out-of-scope items (overwrite-on-import, recurring rules) not implemented anywhere.
- **Type consistency:** `budgetsAdded` name used identically in `ImportResult`, the import loop, the return statement, and `GoogleSyncCard`. `BUDGETS_SHEET` used in export, tab creation (via `ALL_SHEETS`), and import read.
- **End-to-end Google verification** (real OAuth, real spreadsheet) is user-deferred per spec — the plan's verification gates are build + lint only.
