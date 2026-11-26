export interface ParsedData {
  amount?: number;
  accountKeyword?: string;
  categoryKeyword?: string;
  // Digits of each masked account number in reading order (e.g. "xxx-x-x1234-x" → "1234").
  // On a transfer slip the first is the sender, the second the receiver.
  accountSuffixes: string[];
  // Banks in the order they first appear (sender's bank usually first).
  bankKeywords: string[];
  // Person names (lines starting with a title such as นาย / MR.) in reading order.
  names: string[];
  // Sender and receiver are the same person → most likely a move between own accounts.
  sameName: boolean;
  // Transfer date/time printed on the slip (local time), when it could be read.
  date?: Date;
  rawText: string;
}

// Bank keyword → value matched (lowercased substring) against account names.
const BANKS: { keyword: string; patterns: string[] }[] = [
  { keyword: 'kbank', patterns: ['kbank', 'k plus', 'k+', 'กสิกร'] },
  { keyword: 'scb', patterns: ['scb', 'ไทยพาณิชย์'] },
  { keyword: 'krungthai', patterns: ['krungthai', 'krung thai', 'กรุงไทย'] },
  { keyword: 'bbl', patterns: ['bangkok bank', 'bualuang', 'กรุงเทพ'] },
  { keyword: 'krungsri', patterns: ['krungsri', 'กรุงศรี'] },
  { keyword: 'ttb', patterns: ['ttb', 'ทีทีบี', 'ทหารไทยธนชาต'] },
  { keyword: 'gsb', patterns: ['gsb', 'mymo', 'ออมสิน'] },
];

// Parse raw slip text (from tesseract or iOS Live Text) into a best-effort guess.
export function parseExtractedText(text: string): ParsedData {
  const names = extractNames(text);
  const data: ParsedData = {
    rawText: text,
    accountSuffixes: extractAccountSuffixes(text),
    bankKeywords: [],
    names,
    sameName: names.length >= 2 && sameName(names[0], names[1]),
    date: extractDate(text),
  };

  // Prefer a number labelled as the amount; fall back to the first money-looking number.
  const labelled = text.match(/(?:จำนวน(?:เงิน)?|amount)[^\d]{0,20}(\d[\d,]*\.\d{2})/i);
  const anyAmount = text.match(/\d{1,3}(,\d{3})*\.\d{2}/);
  const amountStr = labelled?.[1] ?? anyAmount?.[0];
  if (amountStr) {
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (amount > 0) data.amount = amount;
  }

  const lower = text.toLowerCase();

  // A slip names both sender and receiver banks; the sender comes first.
  const bankPositions: { keyword: string; index: number }[] = [];
  for (const bank of BANKS) {
    const indexes = bank.patterns.map((p) => lower.indexOf(p)).filter((i) => i !== -1);
    if (indexes.length) bankPositions.push({ keyword: bank.keyword, index: Math.min(...indexes) });
  }
  data.bankKeywords = bankPositions.sort((a, b) => a.index - b.index).map((b) => b.keyword);
  data.accountKeyword = data.bankKeywords[0];

  if (lower.includes('7-eleven') || lower.includes('grab') || lower.includes('lotus')) {
    data.categoryKeyword = 'food';
  } else if (lower.includes('ptt') || lower.includes('ปั๊ม') || lower.includes('mrt') || lower.includes('bts')) {
    data.categoryKeyword = 'transport';
  }

  return data;
}

// True when an account's name refers to the bank identified by `keyword`
// (e.g. an account named "กสิกร" or "KBank" matches 'kbank').
export function accountMatchesBank(accountName: string, keyword: string): boolean {
  const name = accountName.toLowerCase();
  const bank = BANKS.find((b) => b.keyword === keyword);
  return name.includes(keyword) || !!bank?.patterns.some((p) => name.includes(p));
}

// Masked account / PromptPay numbers look like "xxx-x-x1234-x", "XXX-XXX-5678" or
// "xxxxxx1234": a run of x/*/• mixed with digits. Dates, times and reference
// numbers never contain the mask characters, so they're ignored.
function extractAccountSuffixes(text: string): string[] {
  const tokens = text.match(/[xX*•\d][xX*•\d -]{4,}[xX*•\d]/g) ?? [];
  const suffixes: string[] = [];
  for (const token of tokens) {
    if (!/[xX*•]/.test(token)) continue;
    const digits = token.replace(/\D/g, '');
    if (digits.length >= 3 && digits.length <= 6) suffixes.push(digits);
  }
  return suffixes;
}

const TITLE = /^(นางสาว|นาง|นาย|น\.ส\.|ด\.ช\.|ด\.ญ\.|mrs\.?|mr\.?|ms\.?|miss)\s*/i;

function extractNames(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => TITLE.test(line))
    .map((line) => line.replace(TITLE, '').trim())
    .filter((name) => name.length >= 2);
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\u0E00-\u0E7F]/g, '');
}

// Banks often truncate the surname ("สมชาย ใ" vs "สมชาย ใจดี"), so a prefix match counts.
function sameName(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (x.length < 3 || y.length < 3) return false;
  return x === y || x.startsWith(y) || y.startsWith(x);
}

// Month names as they appear on Thai bank slips, with dots and spaces removed
// ("พ.ย." → "พย"), plus English abbreviations. Full names match by prefix.
const THAI_MONTHS = ['มค', 'กพ', 'มีค', 'เมย', 'พค', 'มิย', 'กค', 'สค', 'กย', 'ตค', 'พย', 'ธค'];
const THAI_MONTHS_FULL = ['มกรา', 'กุมภา', 'มีนา', 'เมษา', 'พฤษภา', 'มิถุนา', 'กรกฎา', 'สิงหา', 'กันยา', 'ตุลา', 'พฤศจิกา', 'ธันวา'];
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function monthIndex(token: string): number {
  const t = token.toLowerCase().replace(/[.\s]/g, '');
  let i = THAI_MONTHS.indexOf(t);
  if (i === -1) i = THAI_MONTHS_FULL.findIndex((m) => t.startsWith(m));
  if (i === -1 && t.length >= 3) i = EN_MONTHS.indexOf(t.slice(0, 3));
  return i;
}

// Slips print the Buddhist-era year, either in full (2569) or as two digits (69);
// some English-language slips use the Gregorian year (2026 / 26).
function normalizeYear(raw: string): number {
  const y = parseInt(raw, 10);
  if (raw.length <= 2) return y >= 50 ? 2500 + y - 543 : 2000 + y;
  return y > 2400 ? y - 543 : y;
}

// Finds the transfer date and time, e.g. "26 พ.ย. 69 10:39 น.", "26 พ.ย. 2569 - 10:39",
// "26 Nov 2026, 10:39" or "26/11/2569 10:39:12". Returns undefined when no
// plausible date is found, so the caller can fall back to another date.
function extractDate(text: string): Date | undefined {
  const named = /(\d{1,2})\s*([ก-๙][ก-๙.\s]{1,10}?\.?|[A-Za-z]{3,9}\.?)\s*(\d{4}|\d{2})(?!\d)/g;
  const numeric = /(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})(?!\d)/g;
  const candidates: { index: number; end: number; day: number; month: number; year: number }[] = [];
  for (const m of text.matchAll(named)) {
    const month = monthIndex(m[2]);
    if (month !== -1) candidates.push({ index: m.index!, end: m.index! + m[0].length, day: +m[1], month, year: normalizeYear(m[3]) });
  }
  for (const m of text.matchAll(numeric)) {
    candidates.push({ index: m.index!, end: m.index! + m[0].length, day: +m[1], month: +m[2] - 1, year: normalizeYear(m[3]) });
  }
  candidates.sort((a, b) => a.index - b.index);

  const latest = Date.now() + 24 * 60 * 60 * 1000;
  for (const c of candidates) {
    if (c.month < 0 || c.month > 11 || c.day < 1 || c.day > new Date(c.year, c.month + 1, 0).getDate()) continue;
    // The time follows the date closely ("- 10:39", ", 10:39 น.").
    const time = text.slice(c.end, c.end + 20).match(/(?:^|[^\d])([01]?\d|2[0-3])[:.]([0-5]\d)(?:[:.]([0-5]\d))?(?!\d)/);
    const date = time
      ? new Date(c.year, c.month, c.day, +time[1], +time[2], time[3] ? +time[3] : 0)
      : new Date(c.year, c.month, c.day, 12, 0, 0);
    if (date.getTime() <= latest && c.year >= 2000) return date;
  }
  return undefined;
}
