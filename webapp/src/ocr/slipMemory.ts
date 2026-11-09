// Remembers which of the user's accounts a masked account number on a slip
// belongs to, learned from what the user confirms in ScannedTransactionForm.
// Lets the form recognise "transfer to my own account" and pick the right
// source account next time. Per-device (localStorage), best-effort.
const KEY = 'slipAccountMemory';

type Memory = Record<string, string>; // account-number digits → Account.id

function load(): Memory {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Memory;
  } catch {
    return {};
  }
}

function save(memory: Memory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // storage full or blocked — learning is optional
  }
}

export function accountForSuffix(suffix: string | undefined): string | undefined {
  return suffix ? load()[suffix] : undefined;
}

export function rememberSuffix(suffix: string | undefined, accountId: string) {
  if (!suffix) return;
  const memory = load();
  memory[suffix] = accountId;
  save(memory);
}

export function forgetSuffix(suffix: string | undefined) {
  if (!suffix) return;
  const memory = load();
  if (!(suffix in memory)) return;
  delete memory[suffix];
  save(memory);
}
