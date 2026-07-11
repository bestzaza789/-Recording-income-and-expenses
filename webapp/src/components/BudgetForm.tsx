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
