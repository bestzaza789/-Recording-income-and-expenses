import type { CSSProperties } from 'react';

/** Exposes a stagger index to CSS as `--i` (animation-delay: calc(var(--i) * …)). */
export function stagger(index: number): CSSProperties {
  return { '--i': index } as CSSProperties;
}
