import { Banknote, CreditCard, Landmark, type LucideIcon } from 'lucide-react';
import type { Account } from '../db/db';

const PALETTES: [string, string][] = [
  ['#065f46', '#10b981'],
  ['#4c1d95', '#8b5cf6'],
  ['#1e293b', '#64748b'],
  ['#1e3a8a', '#3b82f6'],
  ['#9f1239', '#f43f5e'],
  ['#9a3412', '#f59e0b'],
];

// Derived from the name (not the id) so a card keeps its colour across
// devices and Google Sheets re-imports, which mint new ids.
function paletteFor(account: Pick<Account, 'name'>): [string, string] {
  let seed = 0;
  for (const ch of account.name) seed = (seed * 31 + ch.codePointAt(0)!) >>> 0;
  return PALETTES[seed % PALETTES.length];
}

export function accountCardStyle(account: Pick<Account, 'name'>): Record<string, string> {
  const [from, to] = paletteFor(account);
  return { '--card-from': from, '--card-to': to };
}

export const ACCOUNT_TYPE_ICON: Record<Account['accountType'], LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  credit: CreditCard,
};
