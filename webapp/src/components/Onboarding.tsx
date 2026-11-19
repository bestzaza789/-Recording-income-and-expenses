import { useEffect, useState } from 'react';
import { db, type Account } from '../db/db';
import { updateAccount } from '../db/transactionManager';
import { sortAccounts } from '../lib/lookup';
import { showSaved } from '../lib/saveFeedback';
import { startTour } from '../lib/tour/tourStore';
import { Mascot, type MascotMood } from './Mascot';
import { ThemePicker } from './ThemePicker';

const DONE_KEY = 'onboarded';

function isDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return true; // can't remember the answer, so never nag
  }
}

function markDone() {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

const STEPS: { mood: MascotMood; title: string; text: string }[] = [
  { mood: 'cheer', title: 'สวัสดี! ยินดีที่ได้รู้จัก', text: 'เราจะช่วยจดรายรับรายจ่ายให้ง่ายและน่ารักขึ้น มาตั้งค่าไม่กี่ขั้นตอนกันนะ' },
  { mood: 'happy', title: 'ชอบสีไหนดี?', text: 'เลือกธีมที่ถูกใจ เปลี่ยนทีหลังได้ที่หน้า จัดการ' },
  { mood: 'happy', title: 'บัญชีแรกของเรา', text: 'ตั้งชื่อและยอดเงินตั้งต้น เพื่อให้ยอดคงเหลือถูกต้องตั้งแต่เริ่ม' },
  { mood: 'cheer', title: 'พร้อมแล้ว!', text: 'กดปุ่ม + มุมขวาล่างเพื่อจดรายการแรกได้เลย' },
];

/**
 * First-run welcome. Only shows to a brand-new install (untouched default
 * account, no transactions) that hasn't finished or skipped it before, so
 * existing users never see it.
 */
export function Onboarding() {
  const [account, setAccount] = useState<Account | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDone()) return;
    let cancelled = false;
    (async () => {
      const [accounts, txCount] = await Promise.all([db.accounts.toArray(), db.transactions.count()]);
      if (cancelled) return;
      const first = sortAccounts(accounts)[0];
      if (txCount > 0 || accounts.length !== 1 || !first || first.initialBalance !== 0) {
        markDone(); // existing user: never show
        return;
      }
      setAccount(first);
      setName(first.name);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!account) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  function skip() {
    markDone();
    setAccount(null);
  }

  async function next() {
    if (!account) return;
    if (step === 2) {
      setSaving(true);
      const amount = parseFloat(balance);
      await updateAccount(account.id, name.trim() || account.name, account.accountType, Number.isFinite(amount) ? amount : 0);
      setSaving(false);
    }
    if (last) {
      markDone();
      setAccount(null);
      void showSaved('ยินดีต้อนรับจ้า 🎉', { celebrate: true });
      return;
    }
    setStep((s) => s + 1);
  }

  function finishWithTour() {
    markDone();
    setAccount(null);
    startTour('first-expense');
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="ยินดีต้อนรับ">
      <div className="onboarding-card">
        <div className="onboarding-mascot" key={step}>
          <Mascot mood={current.mood} size={120} />
        </div>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-text">{current.text}</p>

        {step === 1 && <ThemePicker />}
        {step === 2 && (
          <div className="form-section" style={{ width: '100%' }}>
            <div className="form-field">
              <div className="form-row">
                <label>ชื่อบัญชี</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เงินสด" />
              </div>
              <div className="form-row">
                <label>ยอดตั้งต้น</label>
                <input type="number" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>
        )}

        <div className="wizard-dots" style={{ marginTop: 20 }}>
          {STEPS.map((_, i) => (
            <span key={i} className={`wizard-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          {!last && (
            <button className="confirm-btn cancel" onClick={skip}>ข้าม</button>
          )}
          {last && (
            <button className="confirm-btn cancel" onClick={finishWithTour}>พาฉันจดรายการแรก</button>
          )}
          <button className="confirm-btn ok" onClick={next} disabled={saving}>
            {last ? 'เริ่มใช้งาน' : step === 0 ? 'เริ่มเลย' : 'ต่อไป'}
          </button>
        </div>
      </div>
    </div>
  );
}
