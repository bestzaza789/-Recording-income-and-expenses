import { useId, useState } from 'react';
import { formatCurrency } from '../lib/format';
import { stagger } from '../lib/motion';
import { useCountUp } from '../lib/useCountUp';

export interface DonutSlice {
  key: string;
  name: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  centerLabel: string;
  legend?: boolean;
}

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

export function DonutChart({ slices, centerLabel, legend = true }: Props) {
  const maskId = `donut-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const selected = slices.find((s) => s.key === selectedKey) ?? null;
  const shown = useCountUp(selected ? selected.value : total, 700);

  let cursor = 0;
  const segments = slices.map((s) => {
    const length = total > 0 ? (s.value / total) * CIRCUMFERENCE : 0;
    const segment = { ...s, start: cursor, length };
    cursor += length;
    return segment;
  });

  const toggle = (key: string) => setSelectedKey((current) => (current === key ? null : key));

  return (
    <div className={`donut${slices.length === 0 || !legend ? ' is-empty' : ''}`}>
      <div className="donut-figure">
        <svg viewBox="0 0 200 200" className="donut-svg" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <circle
                className="donut-reveal"
                cx="100" cy="100" r={RADIUS}
                fill="none" stroke="#fff" strokeWidth="46"
                strokeDasharray={CIRCUMFERENCE}
                transform="rotate(-90 100 100)"
              />
            </mask>
          </defs>
          <circle className="donut-track" cx="100" cy="100" r={RADIUS} fill="none" />
          <g mask={`url(#${maskId})`}>
            {segments.map((seg) => {
              const state = selectedKey === seg.key ? ' is-selected' : selectedKey ? ' is-dimmed' : '';
              const visible = Math.max(seg.length - (segments.length > 1 ? GAP : 0), 0.01);
              return (
                <circle
                  key={seg.key}
                  className={`donut-seg${state}`}
                  cx="100" cy="100" r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeDasharray={`${visible} ${CIRCUMFERENCE}`}
                  transform={`rotate(${(seg.start / CIRCUMFERENCE) * 360 - 90} 100 100)`}
                  onClick={() => toggle(seg.key)}
                />
              );
            })}
          </g>
        </svg>
        <div className="donut-center" aria-live="polite">
          <span className="donut-center-label">{selected ? selected.name : centerLabel}</span>
          <span className="donut-center-value">{formatCurrency(shown)}</span>
          {selected && total > 0 && (
            <span className="donut-center-pct">{Math.round((selected.value / total) * 100)}%</span>
          )}
        </div>
      </div>

      {legend && slices.length > 0 && (
        <ul className="donut-legend">
          {slices.map((s, i) => (
            <li key={s.key} style={stagger(i)}>
              <button
                type="button"
                className={`donut-legend-item${selectedKey === s.key ? ' is-selected' : selectedKey ? ' is-dimmed' : ''}`}
                aria-pressed={selectedKey === s.key}
                onClick={() => toggle(s.key)}
              >
                <span className="donut-legend-dot" style={{ background: s.color }} />
                <span className="donut-legend-name">{s.name}</span>
                <span className="donut-legend-value">{formatCurrency(s.value)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
