export type ThemeId = 'blue' | 'pink' | 'mint' | 'lavender';

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'blue', label: 'ฟ้าพาสเทล', swatch: '#4a8fe7' },
  { id: 'pink', label: 'ชมพูหวาน', swatch: '#ec6fa0' },
  { id: 'mint', label: 'มิ้นต์', swatch: '#3fb98a' },
  { id: 'lavender', label: 'ลาเวนเดอร์', swatch: '#8b78e6' },
];

const KEY = 'app-theme';

export function getTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === v)) return v as ThemeId;
  } catch {
    /* storage unavailable */
  }
  return 'blue';
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
}

export function setTheme(id: ThemeId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable */
  }
  applyTheme(id);
}
