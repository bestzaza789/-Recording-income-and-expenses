import type { ReactNode } from 'react';
import { useSheetClose } from '../lib/useSheetClose';

interface WizardShellProps {
  title: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function WizardShell({ title, step, totalSteps, onBack, onCancel, children }: WizardShellProps) {
  const { closing, close } = useSheetClose(onCancel);

  return (
    <div className={`modal-overlay${closing ? ' is-closing' : ''}`} onClick={close}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {onBack ? <button onClick={onBack}>‹ ย้อนกลับ</button> : <span style={{ width: 60 }} />}
          <h2>{title}</h2>
          <button onClick={close}>ยกเลิก</button>
        </div>
        <div className="wizard-dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span key={i} className={`wizard-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
        <div className="wizard-step" key={step}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function WizardOption({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="wizard-option" onClick={onClick}>
      {children}
    </button>
  );
}
