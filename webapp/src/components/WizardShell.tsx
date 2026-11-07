import type { ReactNode } from 'react';

interface WizardShellProps {
  title: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function WizardShell({ title, step, totalSteps, onBack, onCancel, children }: WizardShellProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {onBack ? <button onClick={onBack}>‹ ย้อนกลับ</button> : <span style={{ width: 60 }} />}
          <h2>{title}</h2>
          <button onClick={onCancel}>ยกเลิก</button>
        </div>
        <div className="wizard-dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span key={i} className={`wizard-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
        {children}
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
