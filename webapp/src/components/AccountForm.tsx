import { useState } from 'react';
import { Modal } from './Modal';
import { addAccount } from '../db/transactionManager';
import type { AccountType } from '../db/db';

const TYPES: AccountType[] = ['cash', 'bank', 'credit'];

export function AccountForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [initialBalance, setInitialBalance] = useState('');

  async function save() {
    if (!name) return;
    await addAccount(name, accountType, parseFloat(initialBalance) || 0);
    onClose();
  }

  return (
    <Modal title="New Account" onCancel={onClose} onSave={save} saveDisabled={!name}>
      <div className="form-section">
        <div className="form-section-title">Account Details</div>
        <div className="form-field">
          <div className="form-row">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. KBank" />
          </div>
          <div className="form-row">
            <label>Type</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Initial Balance</label>
            <input type="number" inputMode="decimal" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
