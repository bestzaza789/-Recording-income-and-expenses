import { useState, type CSSProperties } from 'react';
import { THEMES, getTheme, setTheme, type ThemeId } from '../lib/theme';

export function ThemePicker() {
  const [current, setCurrent] = useState<ThemeId>(getTheme);

  function pick(id: ThemeId) {
    setTheme(id);
    setCurrent(id);
  }

  return (
    <div className="card theme-picker">
      <div className="theme-picker-title">ธีมสี</div>
      <div className="theme-options" role="radiogroup" aria-label="ธีมสี">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={current === t.id}
            className={`theme-option${current === t.id ? ' is-active' : ''}`}
            style={{ '--swatch': t.swatch } as CSSProperties}
            onClick={() => pick(t.id)}
          >
            <span className="theme-dot" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
