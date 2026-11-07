import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  children: ReactNode;
}

export function Modal({ title, onCancel, onSave, saveDisabled, saveLabel = 'บันทึก', children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button onClick={onCancel}>ยกเลิก</button>
          <h2>{title}</h2>
          {onSave ? (
            <button className="save" onClick={onSave} disabled={saveDisabled}>
              {saveLabel}
            </button>
          ) : (
            <span style={{ width: 40 }} />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
