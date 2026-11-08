import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, GripVertical } from 'lucide-react';
import type { Account } from '../../db/db';
import { formatCurrency } from '../../lib/format';
import { ACCOUNT_TYPE_LABEL } from '../../lib/labels';
import { reorderAccounts } from '../../db/transactionManager';

interface Props {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

interface DragState {
  id: string;
  startY: number;
  offsetY: number;
  /** Midpoints (clientY) of every row at drag start, in current order. */
  midpoints: number[];
  rowHeight: number;
}

export function AccountsSection({ accounts, onEdit, onDelete, onAdd }: Props) {
  const navigate = useNavigate();
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [drag, setDrag] = useState<DragState | null>(null);
  // Order shown while a drag is in progress (and until the DB write lands).
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);

  const byId = new Map(accounts.map((a) => [a.id, a]));
  const order = pendingOrder && pendingOrder.length === accounts.length && pendingOrder.every((id) => byId.has(id))
    ? pendingOrder
    : accounts.map((a) => a.id);
  const ordered = order.map((id) => byId.get(id)!);

  function onHandleDown(e: ReactPointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const ids = accounts.map((a) => a.id);
    const rects = ids.map((rid) => rowRefs.current.get(rid)!.getBoundingClientRect());
    setPendingOrder(ids);
    setDrag({
      id,
      startY: e.clientY,
      offsetY: 0,
      midpoints: rects.map((r) => r.top + r.height / 2),
      rowHeight: rects[ids.indexOf(id)].height,
    });
  }

  function onHandleMove(e: ReactPointerEvent) {
    if (!drag || !pendingOrder) return;
    const offsetY = e.clientY - drag.startY;
    const fromIndex = accounts.findIndex((a) => a.id === drag.id);
    const draggedMid = drag.midpoints[fromIndex] + offsetY;
    // Target slot = how many *other* rows' midpoints sit above the dragged row's midpoint.
    let target = 0;
    drag.midpoints.forEach((m, i) => {
      if (i !== fromIndex && m < draggedMid) target++;
    });
    const rest = accounts.map((a) => a.id).filter((id) => id !== drag.id);
    rest.splice(target, 0, drag.id);
    setDrag({ ...drag, offsetY });
    if (rest.join() !== pendingOrder.join()) setPendingOrder(rest);
  }

  async function onHandleUp() {
    if (!drag) return;
    const finalOrder = pendingOrder;
    setDrag(null);
    if (finalOrder && finalOrder.join() !== accounts.map((a) => a.id).join()) {
      // Keep pendingOrder set so the list doesn't flash back before the live query catches up.
      await reorderAccounts(finalOrder);
    }
  }

  // Where each row should visually sit relative to its natural (pre-drag) position.
  function translateFor(id: string): number {
    if (!drag) return 0;
    if (id === drag.id) return drag.offsetY;
    const from = accounts.findIndex((a) => a.id === id);
    const to = order.indexOf(id);
    return (to - from) * drag.rowHeight;
  }

  // While dragging, render rows in their original order and shift them with transforms,
  // so the row under the finger doesn't jump when the list reorders.
  const rows = drag ? accounts : ordered;

  return (
    <div className="card">
      {accounts.length === 0 && <div className="empty-state">ยังไม่มีบัญชี</div>}
      {accounts.length > 1 && (
        <div className="text-secondary-sm" style={{ padding: '0 4px 8px' }}>
          ลาก <GripVertical size={12} style={{ verticalAlign: 'middle' }} /> เพื่อเรียงลำดับบัญชีที่แสดงในหน้าหลัก
        </div>
      )}
      {rows.map((a) => {
        const isDragging = drag?.id === a.id;
        return (
          <div
            className={`list-item${isDragging ? ' list-item-dragging' : ''}`}
            key={a.id}
            ref={(el) => {
              if (el) rowRefs.current.set(a.id, el);
              else rowRefs.current.delete(a.id);
            }}
            style={{
              transform: `translateY(${translateFor(a.id)}px)`,
              transition: drag && !isDragging ? 'transform 150ms ease' : undefined,
              position: 'relative',
              zIndex: isDragging ? 2 : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {accounts.length > 1 && (
                <button
                  className="drag-handle"
                  aria-label={`ลากเพื่อย้าย ${a.name}`}
                  onPointerDown={(e) => onHandleDown(e, a.id)}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                >
                  <GripVertical size={18} />
                </button>
              )}
              <div style={{ cursor: 'pointer', minWidth: 0 }} onClick={() => navigate(`/account/${a.id}`)}>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div className="text-secondary-sm">{ACCOUNT_TYPE_LABEL[a.accountType]} · {formatCurrency(a.currentBalance)}</div>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <button className="icon-btn" onClick={() => onEdit(a)}><Pencil size={14} /></button>
              <button className="delete-btn" onClick={() => onDelete(a.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
      <button className="upload-btn" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={onAdd}>
        <Plus size={16} /> เพิ่มบัญชี
      </button>
    </div>
  );
}
