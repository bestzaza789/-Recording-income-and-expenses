import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Category, CategoryType } from '../../db/db';
import { CategoryIcon } from '../../lib/icons';

interface Props {
  expenseCategories: Category[];
  incomeCategories: Category[];
  onEdit: (type: CategoryType, existing: Category) => void;
  onAdd: (type: CategoryType) => void;
  onDelete: (id: string) => void;
}

function CategoryGroup({ title, categories, onEdit, onAdd, onDelete }: {
  title: string;
  categories: Category[];
  onEdit: (existing: Category) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card" style={{ marginTop: title === 'Expense' ? 0 : 16 }}>
      <div className="section-title" style={{ marginTop: 0 }}>{title}</div>
      {categories.map((c) => (
        <div className="list-item" key={c.id}>
          <div className="icon-label-row">
            <CategoryIcon name={c.iconName} color={`#${c.hexColor}`} />
            {c.name}
          </div>
          <div>
            <button className="icon-btn" onClick={() => onEdit(c)}><Pencil size={14} /></button>
            <button className="delete-btn" onClick={() => onDelete(c.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={onAdd}>
        <Plus size={16} /> Add {title} Category
      </button>
    </div>
  );
}

export function CategoriesSection({ expenseCategories, incomeCategories, onEdit, onAdd, onDelete }: Props) {
  return (
    <>
      <CategoryGroup
        title="Expense"
        categories={expenseCategories}
        onEdit={(existing) => onEdit('expense', existing)}
        onAdd={() => onAdd('expense')}
        onDelete={onDelete}
      />
      <CategoryGroup
        title="Income"
        categories={incomeCategories}
        onEdit={(existing) => onEdit('income', existing)}
        onAdd={() => onAdd('income')}
        onDelete={onDelete}
      />
    </>
  );
}
