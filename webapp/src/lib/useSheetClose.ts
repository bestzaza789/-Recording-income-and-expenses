import { useState } from 'react';

const EXIT_MS = 220;

/** Plays the bottom-sheet exit animation before calling `onClose`. */
export function useSheetClose(onClose: () => void) {
  const [closing, setClosing] = useState(false);

  function close() {
    if (closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }

  return { closing, close };
}
