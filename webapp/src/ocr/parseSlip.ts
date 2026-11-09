export interface ParsedData {
  amount?: number;
  accountKeyword?: string;
  categoryKeyword?: string;
  // Digits of each masked account number in reading order (e.g. "xxx-x-x1234-x" → "1234").
  // On a transfer slip the first is the sender, the second the receiver.
  accountSuffixes: string[];
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
  const data: ParsedData = { rawText: text, accountSuffixes: extractAccountSuffixes(text) };

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
  let firstIndex = Infinity;
  for (const bank of BANKS) {
    for (const p of bank.patterns) {
      const i = lower.indexOf(p);
      if (i !== -1 && i < firstIndex) {
        firstIndex = i;
        data.accountKeyword = bank.keyword;
      }
    }
  }

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
