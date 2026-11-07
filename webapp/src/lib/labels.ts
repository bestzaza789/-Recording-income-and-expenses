import type { AccountType, TransactionType } from '../db/db';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: 'เงินสด',
  bank: 'บัญชีธนาคาร',
  credit: 'บัตรเครดิต',
};

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: 'รายรับ',
  expense: 'รายจ่าย',
  transfer: 'โอนเงิน',
};
