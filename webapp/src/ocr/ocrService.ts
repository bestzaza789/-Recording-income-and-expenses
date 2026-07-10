import Tesseract from 'tesseract.js';

export interface ParsedData {
  amount?: number;
  accountKeyword?: string;
  categoryKeyword?: string;
  rawText: string;
}

export async function recognizeSlip(image: File | Blob, onProgress?: (pct: number) => void): Promise<ParsedData> {
  const { data } = await Tesseract.recognize(image, 'tha+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });

  return parseExtractedText(data.text);
}

function parseExtractedText(text: string): ParsedData {
  const data: ParsedData = { rawText: text };

  const amountMatch = text.match(/\d{1,3}(,\d{3})*\.\d{2}/);
  if (amountMatch) {
    data.amount = parseFloat(amountMatch[0].replace(/,/g, ''));
  }

  const lower = text.toLowerCase();

  if (lower.includes('kbank') || lower.includes('กสิกร')) {
    data.accountKeyword = 'kbank';
  } else if (lower.includes('scb') || lower.includes('ไทยพาณิชย์')) {
    data.accountKeyword = 'scb';
  }

  if (lower.includes('7-eleven') || lower.includes('grab') || lower.includes('lotus')) {
    data.categoryKeyword = 'food';
  } else if (lower.includes('ptt') || lower.includes('ปั๊ม') || lower.includes('mrt') || lower.includes('bts')) {
    data.categoryKeyword = 'transport';
  }

  return data;
}
