import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageSkeleton } from '../components/Skeleton';
import { db, type Category } from '../db/db';
import { CategoryIcon } from '../lib/icons';
import { formatCurrency } from '../lib/format';
import { BudgetForm } from '../components/BudgetForm';
import { GoalsSection } from '../components/GoalsSection';
import { Mascot, type MascotMood } from '../components/Mascot';

export function Budget() {
  const [editing, setEditing] = useState<Category | null>(null);

  const categories = useLiveQuery(() => db.categories.where('type').equals('expense').toArray(), []) ?? [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const transactionsQuery = useLiveQuery(() => db.transactions.toArray(), []);
  const transactions = transactionsQuery ?? [];

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

  const budgeted = budgets.filter((x) => categories.some((c) => c.id === x.categoryId));
  const totalLimit = budgeted.reduce((s, x) => s + x.monthlyLimit, 0);
  const totalSpent = budgeted.reduce((s, x) => s + (spentByCategory.get(x.categoryId) ?? 0), 0);
  const usedPct = totalLimit > 0 ? totalSpent / totalLimit : 0;
  const pet: { mood: MascotMood; text: string } =
    totalLimit === 0 ? { mood: 'sleepy', text: 'ยังไม่ได้ตั้งงบเลย ตั้งงบกันนะ~ 💤' }
    : usedPct > 1 ? { mood: 'shocked', text: 'ว้าย! งบเกินแล้ว 😱' }
    : usedPct >= 0.8 ? { mood: 'shocked', text: 'งบใกล้หมดแล้วนะ ระวังหน่อย 😥' }
    : usedPct >= 0.5 ? { mood: 'happy', text: 'ครึ่งทางแล้ว ยังไหวอยู่ 😊' }
    : { mood: 'cheer', text: 'ประหยัดเก่งมาก! 🎉' };

  const editingBudget = editing ? budgetFor(editing.id) : undefined;

  if (!transactionsQuery) {
    return <div className="page"><PageSkeleton variant="list" /></div>;
  }

  return (
    <div className="page">
      <h1 className="page-title">งบประมาณ</h1>
      <div className="card budget-pet">
        <Mascot mood={pet.mood} size={76} />
        <div className="budget-pet-main">
          <div className="budget-pet-bubble">{pet.text}</div>
          {totalLimit > 0 && (
            <>
              <div className="budget-pet-sub">ใช้ไป {formatCurrency(totalSpent)} / {formatCurrency(totalLimit)}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(usedPct * 100, 100)}%`, background: progressColor(totalSpent, totalLimit) }} />
              </div>
            </>
          )}
        </div>
      </div>
      <GoalsSection />
      <div className="section-title">งบรายหมวด</div>
      <div className="card">
        {categories.length === 0 && <div className="empty-state">ยังไม่มีหมวดหมู่รายจ่าย</div>}
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
                  {b ? formatCurrency(b.monthlyLimit) : 'ตั้งงบ'}
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
