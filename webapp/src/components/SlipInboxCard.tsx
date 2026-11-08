import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Receipt } from 'lucide-react';
import { hasValidToken } from '../lib/googleAuth';
import { canUseSlipInbox, fetchPendingSlips, markSlip, type InboxSlip } from '../lib/sheets/inbox';
import { parseExtractedText } from '../ocr/parseSlip';
import { formatCurrency, formatDateTime } from '../lib/format';
import { ScannedTransactionForm } from './ScannedTransactionForm';

export function SlipInboxCard() {
  const [slips, setSlips] = useState<InboxSlip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<InboxSlip | null>(null);
  const enabled = canUseSlipInbox();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSlips(await fetchPendingSlips());
    } catch {
      setError('ดึงสลิปไม่สำเร็จ ลองกดอีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check automatically only when already signed in; otherwise Google needs a tap
  // (iOS blocks the sign-in popup unless it comes from a user gesture).
  useEffect(() => {
    if (!enabled) return;
    if (hasValidToken()) load();
    function onVisible() {
      if (document.visibilityState === 'visible' && hasValidToken()) load();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, load]);

  if (!enabled) return null;

  function removeSlip(slip: InboxSlip) {
    setSlips((cur) => cur?.filter((s) => s.id !== slip.id) ?? null);
  }

  async function skip(slip: InboxSlip) {
    removeSlip(slip);
    try {
      await markSlip(slip, 'skipped');
    } catch {
      setError('อัปเดตสถานะในชีตไม่สำเร็จ สลิปนี้อาจขึ้นมาอีกครั้ง');
    }
  }

  async function onSaved(slip: InboxSlip) {
    removeSlip(slip);
    try {
      await markSlip(slip, 'saved');
    } catch {
      setError('บันทึกรายการแล้ว แต่อัปเดตสถานะในชีตไม่สำเร็จ ถ้าสลิปนี้ขึ้นมาอีกให้กด ข้าม');
    }
  }

  const count = slips?.length ?? 0;

  return (
    <>
      <div className="section-title">สลิปอัตโนมัติ</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div className="icon-label-row">
            <Receipt size={20} color="var(--accent)" />
            <div style={{ fontWeight: 600 }}>
              {slips === null ? 'ตรวจสลิปใหม่จากคำสั่งลัด' : count > 0 ? `มีสลิปรอยืนยัน ${count} รายการ` : 'ไม่มีสลิปใหม่'}
            </div>
          </div>
          <button className="icon-btn" style={{ marginRight: 0 }} onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ marginRight: 4 }} />
            {loading ? 'กำลังตรวจ' : 'ตรวจ'}
          </button>
        </div>

        {error && <div className="text-secondary-sm" style={{ marginTop: 8, color: 'var(--red)' }}>{error}</div>}

        {slips?.map((slip) => {
          const parsed = parseExtractedText(slip.text);
          return (
            <div className="list-item" key={slip.id}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{parsed.amount !== undefined ? formatCurrency(parsed.amount) : 'อ่านจำนวนเงินไม่ได้'}</div>
                <div className="text-secondary-sm">{formatDateTime(slip.receivedAt)}</div>
              </div>
              <div style={{ display: 'flex', flexShrink: 0 }}>
                <button className="icon-btn" onClick={() => skip(slip)}>ข้าม</button>
                <button className="upload-btn" style={{ padding: '6px 12px' }} onClick={() => setReviewing(slip)}>บันทึก</button>
              </div>
            </div>
          );
        })}
      </div>

      {reviewing && (
        <ScannedTransactionForm
          parsedData={parseExtractedText(reviewing.text)}
          defaultDate={reviewing.receivedAt}
          onSaved={() => onSaved(reviewing)}
          onClose={() => setReviewing(null)}
        />
      )}
    </>
  );
}
