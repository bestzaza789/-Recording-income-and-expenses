import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Bookmark, Category } from '../../db/db';
import { CategoryIcon } from '../../lib/icons';
import { formatCurrency } from '../../lib/format';
import { TRANSACTION_TYPE_LABEL } from '../../lib/labels';
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
        ปุ่มบันทึกแตะเดียวสำหรับรายการที่ใช้บ่อยแต่ไม่ได้มีวันแน่นอน (เช่น ค่าเดินทาง ค่าข้าว) — แสดงที่หน้าหลัก
      </div>
      {bookmarks.length === 0 && <div className="empty-state">ยังไม่มีรายการด่วน</div>}
      {bookmarks.map((b) => {
        const category = categoryFor(categories, b.categoryId);
        return (
          <div className="list-item" key={b.id}>
            <div className="icon-label-row">
              <CategoryIcon name={category?.iconName} color={category ? `#${category.hexColor}` : undefined} />
              <div>
                <div style={{ fontWeight: 600 }}>{b.name}</div>
                <div className="text-secondary-sm">{TRANSACTION_TYPE_LABEL[b.type]} · {formatCurrency(b.amount)}</div>
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
        <Plus size={16} /> เพิ่มรายการด่วน
      </button>
    </div>
  );
}
