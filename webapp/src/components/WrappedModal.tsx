import { useRef, useState } from 'react';
import type { Category, Transaction } from '../db/db';
import { buildWrapped } from '../lib/wrapped';
import { formatCurrency, formatDayLong, formatMonth } from '../lib/format';
import { Modal } from './Modal';
import { Mascot } from './Mascot';

const W = 1080;
const H = 1350;
const FONT = 'system-ui, -apple-system, "Noto Sans Thai", "Thonburi", sans-serif';

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/**
 * Copies the computed colours that come from CSS (custom properties, currentColor) onto
 * the cloned SVG as plain attributes, so it still looks right once it leaves the page's
 * stylesheet and is drawn as an image.
 */
function inlineStyles(source: SVGSVGElement): SVGSVGElement {
  const clone = source.cloneNode(true) as SVGSVGElement;
  const src = [source, ...source.querySelectorAll('*')];
  const dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((el, i) => {
    const out = dst[i];
    const cs = getComputedStyle(el);
    if (el.tagName === 'stop') out.setAttribute('stop-color', cs.stopColor);
    if (out.getAttribute('fill') === 'currentColor') out.setAttribute('fill', cs.color);
    if ((el as SVGElement).style?.stroke) out.setAttribute('stroke', cs.stroke);
    out.removeAttribute('style');
    out.removeAttribute('class');
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return clone;
}

async function toPng(svg: SVGSVGElement): Promise<Blob> {
  const markup = new XMLSerializer().serializeToString(inlineStyles(svg));
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('render failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.getContext('2d')!.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  transactions: Transaction[];
  categories: Category[];
  monthStart: number;
  onClose: () => void;
}

export function WrappedModal({ transactions, categories, monthStart, onClose }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);
  const w = buildWrapped(transactions, categories, monthStart);
  const monthLabel = formatMonth(w.month);

  const rows: { label: string; value: string; sub: string }[] = [
    {
      label: '👑 หมวดที่ใช้เยอะสุด',
      value: w.topCategory ? clip(w.topCategory.name, 16) : 'ยังไม่มีรายจ่าย',
      sub: w.topCategory ? `${formatCurrency(w.topCategory.amount)} · ${Math.round(w.topCategory.pct * 100)}% ของรายจ่าย` : '',
    },
    {
      label: '💸 วันที่ใช้หนักสุด',
      value: w.heaviestDay ? formatDayLong(w.heaviestDay.date) : '-',
      sub: w.heaviestDay ? `ใช้ไป ${formatCurrency(w.heaviestDay.amount)}` : '',
    },
    {
      label: w.saved >= 0 ? '🐷 ออมได้' : '😵 ใช้เกินรายรับ',
      value: formatCurrency(Math.abs(w.saved)),
      sub: `รับ ${formatCurrency(w.income)} · จ่าย ${formatCurrency(w.expense)}`,
    },
    {
      label: '🔥 Streak',
      value: w.savingStreak > 0 ? `ออมต่อเนื่อง ${w.savingStreak} เดือน` : `จดบัญชี ${w.loggedDays} วัน`,
      sub: w.savingStreak > 0 ? `จดบัญชีไป ${w.loggedDays} วันในเดือนนี้` : 'เดือนหน้าลองออมให้ได้นะ~',
    },
  ];

  async function save() {
    if (!svgRef.current) return;
    setBusy(true);
    try {
      const blob = await toPng(svgRef.current);
      const file = new File([blob], `wrapped-${w.month.getFullYear()}-${w.month.getMonth() + 1}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `สรุปเดือน ${monthLabel}` }).catch(() => undefined);
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Wrapped · ${monthLabel}`} onCancel={onClose} onSave={save} saveDisabled={busy} saveLabel={busy ? '...' : 'แชร์'}>
      <div className="wrapped-wrap">
        <svg ref={svgRef} className="wrapped-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} fontFamily={FONT}>
          <defs>
            <linearGradient id="wrapped-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5aa5f0" />
              <stop offset="0.55" stopColor="#8f7bf0" />
              <stop offset="1" stopColor="#ff9fc0" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#wrapped-bg)" />
          <circle cx="930" cy="140" r="120" fill="#fff" opacity="0.12" />
          <circle cx="120" cy="1240" r="160" fill="#fff" opacity="0.1" />
          <text x="80" y="130" fill="#fff" fontSize="44" fontWeight="700" opacity="0.85">My Money Wrapped</text>
          <text x="80" y="215" fill="#fff" fontSize="76" fontWeight="800">สรุปเดือน {monthLabel}</text>
          <g transform="translate(760 210)">
            <Mascot mood={w.saved >= 0 ? 'cheer' : 'shocked'} size={240} />
          </g>
          {rows.map((r, i) => {
            const y = 470 + i * 205;
            return (
              <g key={r.label} transform={`translate(80 ${y})`}>
                <rect width={W - 160} height="180" rx="36" fill="#fff" opacity="0.92" />
                <text x="44" y="56" fill="#6b5bd6" fontSize="32" fontWeight="700">{r.label}</text>
                <text x="44" y="116" fill="#1b2a41" fontSize="52" fontWeight="800">{r.value}</text>
                <text x="44" y="158" fill="#5b6b82" fontSize="28">{r.sub}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </Modal>
  );
}
