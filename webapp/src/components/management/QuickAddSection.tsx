import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Bookmark, Category } from '../../db/db';
import { CategoryIcon } from '../../lib/icons';
import { formatCurrency } from '../../lib/format';
import { categoryFor } from '../../lib/lookup';

interface Props {
  bookmarks: Bookmark[];
  categories: Category[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function QuickAddSection({ bookmarks, categories, onEdit, onDelete, onAdd }: Props) {
  return (
    <div className="card">
      <div className="text-secondary-sm" style={{ marginBottom: 12 }}>
        One-tap presets for recurring but irregularly-timed spends (e.g. commute, regular meal) — shown on the Dashboard.
      </div>
      {bookmarks.length === 0 && <div className="empty-state">No quick-add presets yet.</div>}
      {bookmarks.map((b) => {
        const category = categoryFor(categories, b.categoryId);
        return (
          <div className="list-item" key={b.id}>
            <div className="icon-label-row">
              <CategoryIcon name={category?.iconName} color={category ? `#${category.hexColor}` : undefined} />
              <div>
                <div style={{ fontWeight: 600 }}>{b.name}</div>
                <div className="text-secondary-sm">{b.type} · {formatCurrency(b.amount)}</div>
              </div>
            </div>
            <div>
              <button className="icon-btn" onClick={() => onEdit(b)}><Pencil size={14} /></button>
              <button className="delete-btn" onClick={() => onDelete(b.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
      <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={onAdd}>
        <Plus size={16} /> Add Quick Add Preset
      </button>
    </div>
  );
}
