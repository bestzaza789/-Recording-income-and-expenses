import type { ReactNode } from 'react';
import { useSheetClose } from '../lib/useSheetClose';

interface ModalProps {
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  children: ReactNode;
}

export function Modal({ title, onCancel, onSave, saveDisabled, saveLabel = 'บันทึก', children }: ModalProps) {
  const { closing, close } = useSheetClose(onCancel);

  return (
    <div className={`modal-overlay${closing ? ' is-closing' : ''}`} onClick={close}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button onClick={close}>ยกเลิก</button>
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
