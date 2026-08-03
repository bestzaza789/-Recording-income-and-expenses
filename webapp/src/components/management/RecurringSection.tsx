import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Account, Category, RecurringRule } from '../../db/db';
import { CategoryIcon } from '../../lib/icons';
import { formatCurrency } from '../../lib/format';
import { categoryFor, accountFor } from '../../lib/lookup';

interface Props {
  recurringRules: RecurringRule[];
  categories: Category[];
  accounts: Account[];
  onEdit: (rule: RecurringRule) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function RecurringSection({ recurringRules, categories, accounts, onEdit, onDelete, onAdd }: Props) {
  return (
    <div className="card">
      {recurringRules.length === 0 && <div className="empty-state">No recurring transactions yet.</div>}
      {recurringRules.map((r) => {
        const category = categoryFor(categories, r.categoryId);
        const account = accountFor(accounts, r.accountId);
        return (
          <div className="list-item" key={r.id}>
            <div className="icon-label-row">
              <CategoryIcon name={category?.iconName} color={category ? `#${category.hexColor}` : undefined} />
              <div>
                <div style={{ fontWeight: 600 }}>{r.note || category?.name || 'Recurring'}</div>
                <div className="text-secondary-sm">
                  {formatCurrency(r.amount)} · day {r.dayOfMonth} · {account?.name ?? 'Unknown account'}
                </div>
              </div>
            </div>
            <div>
              <button className="icon-btn" onClick={() => onEdit(r)}><Pencil size={14} /></button>
              <button className="delete-btn" onClick={() => onDelete(r.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
      <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={onAdd}>
        <Plus size={16} /> Add Recurring
      </button>
    </div>
  );
}
