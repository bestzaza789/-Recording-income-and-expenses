import { useState } from 'react';
import { getDailyLimit, setDailyLimit } from '../lib/dailyAllowance';
import { showSaved } from '../lib/saveFeedback';

/** Management card for the daily spending limit shown on the Dashboard. */
export function DailyLimitSetting() {
  const [saved, setSaved] = useState(getDailyLimit);
  const [input, setInput] = useState(saved ? String(saved) : '');
  const amount = Number(input);
  const valid = input !== '' && amount > 0;
  const dirty = valid && amount !== saved;

  function save() {
    if (!valid) return;
    setDailyLimit(amount);
    setSaved(amount);
    void showSaved();
  }

  function clear() {
    setDailyLimit(null);
    setSaved(null);
    setInput('');
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
    </div>
  );
}
