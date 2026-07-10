import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { ScannedTransactionForm } from './ScannedTransactionForm';
import { recognizeSlip, type ParsedData } from '../ocr/ocrService';
import { ImageIcon, Upload } from 'lucide-react';

export function SlipScanner({ onClose }: { onClose: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setProcessing(true);
    setProgress(0);
    try {
      const data = await recognizeSlip(file, setProgress);
      setParsedData(data);
    } finally {
      setProcessing(false);
    }
  }

  if (parsedData) {
    return <ScannedTransactionForm parsedData={parsedData} onClose={onClose} />;
  }

  return (
    <Modal title="Slip Scanner" onCancel={onClose}>
      <div className="scanner-drop">
        {preview ? (
          <img src={preview} alt="Slip preview" className="scanner-preview" />
        ) : (
          <ImageIcon size={80} color="var(--text-secondary)" />
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button className="upload-btn" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> Select Slip Image
        </button>

        {processing && <div>Analyzing Slip... {progress}%</div>}
      </div>
    </Modal>
  );
}
