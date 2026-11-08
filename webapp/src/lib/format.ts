export function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Machine-readable date for the Google Sheets backup. Must stay parseable by
// `new Date(str)` so sheets/import.ts can read rows back; don't localize it.
export function formatSheetDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

// Value for <input type="datetime-local">, in local time (not UTC).
export function toDatetimeLocalValue(date: Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatMonth(date: Date): string {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
}

export function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfMonth(date: Date): number {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
