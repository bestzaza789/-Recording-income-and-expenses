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
