# Recurring Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users define monthly recurring expense/income rules (rent, salary, subscriptions) that auto-generate real transactions when due, including backfilling months missed while the app was closed.

**Architecture:** New Dexie table `recurring` (version 3). A pure generation engine (`db/recurringEngine.ts`) runs once at startup in `main.tsx` before render and creates due transactions through the existing `addTransaction()`, so balance recalculation and auto-sync fire normally. Management gets a third segment listing rules, with a new `RecurringForm` modal for create/edit. Rules are templates — editing/deleting a rule never touches already-generated transactions.

**Tech Stack:** React 19 + TypeScript + Vite, Dexie, lucide-react. No test runner in `webapp/` — verification is `npm run build` + `npm run lint` + a manual browser pass (final task).

**Spec:** `docs/superpowers/specs/2026-07-11-recurring-transactions-design.md`

---

### Task 1: RecurringRule data model

**Files:**
- Modify: `webapp/src/db/db.ts`

- [ ] **Step 1: Add the interface**

Add after the `Budget` interface (before `Transaction`):

```ts
export interface RecurringRule {
  id: string;
  amount: number;
  transactionType: 'income' | 'expense';
  dayOfMonth: number;      // 1-31; clamped to the month's last day at generation time
  accountId: string;
  categoryId?: string;
  note?: string;
  lastGenerated: string;   // 'YYYY-MM' month key of the last month generated
}
```

- [ ] **Step 2: Register the table**

Add to the `db` type declaration:

```ts
export const db = new Dexie('PersonalFinanceDB') as Dexie & {
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  budgets: EntityTable<Budget, 'id'>;
  recurring: EntityTable<RecurringRule, 'id'>;
};
```

Add a new version block after the existing `db.version(2).stores({...})` (leave versions 1 and 2 untouched):

```ts
db.version(3).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
  budgets: 'id, &categoryId',
  recurring: 'id',
});
```

- [ ] **Step 3: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/db/db.ts
git commit -m "feat: add recurring rules table to Dexie schema"
```

---

### Task 2: Generation engine

**Files:**
- Create: `webapp/src/db/recurringEngine.ts`

- [ ] **Step 1: Write the engine**

```ts
import { db } from './db';
import { addTransaction } from './transactionManager';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m, 1)); // m is 1-based, so month index m = next month
}

function dueDateInMonth(key: string, dayOfMonth: number): Date {
  const [y, m] = key.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(dayOfMonth, lastDay));
}

// At rule creation: if this month's due date already passed, start next month
// (the user has presumably recorded this month's bill manually). Due today or
// later starts this month, so a due-today rule generates on next startup.
export function initialLastGenerated(dayOfMonth: number, now = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = dueDateInMonth(monthKey(now), dayOfMonth);
  if (due < today) return monthKey(now);
  return monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

export async function generateDueRecurring(now = new Date()): Promise<number> {
  const rules = await db.recurring.toArray();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentKey = monthKey(now);
  let generated = 0;

  for (const rule of rules) {
    const account = await db.accounts.get(rule.accountId);
    if (!account) continue; // account deleted: skip without advancing lastGenerated

    let key = nextMonthKey(rule.lastGenerated);
    while (key <= currentKey) {
      const due = dueDateInMonth(key, rule.dayOfMonth);
      if (due > today) break;
      await addTransaction({
        amount: rule.amount,
        type: rule.transactionType,
        date: due,
        note: rule.note,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
      });
      await db.recurring.update(rule.id, { lastGenerated: key });
      generated++;
      key = nextMonthKey(key);
    }
  }
  return generated;
}
```

Notes for the implementer: `'YYYY-MM'` keys compare correctly as strings. `lastGenerated` is updated after each generated month, so an interrupted run resumes without duplicates. `addTransaction` already applies the balance delta and schedules auto-sync.

- [ ] **Step 2: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/db/recurringEngine.ts
git commit -m "feat: add recurring transaction generation engine"
```

---

### Task 3: Run the engine at startup

**Files:**
- Modify: `webapp/src/main.tsx`

- [ ] **Step 1: Chain generation before render**

Replace the file contents with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDefaultsIfEmpty } from './db/db'
import { generateDueRecurring } from './db/recurringEngine'

seedDefaultsIfEmpty()
  .then(() => generateDueRecurring())
  .catch(() => {
    // generation failure must never block app startup
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
```

Running before render (rather than in a React effect) avoids StrictMode's double-invoked effects racing two generation passes.

- [ ] **Step 2: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/main.tsx
git commit -m "feat: generate due recurring transactions at startup"
```

---

### Task 4: RecurringForm component

**Files:**
- Create: `webapp/src/components/RecurringForm.tsx`

- [ ] **Step 1: Write the form**

Follows `ManualEntryForm`/`CategoryForm` conventions (Modal, controlled inputs, `existing` prop):

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { db, newId, type Account, type Category, type RecurringRule } from '../db/db';
import { initialLastGenerated } from '../db/recurringEngine';

export function RecurringForm({
  accounts,
  categories,
  existing,
  onClose,
}: {
  accounts: Account[];
  categories: Category[];
  existing?: RecurringRule;
  onClose: () => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>(existing?.transactionType ?? 'expense');
  const [amountInput, setAmountInput] = useState(existing ? String(existing.amount) : '');
  const [dayInput, setDayInput] = useState(existing ? String(existing.dayOfMonth) : '1');
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

  const amount = Number(amountInput);
  const day = Number(dayInput);
  const typeCategories = categories.filter((c) => c.type === type);
  const valid = amount > 0 && Number.isInteger(day) && day >= 1 && day <= 31 && !!accountId;

  async function save() {
    if (!valid) return;
    // A category picked for the other type is dropped rather than saved inconsistently
    const safeCategoryId = typeCategories.some((c) => c.id === categoryId) ? categoryId : undefined;
    if (existing) {
      await db.recurring.update(existing.id, {
        amount,
        transactionType: type,
        dayOfMonth: day,
        accountId,
        categoryId: safeCategoryId,
        note: note || undefined,
      });
    } else {
      await db.recurring.add({
        id: newId(),
        amount,
        transactionType: type,
        dayOfMonth: day,
        accountId,
        categoryId: safeCategoryId,
        note: note || undefined,
        lastGenerated: initialLastGenerated(day),
      });
    }
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit Recurring' : 'New Recurring'} onCancel={onClose} onSave={save} saveDisabled={!valid}>
      <div className="segmented" style={{ marginBottom: 12 }}>
        <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>Expense</button>
        <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>Income</button>
      </div>

      <div className="form-section">
        <div className="form-section-title">Details</div>
        <div className="form-field">
          <div className="form-row">
            <label>Amount (฿)</label>
            <input
              type="number"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-row">
            <label>Day of month</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {typeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rent" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors (component not yet imported anywhere — that's Task 5).

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/RecurringForm.tsx
git commit -m "feat: add RecurringForm component for recurring rules"
```

---

### Task 5: Recurring segment in Management

**Files:**
- Modify: `webapp/src/pages/Management.tsx`

- [ ] **Step 1: Extend state, queries, and imports**

Add imports:

```tsx
import { RecurringForm } from '../components/RecurringForm';
import { formatCurrency } from '../lib/format';   // already imported — keep single import
import { db, type Account, type Category, type CategoryType, type RecurringRule } from '../db/db';
```

(Adjust the existing `db` import line to add `RecurringRule` rather than duplicating it.)

Extend the tab union and add modal state + live query inside the component:

```tsx
  const [tab, setTab] = useState<'accounts' | 'categories' | 'recurring'>('accounts');
  const [recurringModal, setRecurringModal] = useState<'new' | RecurringRule | null>(null);

  const recurringRules = useLiveQuery(() => db.recurring.toArray(), []) ?? [];
```

Add a delete helper next to the other delete functions:

```tsx
  async function deleteRecurring(id: string) {
    await db.recurring.delete(id);
  }
```

(No `scheduleAutoSync()` — rules are not synced to Sheets, per spec.)

- [ ] **Step 2: Add the segment button**

```tsx
      <div className="segmented">
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Accounts</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categories</button>
        <button className={tab === 'recurring' ? 'active' : ''} onClick={() => setTab('recurring')}>Recurring</button>
      </div>
```

- [ ] **Step 3: Add the recurring panel**

The current JSX is a ternary (`tab === 'accounts' ? ... : ...`). Restructure to render per-tab — accounts panel when `tab === 'accounts'`, the existing categories fragment when `tab === 'categories'`, and this new panel when `tab === 'recurring'`:

```tsx
      {tab === 'recurring' && (
        <div className="card">
          {recurringRules.length === 0 && <div className="empty-state">No recurring transactions yet.</div>}
          {recurringRules.map((r) => {
            const category = categories.find((c) => c.id === r.categoryId);
            const account = accounts.find((a) => a.id === r.accountId);
            return (
              <div className="list-item" key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CategoryIcon name={category?.iconName} color={category ? `#${category.hexColor}` : undefined} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.note || category?.name || 'Recurring'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatCurrency(r.amount)} · day {r.dayOfMonth} · {account?.name ?? 'Unknown account'}
                    </div>
                  </div>
                </div>
                <div>
                  <button className="icon-btn" onClick={() => setRecurringModal(r)}><Pencil size={14} /></button>
                  <button className="delete-btn" onClick={() => deleteRecurring(r.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
          <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => setRecurringModal('new')}>
            <Plus size={16} /> Add Recurring
          </button>
        </div>
      )}
```

- [ ] **Step 4: Render the modal**

Next to the existing `accountModal`/`categoryModal` renders:

```tsx
      {recurringModal && (
        <RecurringForm
          accounts={accounts}
          categories={categories}
          existing={recurringModal === 'new' ? undefined : recurringModal}
          onClose={() => setRecurringModal(null)}
        />
      )}
```

- [ ] **Step 5: Type-check and lint**

Run: `cd webapp && npm run build && npm run lint`
Expected: build passes; lint shows only the 7 pre-existing warnings (in `icons.tsx` ×2, `TransferForm.tsx`, `ManualEntryForm.tsx`, `TransactionRow.tsx`, `Analytics.tsx`, `ScannedTransactionForm.tsx`) — nothing new.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/pages/Management.tsx
git commit -m "feat: add Recurring segment to Management tab"
```

---

### Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Lint and build**

Run: `cd webapp && npm run lint && npm run build`
Expected: both pass, no new lint warnings.

- [ ] **Step 2: Browser walkthrough**

Start the dev server and verify:

1. Management → Recurring shows the empty state.
2. Create a rule with `dayOfMonth` = today's day, an expense category, and a note → rule appears in the list with amount/day/account subtitle.
3. Reload the page → a transaction with today's date appears in Transactions/Dashboard, the account balance decreased, and the rule's transaction is NOT duplicated on further reloads.
4. Create a rule with a `dayOfMonth` in the future (e.g. today + 5, if not past month-end) → reload → no transaction generated.
5. Edit a rule (change amount) → list updates; previously generated transactions unchanged.
6. Delete a rule → gone from list; its generated transactions remain.
7. In the form: switching Expense/Income swaps the category options; Save disabled for amount 0/empty or day outside 1-31.

- [ ] **Step 3: Fix any issues found**

If a bug surfaces, fix it in the relevant file from Tasks 1-5, re-run Step 1, re-verify, then commit the fix:

```bash
git add -A
git commit -m "fix: address issues found in recurring transactions verification"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), engine with clamping/backfill/idempotency/deleted-account skip (Task 2), pre-render startup run (Task 3), form with type-filtered categories and validation (Task 4), Management segment with list/edit/delete/empty state (Task 5), the spec's manual test list (Task 6). Out-of-scope items (weekly, transfers, sheet sync of rules, pause) absent.
- **Type consistency:** `RecurringRule` fields (`transactionType`, `dayOfMonth`, `lastGenerated`) used identically across `db.ts`, `recurringEngine.ts`, `RecurringForm.tsx`, `Management.tsx`. `initialLastGenerated`/`generateDueRecurring` names match between definition and call sites.
- **Ordering note:** this plan assumes the budgets-sync feature merged first (db is at version 2 with `budgets`); if executed standalone against an older base, version numbers in Task 1 must be re-checked.
