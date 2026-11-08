import { useState } from 'react';
import { RefreshCw, ExternalLink, Download } from 'lucide-react';
import { isGoogleSyncConfigured, requestAccessToken } from '../lib/googleAuth';
import { syncToGoogleSheets, SheetShrinkError } from '../lib/sheets/export';
import { importFromGoogleSheets } from '../lib/sheets/import';
import { getSpreadsheetUrl } from '../lib/sheets/api';
import { isAutoSyncEnabled, setAutoSyncEnabled } from '../lib/autoSync';
import { SlipInboxSetup } from './SlipInboxSetup';

export function GoogleSyncCard() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState(getSpreadsheetUrl());
  const [enabled, setEnabled] = useState(isAutoSyncEnabled());

  if (!isGoogleSyncConfigured()) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>ซิงก์ Google Sheets</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          ยังไม่ได้ตั้งค่า ต้องตั้ง VITE_GOOGLE_CLIENT_ID ก่อนจึงจะสำรองข้อมูลไป Google Sheets ได้
        </div>
      </div>
    );
  }

  async function connectAndSync() {
    setBusy(true);
    setStatus(null);
    try {
      await requestAccessToken(true);
      setAutoSyncEnabled(true);
      setEnabled(true);
      const result = await syncToGoogleSheets(false);
      setSheetUrl(result.url);
      setStatus(`ซิงก์แล้ว ${result.rowCount} รายการ`);
    } catch (e) {
      setStatus(`ซิงก์ไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setStatus(null);
    try {
      let result;
      try {
        result = await syncToGoogleSheets(true);
      } catch (e) {
        if (!(e instanceof SheetShrinkError)) throw e;
        if (!confirm(`${e.message}\n\nถ้าซิงก์ตอนนี้ รายการที่มีเฉพาะในชีตจะถูกลบออกจากชีต ยืนยันซิงก์ทับ?`)) {
          setStatus(e.message);
          return;
        }
        result = await syncToGoogleSheets(true, true);
      }
      setSheetUrl(result.url);
      setStatus(`ซิงก์แล้ว ${result.rowCount} รายการ`);
    } catch (e) {
      setStatus(`ซิงก์ไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function importNow() {
    if (!confirm('นำเข้าข้อมูลจาก Google Sheet ที่เชื่อมไว้? บัญชี หมวดหมู่ งบประมาณ รายการด่วน รายการประจำ และรายการที่ไม่ซ้ำจะถูกเพิ่มลงในเครื่องนี้')) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await importFromGoogleSheets(true);
      setStatus(
        `นำเข้าแล้ว: บัญชี ${result.accountsAdded}, หมวดหมู่ ${result.categoriesAdded}, งบประมาณ ${result.budgetsAdded}, รายการด่วน ${result.bookmarksAdded}, รายการประจำ ${result.recurringAdded}, รายการ ${result.transactionsImported} (ข้าม ${result.transactionsSkipped} รายการที่ซ้ำหรือจับคู่ไม่ได้)`
      );
    } catch (e) {
      setStatus(`นำเข้าไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    setAutoSyncEnabled(false);
    setEnabled(false);
    setStatus('ปิดซิงก์อัตโนมัติแล้ว ข้อมูลในเครื่องยังอยู่ครบ');
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-title" style={{ marginTop: 0 }}>ซิงก์ Google Sheets</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {enabled
          ? 'เปิดซิงก์อัตโนมัติอยู่ ข้อมูลจะส่งไป Google Sheet ทุกครั้งที่มีการเปลี่ยนแปลง'
          : 'ข้อมูลเก็บในเครื่องนี้เท่านั้น จนกว่าจะเชื่อมบัญชี Google'}
      </div>

      <button className="upload-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={enabled ? syncNow : connectAndSync} disabled={busy}>
        <RefreshCw size={16} className={busy ? 'spin' : ''} />
        {busy ? 'กำลังซิงก์...' : enabled ? 'ซิงก์ตอนนี้' : 'เชื่อม Google Sheets'}
      </button>

      {sheetUrl && (
        <>
          <a href={sheetUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, color: 'var(--accent)' }}>
            <ExternalLink size={14} /> เปิดสเปรดชีต
          </a>
          <button className="icon-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10, marginRight: 0, padding: '10px 0' }} onClick={importNow} disabled={busy}>
            <Download size={16} style={{ marginRight: 6 }} /> นำเข้าจากชีต
          </button>
        </>
      )}

      {status && <div className="text-secondary-sm" style={{ marginTop: 8 }}>{status}</div>}

      {enabled && (
        <button className="delete-btn" style={{ marginTop: 10 }} onClick={disconnect}>ปิดซิงก์อัตโนมัติ</button>
      )}

      {enabled && sheetUrl && <SlipInboxSetup sheetUrl={sheetUrl} />}
    </div>
  );
}
