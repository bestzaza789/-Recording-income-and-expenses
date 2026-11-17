export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' paints the confirm button red; 'alert' shows a single OK button. */
  tone?: 'danger' | 'default' | 'alert';
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

type Listener = (request: ConfirmRequest) => void;

let listener: Listener | null = null;

/** In-app replacement for window.confirm — resolves true when the user confirms. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (!listener) return Promise.resolve(window.confirm([options.title, options.message].filter(Boolean).join('\n\n')));
  return new Promise((resolve) => listener!({ ...options, id: Date.now(), resolve }));
}

/** Confirmation preset for deleting something; `what` names the item in the title. */
export function confirmDelete(what: string, message = 'ลบแล้วกู้คืนไม่ได้'): Promise<boolean> {
  return confirmDialog({ title: `ลบ${what}?`, message, confirmLabel: 'ลบ', tone: 'danger' });
}

export function alertDialog(title: string, message?: string): Promise<boolean> {
  return confirmDialog({ title, message, confirmLabel: 'ตกลง', tone: 'alert' });
}

export function registerConfirmHost(l: Listener): () => void {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}
