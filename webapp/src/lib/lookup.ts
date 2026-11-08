import type { Account, Category } from '../db/db';

export function categoryFor(categories: Category[], id?: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function accountFor(accounts: Account[], id?: string): Account | undefined {
  return accounts.find((a) => a.id === id);
}

export function accountNameFor(accounts: Account[], id?: string): string {
  return accountFor(accounts, id)?.name ?? '';
}

/** Accounts in the user's chosen display order (set by drag-and-drop in Management). */
export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort(
    (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
  );
}

export function nextAccountSortOrder(accounts: Account[]): number {
  return accounts.reduce((max, a) => Math.max(max, a.sortOrder ?? -1), -1) + 1;
}
