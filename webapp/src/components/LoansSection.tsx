import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db, type Loan } from '../db/db';
import { addLoan, deleteLoan, settleLoan } from '../db/transactionManager';
import { EMPTY } from '../lib/empty';
import { confirmDelete } from '../lib/confirm';
import { formatCurrency, formatDate } from '../lib/format';
import { sortAccounts } from '../lib/lookup';
import { showSaved } from '../lib/saveFeedback';
import { Modal } from './Modal';

function LoanForm({ onClose }: { onClose: () => void }) {
  const [direction, setDirection] = useState<Loan['direction']>('lent');
  const [person, setPerson] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const amount = Number(amountInput);
  const valid = person.trim() !== '' && amountInput !== '' && amount > 0;

  async function save() {
    if (!valid) return;
    await addLoan({ person: person.trim(), amount, direction, note: note.trim() || undefined });
    await showSaved();
    onClose();
  }

  return (
    <Modal title="เพิ่มยืม / ให้ยืม" onCancel={onClose} onSave={save} saveDisabled={!valid}>
      <div className="form-section">
        <div className="segmented" style={{ marginBottom: 12 }}>
          <button className={direction === 'lent' ? 'active' : ''} onClick={() => setDirection('lent')}>เขายืมเรา</button>
          <button className={direction === 'borrowed' ? 'active' : ''} onClick={() => setDirection('borrowed')}>เรายืมเขา</button>
        </div>
        <div className="form-field">
          <div className="form-row">
            <label>ชื่อ</label>
            <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="เช่น พี่เอ" autoFocus />
          </div>
          <div className="form-row">
            <label>จำนวนเงิน</label>
            <input type="number" inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-row">
            <label>โน้ต</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น หารค่าข้าว" />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
          ตอนนี้จดไว้เฉย ๆ — ยอดบัญชีจะเปลี่ยนตอนติ๊กว่า "คืนแล้ว"
        </div>
      </div>
    </Modal>
  );
}

function SettleForm({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.toArray().then(sortAccounts), []) ?? EMPTY;
  const [accountId, setAccountId] = useState('');
  const chosen = accountId || accounts[0]?.id || '';
  const lent = loan.direction === 'lent';

  async function save() {
    if (!chosen) return;
    await settleLoan(loan.id, chosen);
    await showSaved(lent ? 'ได้เงินคืนแล้ว 🎉' : 'คืนเงินแล้ว สบายใจ 🎈');
    onClose();
  }

  return (
    <Modal title={lent ? `${loan.person} คืนเงิน` : `คืนเงิน ${loan.person}`} onCancel={onClose} onSave={save} saveDisabled={!chosen} saveLabel="คืนแล้ว">
      <div className="form-section">
        <div className="form-field">
          <div className="form-row">
            <label>จำนวนเงิน</label>
            <span>{formatCurrency(loan.amount)}</span>
          </div>
          <div className="form-row">
            <label>{lent ? 'เข้าบัญชี' : 'หักจากบัญชี'}</label>
            <select value={chosen} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
          จะบันทึกเป็น{lent ? 'รายรับ' : 'รายจ่าย'}ในบัญชีและปรับยอดคงเหลือให้อัตโนมัติ
        </div>
      </div>
    </Modal>
  );
}

export function LoansSection() {
  const [adding, setAdding] = useState(false);
  const [settling, setSettling] = useState<Loan | null>(null);
  const [showDone, setShowDone] = useState(false);
  const loans = useLiveQuery(() => db.loans.toArray().then((l) => l.sort((a, b) => +b.createdAt - +a.createdAt)), []) ?? EMPTY;

  const open = loans.filter((l) => !l.settled);
  const done = loans.filter((l) => l.settled);
  const owedToUs = open.filter((l) => l.direction === 'lent').reduce((s, l) => s + l.amount, 0);
  const weOwe = open.filter((l) => l.direction === 'borrowed').reduce((s, l) => s + l.amount, 0);

  async function remove(l: Loan) {
    if (await confirmDelete(`รายการของ "${l.person}"`, l.settled ? 'รายการเงินเข้า/ออกที่สร้างตอนคืนจะยังอยู่' : undefined)) await deleteLoan(l.id);
  }

  const row = (l: Loan) => (
    <div className="loan-row" key={l.id}>
      <div className="loan-main">
        <div className="loan-person">{l.person}</div>
        <div className="loan-sub">{formatDate(l.createdAt)}{l.note ? ` · ${l.note}` : ''}{l.settled && l.settledAt ? ` · คืนแล้ว ${formatDate(l.settledAt)}` : ''}</div>
      </div>
      <div className="loan-amount" style={{ color: l.direction === 'lent' ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(l.amount)}</div>
      {!l.settled && <button className="goal-deposit loan-done" onClick={() => setSettling(l)}>คืนแล้ว</button>}
      <button className="icon-btn" onClick={() => remove(l)} aria-label="ลบรายการ"><Trash2 size={14} /></button>
    </div>
  );

  // Modals are siblings of <section> for the same reason as in GoalsSection.
  return (
    <>
      <section>
        <div className="section-title goals-title">
          <span>ยืม / ให้ยืม</span>
          <button className="icon-btn" onClick={() => setAdding(true)} aria-label="เพิ่มรายการยืม"><Plus size={16} /></button>
        </div>
        <div className="card">
          {open.length === 0 && <div className="goal-empty" style={{ margin: 0, padding: 0 }}>ไม่มีใครติดเงินใคร 🕊️</div>}
          {open.length > 0 && (
            <div className="loan-totals">
              <div><div className="text-secondary-sm">เขาติดเรา</div><strong style={{ color: 'var(--green)' }}>{formatCurrency(owedToUs)}</strong></div>
              <div><div className="text-secondary-sm">เราติดเขา</div><strong style={{ color: 'var(--red)' }}>{formatCurrency(weOwe)}</strong></div>
            </div>
          )}
          {open.map(row)}
          {done.length > 0 && (
            <>
              <button className="loan-toggle" onClick={() => setShowDone((v) => !v)}>
                {showDone ? 'ซ่อน' : 'แสดง'}ที่คืนแล้ว ({done.length})
              </button>
              {showDone && done.map(row)}
            </>
          )}
        </div>
      </section>
      {adding && <LoanForm onClose={() => setAdding(false)} />}
      {settling && <SettleForm loan={settling} onClose={() => setSettling(null)} />}
    </>
  );
}
