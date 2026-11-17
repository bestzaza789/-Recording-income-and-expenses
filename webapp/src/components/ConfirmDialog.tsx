import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { registerConfirmHost, type ConfirmRequest } from '../lib/confirm';

const EXIT_MS = 200;

export function ConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [closing, setClosing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      registerConfirmHost((next) => {
        setRequest((current) => {
          current?.resolve(false);
          return next;
        });
        setClosing(false);
      }),
    []
  );

  function finish(ok: boolean) {
    if (!request || closing) return;
    request.resolve(ok);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setRequest(null);
      return;
    }
    setClosing(true);
    const id = request.id;
    window.setTimeout(() => setRequest((current) => (current?.id === id ? null : current)), EXIT_MS);
  }

  useEffect(() => {
    if (!request) return;
    // Destructive dialogs start on Cancel so a stray Enter can't delete anything.
    (request.tone === 'danger' ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!request) return null;

  const tone = request.tone ?? 'default';
  const Icon = tone === 'danger' ? Trash2 : tone === 'alert' ? Info : AlertTriangle;

  return (
    <div className={`confirm-overlay${closing ? ' is-closing' : ''}`} onClick={() => finish(false)}>
      <div
        className={`confirm-card tone-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={request.message ? 'confirm-message' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="confirm-icon" aria-hidden="true"><Icon size={26} strokeWidth={2.2} /></span>
        <h2 id="confirm-title" className="confirm-title">{request.title}</h2>
        {request.message && <p id="confirm-message" className="confirm-message">{request.message}</p>}
        <div className="confirm-actions">
          {tone !== 'alert' && (
            <button ref={cancelRef} type="button" className="confirm-btn cancel" onClick={() => finish(false)}>
              {request.cancelLabel ?? 'ยกเลิก'}
            </button>
          )}
          <button ref={confirmRef} type="button" className={`confirm-btn ok tone-${tone}`} onClick={() => finish(true)}>
            {request.confirmLabel ?? 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
}
