import { useState } from 'react';
import { Modal } from './Modal';
import { addAccount, updateAccount } from '../db/transactionManager';
import type { Account, AccountType } from '../db/db';

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
    <Modal title={existing ? 'Edit Account' : 'New Account'} onCancel={onClose} onSave={save} saveDisabled={!name}>
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
        {existing && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            Changing initial balance adjusts current balance by the same amount.
          </div>
        )}
      </div>
    </Modal>
  );
}
