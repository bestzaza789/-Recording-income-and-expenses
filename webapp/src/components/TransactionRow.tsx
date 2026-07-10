import { Pencil } from 'lucide-react';
import type { Account, Category, Transaction } from '../db/db';
import { CategoryIcon, TransferIcon } from '../lib/icons';
import { formatCurrency, formatDate } from '../lib/format';

interface Props {
  transaction: Transaction;
  category?: Category;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function TransactionRow({ transaction, category, onDelete, onEdit }: Props) {
  const sign = transaction.transactionType === 'expense' ? '-' : transaction.transactionType === 'income' ? '+' : '';
  const title = category?.name || transaction.note || capitalize(transaction.transactionType);

  return (
    <div className="tx-row">
      <div className="tx-icon" style={{ color: category ? `#${category.hexColor}` : undefined }}>
        {transaction.transactionType === 'transfer' && !category ? (
          <TransferIcon />
        ) : (
          <CategoryIcon name={category?.iconName} />
        )}
      </div>
      <div className="tx-main">
        <div className="tx-title">{title}</div>
        <div className="tx-date">{formatDate(transaction.date)}</div>
      </div>
      <div className={`tx-amount ${transaction.transactionType}`}>
        {sign}{formatCurrency(transaction.amount)}
      </div>
      {onEdit && (
        <button className="icon-btn" onClick={onEdit}><Pencil size={14} /></button>
      )}
      {onDelete && (
        <button className="delete-btn" onClick={onDelete}>Del</button>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function accountName(accounts: Account[] | undefined, id: string): string {
  return accounts?.find((a) => a.id === id)?.name ?? '';
}
