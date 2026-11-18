import type { CSSProperties, ReactNode } from 'react';
import { Mascot, type MascotMood } from './Mascot';

interface Props {
  mood?: MascotMood;
  children: ReactNode;
  style?: CSSProperties;
}

export function EmptyState({ mood = 'sleepy', children, style }: Props) {
  return (
    <div className="empty-state has-mascot" style={style}>
      <Mascot mood={mood} size={84} />
      <div>{children}</div>
    </div>
  );
}
