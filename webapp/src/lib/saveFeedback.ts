type Listener = (message: string) => void;

const listeners = new Set<Listener>();

/** How long the success mark plays before the caller should close its sheet. */
export const SAVED_HOLD_MS = 750;

/**
 * Shows the "saved" confirmation. Resolves once it has been on screen long
 * enough for the caller to close the sheet underneath it; the toast itself
 * lingers a little longer and fades out on its own.
 */
export function showSaved(message = 'บันทึกสำเร็จ'): Promise<void> {
  listeners.forEach((l) => l(message));
  if (listeners.size === 0) return Promise.resolve();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Promise((resolve) => window.setTimeout(resolve, reduced ? 400 : SAVED_HOLD_MS));
}

export function subscribeSaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
