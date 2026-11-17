import { useEffect, useId, useState } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';
import { stagger } from '../lib/motion';

export interface SpeedDialAction {
  key: string;
  label: string;
  Icon: LucideIcon;
  onSelect: () => void;
}

/** Floating + button that fans out its actions above it. `actions` are listed top to bottom. */
export function SpeedDial({ actions }: { actions: SpeedDialAction[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className={`speed-dial-backdrop${open ? ' is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <div className={`speed-dial${open ? ' is-open' : ''}`}>
        <ul className="speed-dial-actions" id={menuId} inert={!open}>
          {actions.map((a, i) => (
            <li key={a.key} style={stagger(actions.length - 1 - i)}>
              <button
                type="button"
                className="speed-dial-action"
                onClick={() => {
                  setOpen(false);
                  a.onSelect();
                }}
              >
                <span className="speed-dial-label">{a.label}</span>
                <span className="speed-dial-icon"><a.Icon size={20} strokeWidth={2.2} /></span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="fab"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'ปิดเมนูเพิ่มรายการ' : 'เพิ่มรายการ'}
          onClick={() => setOpen((o) => !o)}
        >
          <Plus size={28} strokeWidth={2.4} className="fab-icon" />
        </button>
      </div>
    </>
  );
}
