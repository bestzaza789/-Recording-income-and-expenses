import type { CSSProperties } from 'react';
import type { Account } from '../db/db';
import { formatCurrency } from '../lib/format';
import { accountCardStyle, ACCOUNT_TYPE_ICON } from '../lib/accountStyle';
import { useCountUp } from '../lib/useCountUp';

export function AccountCard({ account, index, onOpen }: { account: Account; index: number; onOpen: () => void }) {
  const balance = useCountUp(account.currentBalance);
  const Icon = ACCOUNT_TYPE_ICON[account.accountType] ?? ACCOUNT_TYPE_ICON.bank;

  return (
    <button
      type="button"
      className="account-card"
      style={{ ...accountCardStyle(account), '--i': index } as CSSProperties}
      onClick={onOpen}
    >
      <span className="account-card-top">
        <span className="name">{account.name}</span>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="balance">{formatCurrency(balance)}</span>
    </button>
  );
}
