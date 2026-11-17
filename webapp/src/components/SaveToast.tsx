import { useEffect, useState } from 'react';
import { SAVED_HOLD_MS, subscribeSaved } from '../lib/saveFeedback';

type Phase = 'hold' | 'linger' | 'leaving';

const LINGER_MS = 500;
const LEAVE_MS = 260;

export function SaveToast() {
  const [toast, setToast] = useState<{ id: number; message: string; phase: Phase } | null>(null);

  useEffect(() => subscribeSaved((message) => setToast({ id: Date.now(), message, phase: 'hold' })), []);

  useEffect(() => {
    if (!toast) return;
    const delay = toast.phase === 'hold' ? SAVED_HOLD_MS : toast.phase === 'linger' ? LINGER_MS : LEAVE_MS;
    const timer = window.setTimeout(() => {
      setToast((current) => {
        if (!current || current.id !== toast.id) return current;
        if (current.phase === 'hold') return { ...current, phase: 'linger' };
        if (current.phase === 'linger') return { ...current, phase: 'leaving' };
        return null;
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <>
      {/* Swallows taps while the sheet below is about to close, so Save can't fire twice. */}
      {toast.phase === 'hold' && <div className="save-toast-blocker" />}
      <div className={`save-toast${toast.phase === 'leaving' ? ' is-leaving' : ''}`} role="status" aria-live="polite" key={toast.id}>
        <svg className="save-toast-mark" viewBox="0 0 52 52" aria-hidden="true">
          <circle className="save-toast-ring" cx="26" cy="26" r="23" fill="none" />
          <path className="save-toast-check" d="M15 27l7.5 7.5L37.5 19" fill="none" />
        </svg>
        <span className="save-toast-text">{toast.message}</span>
      </div>
    </>
  );
}
