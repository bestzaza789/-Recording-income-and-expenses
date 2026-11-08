import Tesseract from 'tesseract.js';

import { parseExtractedText, type ParsedData } from './parseSlip';

export type { ParsedData };

export async function recognizeSlip(image: File | Blob, onProgress?: (pct: number) => void): Promise<ParsedData> {
  const { data } = await Tesseract.recognize(image, 'tha+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });

  return parseExtractedText(data.text);
}
