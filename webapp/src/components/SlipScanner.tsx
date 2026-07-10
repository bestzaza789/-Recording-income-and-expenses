import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { ScannedTransactionForm } from './ScannedTransactionForm';
import { recognizeSlip, type ParsedData } from '../ocr/ocrService';
import { ImageIcon, Upload } from 'lucide-react';

export function SlipScanner({ onClose }: { onClose: () => void }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [fileIndex, setFileIndex] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ParsedData[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    setPreviews(files.map((f) => URL.createObjectURL(f)));
    setFileCount(files.length);
    setProcessing(true);

    const parsed: ParsedData[] = [];
    for (let i = 0; i < files.length; i++) {
      setFileIndex(i);
      setProgress(0);
      const data = await recognizeSlip(files[i], setProgress);
      parsed.push(data);
    }

    setResults(parsed);
    setProcessing(false);
  }

  function advanceReview() {
    if (reviewIndex + 1 >= results.length) {
      onClose();
    } else {
      setReviewIndex(reviewIndex + 1);
    }
  }

  if (results.length > 0) {
    return (
      <ScannedTransactionForm
        parsedData={results[reviewIndex]}
        onClose={advanceReview}
        titleSuffix={results.length > 1 ? ` (${reviewIndex + 1} of ${results.length})` : undefined}
      />
    );
  }

  return (
    <Modal title="Slip Scanner" onCancel={onClose}>
      <div className="scanner-drop">
        {previews.length > 0 ? (
          <div className="scanner-thumbs">
            {previews.map((src, i) => (
              <img key={i} src={src} alt={`Slip ${i + 1}`} className={`scanner-thumb${processing && i === fileIndex ? ' active' : ''}`} />
            ))}
          </div>
        ) : (
          <ImageIcon size={80} color="var(--text-secondary)" />
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button className="upload-btn" onClick={() => inputRef.current?.click()} disabled={processing}>
          <Upload size={16} /> Select Slip Image(s)
        </button>

        {processing && (
          <div>
            Analyzing slip {fileIndex + 1} of {fileCount}... {progress}%
          </div>
        )}
      </div>
    </Modal>
  );
}
