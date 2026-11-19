import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { markTourDone, setTourStep, stopTour, useTourState } from '../lib/tour/tourStore';
import { TOURS, type Tour, type TourStep, type TourTarget } from '../lib/tour/tours';

const PAD = 6;
const TIP_HEIGHT = 170;
/** Elements a `click` step counts as "pressed". */
const CLICKABLE = 'button, a, label, select, [role="radio"], [role="button"]';
/** How long a step waits for its target before giving up (optional steps skip, others offer to skip). */
const WAIT_OPTIONAL_MS = 1200;
const WAIT_REQUIRED_MS = 5000;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && !el.closest('[inert]') && getComputedStyle(el).visibility !== 'hidden';
}

function findTarget(target: TourTarget): HTMLElement | null {
  const sel = typeof target === 'string' ? target : target.sel;
  const words = typeof target === 'string' ? undefined : target.text?.split('|');
  const matches = Array.from(document.querySelectorAll<HTMLElement>(sel));
  return (
    matches.find((el) => {
      if (el.closest('.tour-tip') || !isVisible(el)) return false;
      if (!words) return true;
      const label = `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
      return words.some((w) => label.includes(w));
    }) ?? null
  );
}

function sameRect(a: Rect, b: Rect): boolean {
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

function tipPosition(rect: Rect | null, width: number): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect) return { left: '50%', top: '50%', width, transform: 'translate(-50%, -50%)' };
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 16), vw - width - 16);
  const below = vh - (rect.top + rect.height + PAD);
  const above = rect.top - PAD;
  if (below >= TIP_HEIGHT) return { left, width, top: rect.top + rect.height + PAD + 12 };
  if (above >= TIP_HEIGHT) return { left, width, bottom: vh - rect.top + PAD + 12 };
  // The target fills the screen: park the tip on the half it doesn't centre on.
  return rect.top + rect.height / 2 > vh / 2 ? { left, width, top: 16 } : { left, width, bottom: 16 };
}

function TourLayer({ tour, index }: { tour: Tour; index: number }) {
  const step: TourStep = tour.steps[index];
  const total = tour.steps.length;
  const mode = step.mode ?? (step.target ? 'click' : 'info');
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [rect, setRect] = useState<Rect | null>(null);
  const [lost, setLost] = useState(false);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(0);
  const targetRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const advancedFor = useRef(-1);

  const advance = useCallback(() => {
    if (advancedFor.current === index) return;
    advancedFor.current = index;
    if (index + 1 >= total) {
      markTourDone(tour.id);
      stopTour();
      navigate('/guide');
    } else {
      setTourStep(index + 1);
    }
  }, [index, total, tour.id, navigate]);

  useEffect(() => {
    setRect(null);
    setLost(false);
    setMessage('');
    targetRef.current = null;
  }, [index]);

  useEffect(() => {
    if (step.route && pathname !== step.route) navigate(step.route, { replace: true });
  }, [step.route, pathname, navigate]);

  // Track the target continuously: it may mount late (after a navigation or a sheet opening),
  // animate in, or scroll.
  useEffect(() => {
    if (!step.target) return;
    const target = step.target;
    const startedAt = performance.now();
    let scrolled = false;
    const tick = () => {
      const el = findTarget(target);
      targetRef.current = el;
      if (el) {
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        const r = el.getBoundingClientRect();
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect((prev) => (prev && sameRect(prev, next) ? prev : next));
        setLost(false);
      } else {
        const waited = performance.now() - startedAt;
        if (step.optional && waited > WAIT_OPTIONAL_MS) advance();
        else if (!step.optional && waited > WAIT_REQUIRED_MS) setLost(true);
      }
    };
    tick();
    // An interval rather than requestAnimationFrame: frames are paused or throttled in background tabs.
    const timer = setInterval(tick, 40);
    return () => clearInterval(timer);
  }, [step, advance]);

  // Only the spotlighted element (and the tip) can be used; everything else is blocked so the
  // user can't wander off mid-tour.
  useEffect(() => {
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      setMessage('กดตรงที่ไฮไลต์ก่อนนะ');
      setShake((s) => s + 1);
    };
    const onClick = (e: MouseEvent) => {
      const node = e.target as HTMLElement;
      if (tipRef.current?.contains(node)) return;
      const el = targetRef.current;
      if (!el || !el.contains(node)) return block(e);
      if (mode === 'info') return block(e);
      if (mode === 'click') {
        const button = node.closest<HTMLButtonElement>(CLICKABLE);
        const pressed = button && el.contains(button) && !button.disabled
          && (!step.clickText || (button.textContent ?? '').includes(step.clickText));
        // Let the click through first so the app reacts (opens the sheet, saves), then move on.
        if (pressed) setTimeout(advance, 0);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [mode, step, advance]);

  function onNext() {
    if (mode === 'fill') {
      const el = targetRef.current;
      const problem = el && step.validate ? step.validate(el) : null;
      if (problem) {
        setMessage(problem);
        setShake((s) => s + 1);
        return;
      }
    }
    advance();
  }

  const showNext = mode !== 'click';
  const showSkipStep = mode === 'click' && (step.canSkip || lost);
  const waiting = !!step.target && !rect && !lost;
  const last = index === total - 1;
  const width = Math.min(340, window.innerWidth - 32);

  return (
    <div className="tour-layer">
      {!waiting && (rect && !lost ? (
        <div
          className="tour-spot"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="tour-dim" />
      ))}
      {!waiting && (
        <div
          ref={tipRef}
          className={`tour-tip${shake % 2 ? ' shake-a' : shake ? ' shake-b' : ''}`}
          role="dialog"
          aria-label={tour.title}
          style={tipPosition(lost ? null : rect, width)}
        >
          <div className="tour-tip-head">
            <span>{tour.emoji} {tour.title}</span>
            <span>{index + 1}/{total}</span>
          </div>
          <div className="tour-tip-text">{lost ? 'หาปุ่มนี้ไม่เจอ ข้ามขั้นนี้ไปก่อนก็ได้' : step.text}</div>
          {message && <div className="tour-tip-msg">{message}</div>}
          <div className="tour-tip-actions">
            <button type="button" className="tour-link" onClick={stopTour}>ข้ามคู่มือ</button>
            {showSkipStep && <button type="button" className="tour-link" onClick={advance}>ข้ามขั้นนี้</button>}
            {showNext && (
              <button type="button" className="confirm-btn ok" onClick={onNext}>
                {step.nextLabel ?? (last ? 'เสร็จสิ้น' : 'ถัดไป')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Runs the tour started with `startTour`: spotlights each step's element and waits for the user to use it. */
export function TourOverlay() {
  const { id, index } = useTourState();
  const tour = TOURS.find((t) => t.id === id);
  if (!tour || index >= tour.steps.length) return null;
  return <TourLayer key={tour.id} tour={tour} index={index} />;
}
