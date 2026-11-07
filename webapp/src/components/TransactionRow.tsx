import { Pencil } from 'lucide-react';
import type { Category, Transaction } from '../db/db';
import { CategoryIcon, TransferIcon } from '../lib/icons';
import { formatCurrency, formatDateTime } from '../lib/format';
import { TRANSACTION_TYPE_LABEL } from '../lib/labels';

interface Props {
  transaction: Transaction;
  category?: Category;
  onDelete?: () => void;
  onEdit?: () => void;
  runningBalance?: number;
  deltaOverride?: number;
}

export function TransactionRow({ transaction, category, onDelete, onEdit, runningBalance, deltaOverride }: Props) {
  const hasOverride = deltaOverride !== undefined;
  const sign = hasOverride
    ? (deltaOverride! > 0 ? '+' : deltaOverride! < 0 ? '-' : '')
    : (transaction.transactionType === 'expense' ? '-' : transaction.transactionType === 'income' ? '+' : '');
  const amountClass = hasOverride
    ? (deltaOverride! > 0 ? 'income' : deltaOverride! < 0 ? 'expense' : 'transfer')
    : transaction.transactionType;
  const displayAmount = hasOverride ? Math.abs(deltaOverride!) : transaction.amount;
  const title = category?.name || transaction.note || TRANSACTION_TYPE_LABEL[transaction.transactionType];

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
        <div className="tx-date">{formatDateTime(transaction.date)}</div>
      </div>
      <div>
        <div className={`tx-amount ${amountClass}`} style={{ textAlign: 'right' }}>
          {sign}{formatCurrency(displayAmount)}
        </div>
        {runningBalance !== undefined && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right' }}>
            คงเหลือ {formatCurrency(runningBalance)}
          </div>
        )}
      </div>
      {onEdit && (
        <button className="icon-btn" onClick={onEdit}><Pencil size={14} /></button>
      )}
      {onDelete && (
        <button className="delete-btn" onClick={onDelete}>ลบ</button>
      )}
    </div>
  );
}
