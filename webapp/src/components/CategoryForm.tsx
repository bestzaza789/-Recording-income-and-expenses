import { useState } from 'react';
import { Modal } from './Modal';
import { db, newId, type Category, type CategoryType } from '../db/db';
import { CategoryIcon, ICON_NAMES } from '../lib/icons';
import { scheduleAutoSync } from '../lib/autoSync';

const COLORS = ['FF3B30', 'FF9500', 'FFCC00', '34C759', '007AFF', '5856D6', 'FF2D55', '8E8E93'];

export function CategoryForm({ defaultType, onClose, existing }: { defaultType: CategoryType; onClose: () => void; existing?: Category }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<CategoryType>(existing?.type ?? defaultType);
  const [icon, setIcon] = useState(existing?.iconName ?? ICON_NAMES[0]);
  const [color, setColor] = useState(existing?.hexColor ?? COLORS[4]);

  async function save() {
    if (!name) return;
    if (existing) {
      await db.categories.update(existing.id, { name, type, iconName: icon, hexColor: color });
    } else {
      await db.categories.add({ id: newId(), name, type, iconName: icon, hexColor: color });
    }
    scheduleAutoSync();
    onClose();
  }

  return (
    <Modal title={existing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'} onCancel={onClose} onSave={save} saveDisabled={!name}>
      <div className="form-section">
        <div className="form-section-title">รายละเอียด</div>
        <div className="form-field">
          <div className="form-row">
            <label>ชื่อ</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น อาหาร" />
          </div>
          <div className="form-row">
            <label>ประเภท</label>
            <select value={type} onChange={(e) => setType(e.target.value as CategoryType)}>
              <option value="expense">รายจ่าย</option>
              <option value="income">รายรับ</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">สีและไอคอน</div>
        <div className="color-swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch${color === c ? ' selected' : ''}`}
              style={{ background: `#${c}` }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="icon-picker">
          {ICON_NAMES.map((iconName) => (
            <button
              key={iconName}
              className={`icon-choice${icon === iconName ? ' selected' : ''}`}
              onClick={() => setIcon(iconName)}
            >
              <CategoryIcon name={iconName} />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
