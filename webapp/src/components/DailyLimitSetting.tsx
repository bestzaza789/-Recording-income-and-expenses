import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  UNCATEGORIZED, getDailyCategories, getDailyLimit, getDailyRolloverFrom,
  setDailyCategories, setDailyLimit, setDailyRollover,
} from '../lib/dailyAllowance';
import { CategoryIcon } from '../lib/icons';
import { showSaved } from '../lib/saveFeedback';
import { scheduleAutoSync } from '../lib/autoSync';

/** Management card for the daily spending limit shown on the Dashboard. */
export function DailyLimitSetting() {
  const [saved, setSaved] = useState(getDailyLimit);
  const [input, setInput] = useState(saved ? String(saved) : '');
  const [selected, setSelected] = useState(getDailyCategories);
  const [rollover, setRollover] = useState(() => getDailyRolloverFrom() !== null);
  const categories = useLiveQuery(() => db.categories.where('type').equals('expense').toArray(), []);
  const amount = Number(input);
  const valid = input !== '' && amount > 0;
  const dirty = valid && amount !== saved;

  function save() {
    if (!valid) return;
    setDailyLimit(amount);
    setSaved(amount);
    scheduleAutoSync();
    void showSaved();
  }

  function clear() {
    setDailyLimit(null);
    setSaved(null);
    setInput('');
    scheduleAutoSync();
  }

  function toggleCategory(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    setDailyCategories(next);
    scheduleAutoSync();
  }

  function selectAll() {
    setSelected([]);
    setDailyCategories([]);
    scheduleAutoSync();
  }

  function toggleRollover() {
    setRollover(!rollover);
    setDailyRollover(!rollover);
    scheduleAutoSync();
  }

  return (
    <div className="card daily-limit">
      <div className="theme-picker-title">ใช้ได้วันละ</div>
      <div className="daily-limit-row">
        <input
          type="number"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="เช่น 300"
          aria-label="งบใช้จ่ายต่อวัน"
        />
        <button className="confirm-btn ok" onClick={save} disabled={!dirty}>บันทึก</button>
        {saved && <button className="confirm-btn cancel" onClick={clear}>ปิด</button>}
      </div>
      <div className="text-secondary-sm" style={{ marginTop: 6 }}>
        {saved ? 'หน้าหลักจะแสดง "วันนี้ใช้ได้อีก" จากยอดนี้ลบรายจ่ายของวันนี้' : 'ยังไม่ได้ตั้ง — การ์ด "วันนี้ใช้ได้อีก" จะยังไม่แสดงบนหน้าหลัก'}
      </div>

      {saved && (
        <>
          <div className="daily-limit-label">นับเฉพาะหมวดหมู่</div>
          <div className="daily-chips">
            <button
              type="button"
              className={`daily-chip${selected.length === 0 ? ' selected' : ''}`}
              aria-pressed={selected.length === 0}
              onClick={selectAll}
            >
              ทุกหมวด
            </button>
            {(categories ?? []).map((c) => (
              <button
                type="button"
                key={c.id}
                className={`daily-chip${selected.includes(c.id) ? ' selected' : ''}`}
                aria-pressed={selected.includes(c.id)}
                onClick={() => toggleCategory(c.id)}
              >
                <CategoryIcon name={c.iconName} size={16} color={`#${c.hexColor}`} />
                {c.name}
              </button>
            ))}
            <button
              type="button"
              className={`daily-chip${selected.includes(UNCATEGORIZED) ? ' selected' : ''}`}
              aria-pressed={selected.includes(UNCATEGORIZED)}
              onClick={() => toggleCategory(UNCATEGORIZED)}
            >
              ไม่ระบุหมวด
            </button>
          </div>
          <div className="text-secondary-sm" style={{ marginTop: 6 }}>
            {selected.length === 0 ? 'รายจ่ายทุกหมวดถูกนับ' : `นับเฉพาะ ${selected.length} หมวดที่เลือก — หมวดอื่นไม่ถูกหักจากยอดนี้`}
          </div>

          <label className="daily-rollover">
            <input type="checkbox" checked={rollover} onChange={toggleRollover} />
            <span>ทบยอดไปวันถัดไป</span>
          </label>
          <div className="text-secondary-sm">
            {rollover
              ? 'เงินที่เหลือ (หรือใช้เกิน) ของแต่ละวัน จะบวก/ลบเข้ากับวันถัดไป นับตั้งแต่วันที่เปิด — รีเซ็ตทุกต้นเดือน'
              : 'ปิดอยู่ — ทุกวันเริ่มนับใหม่จากยอดที่ตั้งไว้'}
          </div>
        </>
      )}
    </div>
  );
}
