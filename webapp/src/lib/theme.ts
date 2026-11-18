export type ThemeId = 'blue' | 'pink' | 'mint' | 'lavender';

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'blue', label: 'ฟ้าพาสเทล', swatch: '#4a8fe7' },
  { id: 'pink', label: 'ชมพูหวาน', swatch: '#ec6fa0' },
  { id: 'mint', label: 'มิ้นต์', swatch: '#3fb98a' },
  { id: 'lavender', label: 'ลาเวนเดอร์', swatch: '#8b78e6' },
];

/** Page background per theme (light, dark) — mirrors --bg in index.css; used for the browser's theme-color. */
const BG: Record<ThemeId, [string, string]> = {
  blue: ['#eef5ff', '#0b1220'],
  pink: ['#fff1f6', '#1c1118'],
  mint: ['#eefaf4', '#0c1a15'],
  lavender: ['#f4f0ff', '#130f20'],
};

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
  const [light, dark] = BG[id];
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = m.media.includes('dark') ? dark : light;
  });
}

export function setTheme(id: ThemeId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable */
  }
  applyTheme(id);
}
