/**
 * Guided tours: each step spotlights a real element on the real page and waits for the user to
 * use it. Targets are CSS selectors (optionally narrowed by visible text) so tours don't need
 * markup changes in the components they walk through.
 */

/** A CSS selector, optionally narrowed to elements whose text or aria-label contains any `a|b` alternative. */
export type TourTarget = string | { sel: string; text?: string };

export interface TourStep {
  /** Element to spotlight. Without one the step is a centered card. */
  target?: TourTarget;
  /** Page to show this step on; the tour navigates there when the user isn't on it. */
  route?: string;
  text: string;
  /**
   * `click` (default with a target): the user must press a button inside the target.
   * `fill`: the user fills the target, then presses the tip's Next (checked by `validate`).
   * `info`: the target is only highlighted; the tip's Next moves on.
   */
  mode?: 'click' | 'fill' | 'info';
  /** In `click` mode, only a button whose text contains this advances. */
  clickText?: string;
  /** In `fill` mode, an error message to block Next with, or null when the target is filled in. */
  validate?: (target: HTMLElement) => string | null;
  /** Skipped silently when the target never shows up (e.g. no data yet). */
  optional?: boolean;
  /** Shows a "skip this step" link on a `click` step the user might not be able to complete. */
  canSkip?: boolean;
  nextLabel?: string;
}

export interface Tour {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  /** What the tour really writes to the user's data, shown on its card. */
  saves?: string;
  /** A message explaining why the tour can't start yet, or null when it can. */
  requires?: (ctx: { accounts: number }) => string | null;
  steps: TourStep[];
}

const M = '.modal-sheet';

/** `fill` validator: the first `count` fields are filled (numbers must be above 0). */
function filled(count: number, message: string): (target: HTMLElement) => string | null {
  return (target) => {
    const fields = Array.from(
      target.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input:not([type="checkbox"]):not([type="radio"]), select'),
    ).slice(0, count);
    const ok = fields.length > 0 && fields.every((f) => (f.type === 'number' ? Number(f.value) > 0 : f.value.trim() !== ''));
    return ok ? null : message;
  };
}

const saveInModal: TourStep = { target: `${M} .modal-header .save`, text: 'กด "บันทึก" ที่มุมขวาบน', clickText: 'บันทึก' };

export const TOURS: Tour[] = [
  {
    id: 'home',
    emoji: '🏠',
    title: 'รู้จักหน้าหลัก',
    blurb: 'ดูว่าแต่ละส่วนบนหน้าหลักบอกอะไร',
    steps: [
      { route: '/', text: 'มาดูหน้าหลักกันทีละส่วน', nextLabel: 'เริ่มเลย' },
      { target: '.hero', mode: 'info', text: 'ทรัพย์สินสุทธิรวมทุกบัญชี กับรายรับรายจ่ายของเดือนนี้ น้องแมวเปลี่ยนอารมณ์ตามการเงินของเดือนนี้ ลองแตะดูได้ทีหลัง' },
      { target: '.account-carousel', mode: 'info', optional: true, text: 'การ์ดของแต่ละบัญชี ปัดดูได้ กดเพื่อเปิดดูรายการของบัญชีนั้น' },
      { target: '.allowance-card', mode: 'info', optional: true, text: 'วันนี้ใช้ได้อีกเท่าไหร่ ตั้งยอดได้ที่หน้า "จัดการ"' },
      { target: '.quick-add-row', mode: 'info', optional: true, text: 'ปุ่มรายการด่วน แตะเดียวบันทึกเลย เหมาะกับค่าเดินทางหรือค่าข้าวที่จ่ายบ่อย' },
      { target: '.fab', mode: 'info', text: 'ปุ่ม + ใช้จดรายการ มีให้เลือกทั้งบันทึกเอง โอนเงินระหว่างบัญชี และสแกนสลิป' },
      { target: '.bottom-nav', mode: 'info', text: 'เมนูล่าง: หน้าหลัก รายการทั้งหมด งบประมาณ จัดการ และสถิติ' },
      { text: 'จบแล้ว! ลองเรื่องอื่นต่อได้ที่หน้า "คู่มือ"', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'accounts',
    emoji: '🏦',
    title: 'เพิ่มบัญชี',
    blurb: 'เพิ่มเงินสด บัญชีธนาคาร หรือบัตรเครดิต',
    saves: 'เพิ่มบัญชีใหม่ 1 บัญชี ลบได้ที่หน้า จัดการ',
    steps: [
      { route: '/management', target: { sel: '.page .upload-btn', text: 'เพิ่มบัญชี' }, text: 'กด "เพิ่มบัญชี"' },
      { target: `${M} .form-field`, mode: 'fill', validate: filled(1, 'ตั้งชื่อบัญชีก่อนนะ'), text: 'ตั้งชื่อ เลือกประเภท และใส่ยอดเริ่มต้น (เงินที่มีอยู่ตอนนี้) แล้วกด "ถัดไป"' },
      saveInModal,
      { text: 'เพิ่มบัญชีแล้ว! ลากจับที่ปุ่ม ⠿ เพื่อเรียงลำดับบัญชีในหน้าหลักได้', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'first-expense',
    emoji: '✍️',
    title: 'จดรายจ่ายครั้งแรก',
    blurb: 'พากดทีละขั้นจนบันทึกรายการแรกสำเร็จ',
    saves: 'บันทึกรายจ่าย 1 รายการจริง ลบได้ที่หน้า รายการ',
    steps: [
      { route: '/', text: 'มาลองจดรายจ่ายแรกกัน! รายการนี้จะถูกบันทึกจริง ลบทีหลังได้ที่หน้า "รายการ"', nextLabel: 'เริ่มเลย' },
      { target: '.fab', text: 'ปุ่ม + ใช้เพิ่มรายการ กดเลย' },
      { target: { sel: '.speed-dial-action', text: 'บันทึกเอง' }, text: 'เลือก "บันทึกเอง"' },
      { target: `${M} .wizard-type-options`, text: 'เลือกว่าเป็น "รายจ่าย" หรือ "รายรับ"' },
      { target: `${M} .wizard-input-step`, text: 'พิมพ์จำนวนเงิน เช่น 80 แล้วกด "ถัดไป"' },
      { target: `${M} .wizard-input-step`, text: 'วันและเวลา ใช้ค่าตอนนี้ได้เลย กด "ถัดไป"' },
      { target: `${M} .wizard-options`, text: 'จ่ายจากบัญชีไหน แตะเลือก' },
      { target: `${M} .wizard-options`, text: 'หมวดหมู่ของรายจ่ายนี้ แตะเลือก' },
      { target: `${M} .wizard-input-step`, clickText: 'บันทึก', text: 'เขียนโน้ตได้ (ไม่ใส่ก็ได้) แล้วกด "บันทึก"' },
      { text: 'เสร็จแล้ว! รายการแรกอยู่ที่หน้าหลักและหน้า "รายการ"', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'quick-add',
    emoji: '⚡',
    title: 'ปุ่มรายการด่วน',
    blurb: 'สร้างปุ่มแตะเดียวสำหรับรายการที่จ่ายบ่อย',
    saves: 'เพิ่มปุ่มรายการด่วน 1 ปุ่ม (ยังไม่บันทึกรายการ)',
    steps: [
      { route: '/management', target: { sel: '.page > .segmented button', text: 'รายการด่วน' }, text: 'เปิดแท็บ "รายการด่วน"' },
      { target: { sel: '.page .upload-btn', text: 'เพิ่มรายการด่วน' }, text: 'กด "เพิ่มรายการด่วน"' },
      { target: `${M} .form-field`, mode: 'fill', validate: filled(2, 'ใส่ชื่อปุ่มกับจำนวนเงินก่อนนะ'), text: 'ตั้งชื่อปุ่ม (เช่น BTS ไปทำงาน) ใส่จำนวนเงิน เลือกบัญชีกับหมวดหมู่ แล้วกด "ถัดไป"' },
      saveInModal,
      { route: '/', target: '.quick-add-row', mode: 'info', text: 'ปุ่มที่เพิ่งสร้างอยู่ตรงนี้ แตะครั้งเดียวก็บันทึกเป็นรายการของวันนี้ทันที', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'transfer',
    emoji: '🔁',
    title: 'โอนเงินระหว่างบัญชี',
    blurb: 'ย้ายเงินจากบัญชีหนึ่งไปอีกบัญชี',
    saves: 'บันทึกการโอน 1 รายการจริง ยอดสองบัญชีเปลี่ยน',
    requires: ({ accounts }) => (accounts < 2 ? 'ต้องมีอย่างน้อย 2 บัญชีก่อน ลองทำคู่มือ "เพิ่มบัญชี" แล้วกลับมา' : null),
    steps: [
      { route: '/', text: 'การโอนย้ายเงินระหว่างบัญชีของคุณเอง ไม่นับเป็นรายรับหรือรายจ่าย', nextLabel: 'เริ่มเลย' },
      { target: '.fab', text: 'กดปุ่ม +' },
      { target: { sel: '.speed-dial-action', text: 'โอนเงินระหว่างบัญชี' }, text: 'เลือก "โอนเงินระหว่างบัญชี"' },
      { target: `${M} .wizard-input-step`, text: 'พิมพ์จำนวนเงินที่จะโอน แล้วกด "ถัดไป"' },
      { target: `${M} .wizard-input-step`, text: 'วันและเวลา กด "ถัดไป"' },
      { target: `${M} .wizard-options`, text: 'โอนออกจากบัญชีไหน แตะเลือก' },
      { target: `${M} .wizard-options`, text: 'โอนไปเข้าบัญชีไหน แตะเลือก' },
      { target: `${M} .wizard-input-step`, clickText: 'บันทึก', text: 'โน้ตไม่บังคับ กด "บันทึก"' },
      { text: 'เสร็จแล้ว! ยอดสองบัญชีเปลี่ยน แต่ทรัพย์สินสุทธิรวมเท่าเดิม', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'scan-slip',
    emoji: '📸',
    title: 'สแกนสลิป',
    blurb: 'ให้แอปอ่านสลิปโอนเงินแล้วกรอกให้',
    steps: [
      { route: '/', target: '.fab', text: 'กดปุ่ม +' },
      { target: { sel: '.speed-dial-action', text: 'สแกนสลิป' }, text: 'เลือก "สแกนสลิป"' },
      { target: `${M} .scanner-drop`, mode: 'info', text: 'เลือกรูปสลิปจากเครื่อง แอปอ่านจำนวนเงินและเดาบัญชีกับหมวดให้ แล้วให้คุณยืนยันก่อนบันทึกเสมอ ไม่บันทึกเองอัตโนมัติ' },
      { target: `${M} .modal-header`, clickText: 'ยกเลิก', text: 'ตอนนี้ยังไม่ต้องเลือกรูป กด "ยกเลิก" เพื่อปิด' },
      { text: 'ถ้าใช้ iPhone ตั้งให้สลิปเด้งเข้าแอปอัตโนมัติได้ ดูคู่มือ "สำรองข้อมูลลง Google Sheets"', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'budget',
    emoji: '🎯',
    title: 'ตั้งงบรายหมวด',
    blurb: 'กำหนดงบต่อเดือนให้แต่ละหมวดรายจ่าย',
    saves: 'ตั้งงบให้ 1 หมวด แก้หรือเปลี่ยนได้ทุกเมื่อ',
    steps: [
      { route: '/budget', target: '.budget-pet', mode: 'info', text: 'ตรงนี้สรุปงบรวมของเดือน น้องแมวตกใจเมื่อใกล้เกินงบ' },
      { target: '.budget-item .icon-btn', text: 'กดตรงนี้เพื่อตั้งงบของหมวดแรก' },
      { target: `${M} .form-field`, mode: 'fill', validate: filled(1, 'ใส่งบต่อเดือนก่อนนะ'), text: 'ใส่งบต่อเดือน เช่น 3000 แล้วกด "ถัดไป"' },
      saveInModal,
      { text: 'ตั้งแล้ว! ตอนจดรายจ่ายหมวดนี้ ถ้าใกล้เกินงบแอปจะเตือน', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'goals',
    emoji: '🐷',
    title: 'เป้าหมายออมเงิน',
    blurb: 'ตั้งเป้าหมายแล้วฝากเงินเข้าไปทีละนิด',
    saves: 'เพิ่มเป้าหมาย 1 อัน ลบได้',
    steps: [
      { route: '/budget', target: 'button[aria-label="เพิ่มเป้าหมาย"]', text: 'กดปุ่ม + เพื่อเพิ่มเป้าหมาย' },
      { target: `${M} .form-field`, mode: 'fill', validate: filled(2, 'ใส่ชื่อกับยอดเป้าหมายก่อนนะ'), text: 'ตั้งชื่อเป้าหมาย (เช่น เที่ยวญี่ปุ่น) ใส่ยอดที่อยากเก็บ แล้วกด "ถัดไป"' },
      saveInModal,
      { target: '.goal-card', mode: 'info', optional: true, text: 'น้องแมวจะตัวโตขึ้นตามเงินที่เก็บได้ จนถึงเป้า' },
      { target: '.goal-deposit', mode: 'info', optional: true, text: 'กด "ฝาก / ถอน" เพื่อเพิ่มหรือเอาเงินออกจากเป้านี้ได้ตลอด', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'loans',
    emoji: '🤝',
    title: 'จดเงินยืม',
    blurb: 'จดว่าใครยืมเรา หรือเรายืมใคร',
    saves: 'เพิ่มรายการยืม 1 รายการ (ยังไม่แตะยอดบัญชี) ลบได้',
    steps: [
      { route: '/budget', target: 'button[aria-label="เพิ่มรายการยืม"]', text: 'กดปุ่ม + ตรงหัวข้อ "ยืม / ให้ยืม"' },
      { target: `${M} .form-field`, mode: 'fill', validate: filled(2, 'ใส่ชื่อกับจำนวนเงินก่อนนะ'), text: 'ใส่ชื่อคนและจำนวนเงิน (สลับ "เขายืมเรา" / "เรายืมเขา" ได้ด้านบน) แล้วกด "ถัดไป"' },
      saveInModal,
      { target: '.loan-done', mode: 'info', optional: true, text: 'ตอนเขาคืนเงิน กด "คืนแล้ว" แอปจะบันทึกรายรับให้และปรับยอดบัญชีอัตโนมัติ', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'recurring',
    emoji: '🔄',
    title: 'รายการประจำ',
    blurb: 'ให้แอปจดค่าเช่า เงินเดือน ฯลฯ ให้เองทุกเดือน',
    saves: 'เพิ่มรายการประจำ 1 รายการ ซึ่งจะสร้างรายการจริงตามวันที่ที่ตั้ง',
    steps: [
      { route: '/management', target: { sel: '.page > .segmented button', text: 'รายการประจำ' }, text: 'เปิดแท็บ "รายการประจำ"' },
      { target: { sel: '.page .upload-btn', text: 'เพิ่มรายการประจำ' }, text: 'กด "เพิ่มรายการประจำ"' },
      { target: `${M} .form-field`, mode: 'fill', validate: filled(2, 'ใส่จำนวนเงินกับวันที่ของเดือนก่อนนะ'), text: 'ใส่จำนวนเงินและวันที่ของเดือนที่ต้องการ เลือกบัญชีกับหมวด แล้วกด "ถัดไป"' },
      saveInModal,
      { target: '.page .list-item', mode: 'info', optional: true, text: 'ทุกครั้งที่เปิดแอป ถ้าถึงวันแล้วแอปสร้างรายการให้เอง ไม่ต้องจดซ้ำ', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'daily-limit',
    emoji: '💸',
    title: 'ตั้งยอดใช้ได้วันละ',
    blurb: 'ตั้งงบรายวัน เลือกหมวด และทบยอดวันถัดไป',
    steps: [
      { route: '/management', target: '.daily-limit-row', clickText: 'บันทึก', canSkip: true, text: 'พิมพ์ยอดที่ใช้ได้ต่อวัน เช่น 300 แล้วกด "บันทึก"' },
      { target: '.daily-chips', mode: 'info', optional: true, text: 'เลือกนับเฉพาะบางหมวดก็ได้ เช่น นับแค่ค่าอาหาร ไม่เลือกคือนับทุกหมวด' },
      { target: '.daily-rollover', mode: 'info', optional: true, text: 'เปิด "ทบยอด" แล้วเงินที่เหลือ (หรือใช้เกิน) ของวันก่อนจะบวก/ลบเข้ากับวันถัดไป รีเซ็ตทุกต้นเดือน' },
      { route: '/', target: '.allowance-card', mode: 'info', optional: true, text: 'การ์ดนี้บนหน้าหลักบอกว่าวันนี้ใช้ได้อีกเท่าไหร่', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'analytics',
    emoji: '📊',
    title: 'ดูสถิติและ Wrapped',
    blurb: 'ดูว่าเงินไปไหน และสรุปเดือนแบบ Wrapped',
    steps: [
      { route: '/analytics', target: '.page > .segmented', mode: 'info', text: 'สลับดูสรุปแบบรายเดือนหรือรายวัน' },
      { target: { sel: '.card', text: 'รายจ่ายตามหมวดหมู่' }, mode: 'info', optional: true, text: 'รายจ่ายแยกตามหมวด หมวดไหนกินเงินมากสุดเห็นทันที' },
      { target: '.wrapped-btn', mode: 'info', optional: true, text: 'กดตรงนี้เพื่อดูสรุปเดือนแบบ Wrapped แล้วบันทึกเป็นรูปแชร์ได้', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'edit-transactions',
    emoji: '🔎',
    title: 'ค้นหา แก้ไข และลบรายการ',
    blurb: 'แก้รายการที่จดผิด หรือหารายการเก่า',
    steps: [
      { route: '/transactions', target: '.search-bar', mode: 'info', text: 'พิมพ์ค้นหาจากโน้ต หมวดหมู่ หรือบัญชี' },
      { target: '.tx-row', mode: 'info', optional: true, text: 'หนึ่งแถวคือหนึ่งรายการ' },
      { target: '.tx-row .icon-btn', mode: 'info', optional: true, text: 'กดดินสอเพื่อแก้ไข เปลี่ยนเป็นรายรับ รายจ่าย หรือโอนได้ ส่วน "ลบ" จะคืนยอดบัญชีให้อัตโนมัติ', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'google-sync',
    emoji: '☁️',
    title: 'สำรองข้อมูลลง Google Sheets',
    blurb: 'สำรองอัตโนมัติ และกู้คืนเมื่อเปลี่ยนเครื่อง',
    steps: [
      { route: '/management', target: { sel: '.card', text: 'ซิงก์ Google Sheets' }, mode: 'info', text: 'ข้อมูลทั้งหมดเก็บในเครื่องนี้ ถ้าเชื่อม Google Sheets จะสำรองไว้ในชีตของคุณเอง' },
      { target: { sel: '.card .upload-btn', text: 'เชื่อม Google Sheets|ซิงก์ตอนนี้' }, mode: 'info', optional: true, text: 'กดครั้งแรกเพื่อเชื่อมบัญชี Google หลังจากนั้นส่งข้อมูลไปให้เองทุกครั้งที่มีการเปลี่ยนแปลง' },
      { target: { sel: '.card .icon-btn', text: 'นำเข้าจากชีต' }, mode: 'info', optional: true, text: 'เปลี่ยนเครื่องหรือข้อมูลหาย กด "นำเข้าจากชีต" เพื่อดึงข้อมูลกลับ โดยไม่ทับของที่มีอยู่แล้ว' },
      { text: 'ข้อควรระวัง: ซิงก์แต่ละครั้งเขียนทับชีตด้วยข้อมูลในเครื่อง ถ้าเปลี่ยนเครื่อง ให้กด "นำเข้าจากชีต" ก่อนซิงก์', nextLabel: 'เสร็จสิ้น' },
    ],
  },
  {
    id: 'theme',
    emoji: '🎨',
    title: 'เปลี่ยนธีมสี',
    blurb: 'เลือกสีของแอปให้ถูกใจ',
    steps: [
      { route: '/management', target: '.theme-options', text: 'แตะเลือกธีมที่ชอบ' },
      { text: 'สวยเลย! เปลี่ยนได้ทุกเมื่อที่หน้า "จัดการ"', nextLabel: 'เสร็จสิ้น' },
    ],
  },
];
