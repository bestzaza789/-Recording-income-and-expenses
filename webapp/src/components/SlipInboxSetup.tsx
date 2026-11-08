import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Modal } from './Modal';
import { APPS_SCRIPT_CODE, isSlipInboxEnabled, setSlipInboxEnabled } from '../lib/sheets/inbox';

export function SlipInboxSetup({ sheetUrl }: { sheetUrl: string | null }) {
  const [enabled, setEnabled] = useState(isSlipInboxEnabled());
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  function toggle() {
    setSlipInboxEnabled(!enabled);
    setEnabled(!enabled);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div className="icon-label-row" style={{ fontWeight: 600, marginBottom: 6 }}>
        <Receipt size={16} /> สลิปอัตโนมัติ (iPhone)
      </div>
      <div className="text-secondary-sm" style={{ marginBottom: 10 }}>
        ใช้แอปคำสั่งลัดอ่านสลิปให้เองหลังโอนเงิน แล้วมากดยืนยันในหน้าหลัก ไม่ใช้ก็ไม่ต้องเปิด
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="icon-btn" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', marginRight: 0 }} onClick={() => setShowGuide(true)}>
          วิธีตั้งค่า
        </button>
        <button className={enabled ? 'delete-btn' : 'upload-btn'} style={{ flex: 1, justifyContent: 'center' }} onClick={toggle}>
          {enabled ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
        </button>
      </div>

      {showGuide && (
        <Modal title="ตั้งค่าสลิปอัตโนมัติ" onCancel={() => setShowGuide(false)}>
          <div className="guide">
            <p>
              ทำครั้งเดียว ประมาณ 10–15 นาที ขั้นตอนที่ 1 ทำบนคอมจะง่ายกว่า
              ต้องกด <b>เชื่อม Google Sheets</b> และซิงก์อย่างน้อยหนึ่งครั้งก่อน
            </p>

            <h3>1. ติดตั้งตัวรับสลิปในชีต</h3>
            <ol>
              <li>
                เปิดสเปรดชีตสำรองข้อมูลของคุณ
                {sheetUrl && <> (<a href={sheetUrl} target="_blank" rel="noreferrer">เปิดสเปรดชีต</a>)</>}
              </li>
              <li>เมนู <b>ส่วนขยาย (Extensions) → Apps Script</b></li>
              <li>
                ลบโค้ดเดิมในไฟล์ทั้งหมด แล้ววางโค้ดนี้ จากนั้นกดบันทึก
                <div>
                  <button className="upload-btn" style={{ marginTop: 8 }} onClick={copyCode}>
                    {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกโค้ด'}
                  </button>
                </div>
              </li>
              <li>
                กด <b>การทำให้ใช้งานได้ (Deploy) → การทำให้ใช้งานได้รายการใหม่ (New deployment)</b>{' '}
                เลือกประเภท <b>เว็บแอป (Web app)</b> ตั้ง
                ดำเนินการในฐานะ <b>ฉัน (Me)</b> และผู้ที่มีสิทธิ์เข้าถึง <b>ทุกคน (Anyone)</b> แล้วกดทำให้ใช้งานได้
              </li>
              <li>
                Google จะขอสิทธิ์และเตือนว่าแอปยังไม่ได้รับการยืนยัน ให้กด <b>ขั้นสูง (Advanced) → ไปที่ … (ไม่ปลอดภัย)</b> → อนุญาต
                (เป็นสคริปต์ของคุณเองในชีตของคุณเอง)
              </li>
              <li>คัดลอก <b>URL ของเว็บแอป</b> (ลงท้ายด้วย <code>/exec</code>) เก็บไว้ อย่าแชร์ให้คนอื่น</li>
            </ol>

            <h3>2. สร้างคำสั่งลัดบน iPhone</h3>
            <p>เปิดแอป <b>คำสั่งลัด (Shortcuts)</b> → กด + สร้างคำสั่งลัดใหม่ ตั้งชื่อว่า "ส่งสลิป" แล้วเพิ่มคำสั่งตามลำดับ:</p>
            <ol>
              <li>
                <b>ค้นหารูปภาพ (Find Photos)</b> → เพิ่มตัวกรอง <b>วันที่ที่ถ่าย (Date Taken)</b> อยู่ในช่วง <b>ล่าสุด 10 นาที</b>,
                เรียงตาม วันที่ที่ถ่าย <b>ใหม่สุดก่อน</b>, เปิด <b>จำกัด</b> = 1
              </li>
              <li><b>ถ้า (If)</b> รูปภาพ <b>มีค่าใดๆ (has any value)</b></li>
              <li>(ภายใน ถ้า) <b>แยกข้อความจากรูปภาพ (Extract Text from Image)</b></li>
              <li>
                (ภายใน ถ้า) <b>รับเนื้อหาของ URL (Get Contents of URL)</b> → ใส่ URL จากขั้นที่ 1,
                วิธี <b>POST</b>, เนื้อหาคำขอ <b>JSON</b>, เพิ่มช่องชื่อ <code>text</code> ค่าเป็น <b>ข้อความ</b> จากคำสั่งก่อนหน้า
              </li>
            </ol>
            <p>ลองทดสอบ: แคปหน้าจอสลิปสักใบ แล้วกดเล่นคำสั่งลัด ครั้งแรกจะขออนุญาตเข้ารูปภาพและอินเทอร์เน็ต ให้กดอนุญาตเสมอ</p>

            <h3>3. ให้ทำงานเองหลังโอนเงิน</h3>
            <ol>
              <li>ในแอปคำสั่งลัด ไปแท็บ <b>ระบบอัตโนมัติ (Automation)</b> → + → <b>แอป (App)</b></li>
              <li>เลือกแอปธนาคารที่ใช้ เลือก <b>ถูกปิด (Is Closed)</b> และ <b>เรียกใช้ทันที (Run Immediately)</b></li>
              <li>เลือกคำสั่งลัด "ส่งสลิป"</li>
              <li>ในแอปธนาคาร เปิดตัวเลือก <b>บันทึกสลิปลงคลังภาพอัตโนมัติ</b></li>
            </ol>

            <h3>4. เปิดใช้ในแอปนี้</h3>
            <p>
              กด <b>เปิดใช้งาน</b> ในหน้าจัดการ จะมีการ์ด <b>สลิปอัตโนมัติ</b> ที่หน้าหลัก
              กด <b>ตรวจ</b> เพื่อดึงสลิปใหม่ แล้วกด <b>บันทึก</b> เพื่อเลือกบัญชี/หมวดหมู่ก่อนบันทึก หรือ <b>ข้าม</b> ถ้าไม่ใช่รายจ่าย
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
