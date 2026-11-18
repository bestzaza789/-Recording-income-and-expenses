export type SaveTone = 'ok' | 'warn';

type Listener = (message: string, tone: SaveTone) => void;

const listeners = new Set<Listener>();

/** How long the success mark plays before the caller should close its sheet. */
export const SAVED_HOLD_MS = 750;
export const WARN_HOLD_MS = 1800;

/**
 * Shows the "saved" confirmation. Resolves once it has been on screen long
 * enough for the caller to close the sheet underneath it; the toast itself
 * lingers a little longer and fades out on its own.
 */
export function showSaved(message = 'บันทึกแล้วจ้า 🎉', opts: { celebrate?: boolean; tone?: SaveTone } = {}): Promise<void> {
  const tone = opts.tone ?? 'ok';
  listeners.forEach((l) => l(message, tone));
  if (listeners.size === 0) return Promise.resolve();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (opts.celebrate && !reduced) void celebrate();
  // A warning has more to read than a plain "saved", so it stays up a little longer.
  const hold = tone === 'warn' ? WARN_HOLD_MS : SAVED_HOLD_MS;
  return new Promise((resolve) => window.setTimeout(resolve, reduced ? 400 : hold));
}

export function subscribeSaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Pastel confetti burst. The library is loaded on demand so it stays out of the main bundle. */
export async function celebrate() {
  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({
      particleCount: 70,
      spread: 75,
      startVelocity: 38,
      origin: { y: 0.75 },
      colors: ['#9fd0ff', '#5aa5f0', '#ffc9d9', '#fff1a8', '#bff0d4'],
      disableForReducedMotion: true,
    });
  } catch {
    /* decorative only */
  }
}
