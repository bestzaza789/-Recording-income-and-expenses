import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type MascotMood = 'happy' | 'cheer' | 'sleepy' | 'shocked';

interface Props {
  mood?: MascotMood;
  size?: number;
  /** Why the mascot looks this way. When set, tapping the mascot shows it in a speech bubble. */
  reason?: string;
}

/** Little blue cat-blob. Pure inline SVG so it costs no extra requests. */
export function Mascot({ reason, ...props }: Props) {
  if (!reason) return <MascotArt {...props} />;
  return <ExplainedMascot reason={reason} {...props} />;
}

const BUBBLE_W = 240;

function ExplainedMascot({ reason, ...props }: Props & { reason: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const timer = window.setTimeout(close, 6000);
    // Deferred so the tap that opened the bubble doesn't immediately close it.
    const attach = window.setTimeout(() => document.addEventListener('pointerdown', close), 0);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(attach);
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  function toggle() {
    if (pos) return setPos(null);
    const r = ref.current!.getBoundingClientRect();
    const center = r.left + r.width / 2;
    // Fixed + portal: the bubble escapes clipping (the hero has overflow: hidden) and the
    // transformed .page children, which would otherwise trap a fixed element.
    const left = Math.min(Math.max(12, center - BUBBLE_W / 2), window.innerWidth - BUBBLE_W - 12);
    setPos({ top: r.bottom + 8, left, arrow: center - left });
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="mascot-btn"
        onClick={toggle}
        aria-label="ทำไมน้องแมวเป็นแบบนี้"
        aria-expanded={pos !== null}
      >
        <MascotArt {...props} />
      </button>
      {pos && createPortal(
        <div className="mascot-tip" role="tooltip" style={{ top: pos.top, left: pos.left, width: BUBBLE_W, ['--arrow-x' as string]: `${pos.arrow}px` }}>
          {reason}
        </div>,
        document.body,
      )}
    </>
  );
}

function MascotArt({ mood = 'happy', size = 72 }: Props) {
  const gid = useId();
  const eyeY = 44;

  return (
    <svg
      className={`mascot mascot-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label="มาสคอต"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--mascot-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mascot-2)' }} />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="73" rx="20" ry="3.5" fill="currentColor" opacity="0.12" />
      <g className="mascot-body">
        {/* ears */}
        <path d="M17 34 L19 12 L34 24 Z" fill={`url(#${gid})`} />
        <path d="M63 34 L61 12 L46 24 Z" fill={`url(#${gid})`} />
        <path d="M21 28 L22 18 L29 24 Z" fill="#ffc9d9" />
        <path d="M59 28 L58 18 L51 24 Z" fill="#ffc9d9" />
        {/* body */}
        <ellipse cx="40" cy="46" rx="29" ry="26" fill={`url(#${gid})`} />
        <ellipse cx="30" cy="34" rx="9" ry="5" fill="#fff" opacity="0.28" />
        {/* cheeks */}
        <ellipse cx="22" cy="52" rx="5" ry="3.2" fill="#ffb3c8" opacity="0.8" />
        <ellipse cx="58" cy="52" rx="5" ry="3.2" fill="#ffb3c8" opacity="0.8" />

        {mood === 'happy' && (
          <g className="mascot-eyes">
            <ellipse cx="29" cy={eyeY} rx="3.2" ry="4.2" fill="#1b2a41" />
            <ellipse cx="51" cy={eyeY} rx="3.2" ry="4.2" fill="#1b2a41" />
            <circle cx="30" cy={eyeY - 1.5} r="1.1" fill="#fff" />
            <circle cx="52" cy={eyeY - 1.5} r="1.1" fill="#fff" />
            <path d="M34 53 Q40 59 46 53" stroke="#1b2a41" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </g>
        )}
        {mood === 'cheer' && (
          <g>
            <path d="M25 46 Q29 39 33 46" stroke="#1b2a41" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M47 46 Q51 39 55 46" stroke="#1b2a41" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M32 52 Q40 63 48 52 Z" fill="#1b2a41" />
            <path d="M36 57 Q40 60 44 57" fill="#ff8fab" />
            <path className="mascot-arm mascot-arm-l" d="M13 50 Q5 40 8 30" style={{ stroke: 'var(--mascot-2)' }} strokeWidth="6" fill="none" strokeLinecap="round" />
            <path className="mascot-arm mascot-arm-r" d="M67 50 Q75 40 72 30" style={{ stroke: 'var(--mascot-2)' }} strokeWidth="6" fill="none" strokeLinecap="round" />
          </g>
        )}
        {mood === 'sleepy' && (
          <g>
            <path d="M25 45 Q29 49 33 45" stroke="#1b2a41" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M47 45 Q51 49 55 45" stroke="#1b2a41" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <ellipse cx="40" cy="56" rx="3" ry="2.2" fill="#1b2a41" opacity="0.8" />
            <text className="mascot-zzz" x="60" y="22" fontSize="11" fontWeight="800" fill="currentColor">z</text>
            <text className="mascot-zzz mascot-zzz-2" x="68" y="12" fontSize="8" fontWeight="800" fill="currentColor">z</text>
          </g>
        )}
        {mood === 'shocked' && (
          <g>
            <ellipse cx="29" cy={eyeY} rx="4.6" ry="5.6" fill="#fff" />
            <ellipse cx="51" cy={eyeY} rx="4.6" ry="5.6" fill="#fff" />
            <circle cx="29" cy={eyeY} r="2" fill="#1b2a41" />
            <circle cx="51" cy={eyeY} r="2" fill="#1b2a41" />
            <ellipse cx="40" cy="57" rx="3.6" ry="4.6" fill="#1b2a41" />
            <path className="mascot-sweat" d="M66 30 Q70 36 66 40 Q62 36 66 30 Z" fill="#cfe8ff" stroke="#5aa5f0" strokeWidth="1" />
          </g>
        )}
      </g>
    </svg>
  );
}
