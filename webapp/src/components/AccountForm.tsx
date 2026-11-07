import { useState } from 'react';
import { Modal } from './Modal';
import { addAccount, updateAccount } from '../db/transactionManager';
import type { Account, AccountType } from '../db/db';
import { ACCOUNT_TYPE_LABEL } from '../lib/labels';

const TYPES: AccountType[] = ['cash', 'bank', 'credit'];

export function AccountForm({ onClose, existing }: { onClose: () => void; existing?: Account }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [accountType, setAccountType] = useState<AccountType>(existing?.accountType ?? 'bank');
  const [initialBalance, setInitialBalance] = useState(existing ? String(existing.initialBalance) : '');

  async function save() {
    if (!name) return;
    if (existing) {
      await updateAccount(existing.id, name, accountType, parseFloat(initialBalance) || 0);
    } else {
      await addAccount(name, accountType, parseFloat(initialBalance) || 0);
    }
    onClose();
  }

  return (
    <Modal title={existing ? 'แก้ไขบัญชี' : 'เพิ่มบัญชี'} onCancel={onClose} onSave={save} saveDisabled={!name}>
      <div className="form-section">
        <div className="form-section-title">รายละเอียดบัญชี</div>
        <div className="form-field">
          <div className="form-row">
            <label>ชื่อ</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น กสิกร" />
          </div>
          <div className="form-row">
            <label>ประเภท</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>ยอดเริ่มต้น</label>
            <input type="number" inputMode="decimal" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        {existing && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            การแก้ยอดเริ่มต้นจะปรับยอดคงเหลือปัจจุบันตามจำนวนเดียวกัน
          </div>
        )}
      </div>
    </Modal>
  );
}
