# Budget Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Budget tab where the user sets a monthly spending limit per expense category and sees a progress bar of how much they've spent this month against that limit.

**Architecture:** New Dexie table `budgets` (one row per category, holds a recurring monthly limit). A new `/budget` route reuses the existing spent-by-category derivation pattern from `Dashboard.tsx` and the existing `Modal` component for the edit form. Purely additive — no changes to `transactionManager.ts` or the balance recalculation engine.

**Tech Stack:** React 19 + TypeScript + Vite, Dexie/IndexedDB, react-router-dom (HashRouter), lucide-react icons. No test runner is configured in this project (`webapp/package.json` has no vitest/jest) — verification in this plan is `tsc` type-checking (`npm run build`), `oxlint` (`npm run lint`), and manual exercise in the browser, matching the existing codebase's untested style and the spec's manual test plan.

**Spec:** `docs/superpowers/specs/2026-07-11-budget-tab-design.md`

---

### Task 1: Budget data model

**Files:**
- Modify: `webapp/src/db/db.ts`

- [ ] **Step 1: Add the `Budget` interface and table**

In `webapp/src/db/db.ts`, add the interface next to the other model interfaces (after `Category`, before `Transaction`):

```ts
export interface Budget {
  id: string;
  categoryId: string;  // one budget per category — enforced unique below
  monthlyLimit: number;
}
```

Add `budgets` to the `db` type declaration:

```ts
export const db = new Dexie('PersonalFinanceDB') as Dexie & {
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  budgets: EntityTable<Budget, 'id'>;
};
```

Add a new version block right after the existing `db.version(1).stores({...})` block (do not edit the version(1) block):

```ts
db.version(2).stores({
  accounts: 'id, name, accountType',
  categories: 'id, name, type',
  transactions: 'id, date, transactionType, accountId, toAccountId, categoryId',
  budgets: 'id, &categoryId',
});
```

`&categoryId` is Dexie's syntax for a unique index — it enforces one `Budget` row per category at the database level.

- [ ] **Step 2: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors (Vite build succeeds).

- [ ] **Step 3: Commit**

```bash
git add webapp/src/db/db.ts
git commit -m "feat: add budgets table to Dexie schema"
```

---

### Task 2: Budget edit form

**Files:**
- Create: `webapp/src/components/BudgetForm.tsx`

- [ ] **Step 1: Write the form component**

Follows the same shape as `webapp/src/components/CategoryForm.tsx`: a `Modal` wrapping a controlled input, `existing` prop to prefill on edit.

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { db, newId, type Budget, type Category } from '../db/db';

export function BudgetForm({
  category,
  existing,
  onClose,
}: {
  category: Category;
  existing?: Budget;
  onClose: () => void;
}) {
  const [limitInput, setLimitInput] = useState(existing ? String(existing.monthlyLimit) : '');

  const limit = Number(limitInput);
  const valid = limitInput !== '' && !Number.isNaN(limit) && limit > 0;

  async function save() {
    if (!valid) return;
    if (existing) {
      await db.budgets.update(existing.id, { monthlyLimit: limit });
    } else {
      await db.budgets.add({ id: newId(), categoryId: category.id, monthlyLimit: limit });
    }
    onClose();
  }

  return (
    <Modal title={`Budget: ${category.name}`} onCancel={onClose} onSave={save} saveDisabled={!valid}>
      <div className="form-section">
        <div className="form-field">
          <div className="form-row">
            <label>Monthly limit</label>
            <input
              type="number"
              inputMode="decimal"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors. (Not yet imported anywhere, so this only checks the file is syntactically/type valid in isolation via the project build.)

- [ ] **Step 3: Commit**

```bash
git add webapp/src/components/BudgetForm.tsx
git commit -m "feat: add BudgetForm component for setting category limits"
```

---

### Task 3: Budget page

**Files:**
- Create: `webapp/src/pages/Budget.tsx`

- [ ] **Step 1: Write the page**

Spent-this-month-by-category logic mirrors `webapp/src/pages/Dashboard.tsx:24-34`.

```tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category } from '../db/db';
import { CategoryIcon } from '../lib/icons';
import { formatCurrency } from '../lib/format';
import { BudgetForm } from '../components/BudgetForm';

export function Budget() {
  const [editing, setEditing] = useState<Category | null>(null);

  const categories = useLiveQuery(() => db.categories.where('type').equals('expense').toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

  const now = new Date();
  const spentByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.transactionType !== 'expense' || !t.categoryId) continue;
    const d = new Date(t.date);
    if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue;
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
  }

  function budgetFor(categoryId: string) {
    return budgets.find((b) => b.categoryId === categoryId);
  }

  function progressColor(spent: number, limit: number): string {
    const pct = limit > 0 ? spent / limit : 0;
    if (pct > 1) return 'var(--red)';
    if (pct >= 0.8) return 'var(--yellow)';
    return 'var(--green)';
  }

  const editingBudget = editing ? budgetFor(editing.id) : undefined;

  return (
    <div className="page">
      <h1 className="page-title">Budget</h1>
      <div className="card">
        {categories.length === 0 && <div className="empty-state">No expense categories yet.</div>}
        {categories.map((c) => {
          const b = budgetFor(c.id);
          const spent = spentByCategory.get(c.id) ?? 0;
          return (
            <div className="budget-item" key={c.id}>
              <div className="budget-item-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CategoryIcon name={c.iconName} color={`#${c.hexColor}`} />
                  {c.name}
                </div>
                <button className="icon-btn" onClick={() => setEditing(c)}>
                  {b ? formatCurrency(b.monthlyLimit) : 'Set budget'}
                </button>
              </div>
              {b && (
                <>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min((spent / b.monthlyLimit) * 100, 100)}%`,
                        background: progressColor(spent, b.monthlyLimit),
                      }}
                    />
                  </div>
                  <div className="budget-item-sub">
                    {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {editing && <BudgetForm category={editing} existing={editingBudget} onClose={() => setEditing(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add webapp/src/pages/Budget.tsx
git commit -m "feat: add Budget page with per-category progress bars"
```

---

### Task 4: Wire up route and navigation

**Files:**
- Modify: `webapp/src/App.tsx`
- Modify: `webapp/src/components/BottomNav.tsx`

- [ ] **Step 1: Add the route**

In `webapp/src/App.tsx`, add the import and route:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Management } from './pages/Management';
import { Analytics } from './pages/Analytics';
import { Budget } from './pages/Budget';

function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/management" element={<Management />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/budget" element={<Budget />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 2: Add the nav item**

In `webapp/src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { PieChart, List, Folder, BarChart3, Wallet } from 'lucide-react';

const items = [
  { to: '/', label: 'Dashboard', Icon: PieChart },
  { to: '/transactions', label: 'Transactions', Icon: List },
  { to: '/budget', label: 'Budget', Icon: Wallet },
  { to: '/management', label: 'Management', Icon: Folder },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

(Budget placed between Transactions and Management to keep entry/spend-review flows together.)

- [ ] **Step 3: Type-check**

Run: `cd webapp && npm run build`
Expected: compiles with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add webapp/src/App.tsx webapp/src/components/BottomNav.tsx
git commit -m "feat: wire up Budget tab route and navigation"
```

---

### Task 5: Progress bar styling

**Files:**
- Modify: `webapp/src/index.css`

- [ ] **Step 1: Add the `--yellow` color variable**

In the `:root` block (`webapp/src/index.css:10-23`), add a line next to `--green`/`--red`:

```css
  --yellow: #ffcc00;
```

- [ ] **Step 2: Add budget item and progress bar styles**

Append near the other item/card styles (e.g. after the `.list-item` rules around line 300):

```css
.budget-item {
  padding: 12px 4px;
  border-bottom: 1px solid var(--border);
}

.budget-item:last-child {
  border-bottom: none;
}

.budget-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.budget-item-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.progress-track {
  height: 8px;
  border-radius: 4px;
  background: var(--border);
  margin-top: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.2s ease;
}
```

- [ ] **Step 3: Commit**

```bash
git add webapp/src/index.css
git commit -m "style: add progress bar styles for Budget tab"
```

---

### Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Lint and build**

Run: `cd webapp && npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 2: Start the dev server and exercise the feature**

Start the app (use the project's preview tooling against `webapp`), then in the browser:

1. Open the **Budget** tab from the bottom nav — confirm it lists all expense categories, each showing "Set budget".
2. Click a category, enter a monthly limit (e.g. `1000`), save — confirm it now shows the limit and an empty (0%) progress bar.
3. Go to Dashboard, add an expense transaction against that category for an amount under 80% of the limit — return to Budget, confirm the spent amount updated and the bar is green.
4. Add another expense pushing the total between 80% and 100% of the limit — confirm the bar turns yellow.
5. Add another expense pushing the total over 100% — confirm the bar turns red and stays capped at full width (doesn't overflow the track).
6. Reload the page (or navigate away and back) — confirm the budget and progress bar state persists (IndexedDB).
7. Confirm income categories never appear on the Budget tab.

- [ ] **Step 3: Fix any issues found, then commit if changes were made**

If Step 2 surfaces a bug, fix it in the relevant file from Tasks 1-5, re-run Step 1, re-verify, then:

```bash
git add -A
git commit -m "fix: address issues found in Budget tab manual verification"
```

If no issues were found, no commit is needed for this task.

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), expense-only scope (Task 3 filters `type === 'expense'`), "Set budget" CTA (Task 3), edit modal (Task 2), derived/no-balance-engine-touch (Task 3 only reads `db.transactions`), color thresholds (Task 3 `progressColor`), persistence test (Task 6 Step 6) — all covered.
- **Type consistency:** `Budget { id, categoryId, monthlyLimit }` used identically in `db.ts`, `BudgetForm.tsx`, and `Budget.tsx`. `budgetFor`/`progressColor` names used consistently within `Budget.tsx`.
- **No out-of-scope work:** no `scheduleAutoSync()` calls added (Google Sheets sync schema is untouched by this feature, per spec's out-of-scope list); no changes to `transactionManager.ts`.
