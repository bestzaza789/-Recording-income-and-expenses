import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Account } from '../../db/db';
import { formatCurrency } from '../../lib/format';

interface Props {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function AccountsSection({ accounts, onEdit, onDelete, onAdd }: Props) {
  const navigate = useNavigate();

  return (
    <div className="card">
      {accounts.length === 0 && <div className="empty-state">No accounts yet.</div>}
      {accounts.map((a) => (
        <div className="list-item" key={a.id}>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/account/${a.id}`)}>
            <div style={{ fontWeight: 600 }}>{a.name}</div>
            <div className="text-secondary-sm">{a.accountType} · {formatCurrency(a.currentBalance)}</div>
          </div>
          <div>
            <button className="icon-btn" onClick={() => onEdit(a)}><Pencil size={14} /></button>
            <button className="delete-btn" onClick={() => onDelete(a.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={onAdd}>
        <Plus size={16} /> Add Account
      </button>
    </div>
  );
}
