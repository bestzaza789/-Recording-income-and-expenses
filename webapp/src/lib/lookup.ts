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
