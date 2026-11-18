import type { InsightResult } from '../lib/insights';
import { Mascot } from './Mascot';

export function InsightCard({ insight }: { insight: InsightResult }) {
  return (
    <div className="card insight-card">
      <Mascot mood={insight.mood} size={64} />
      <ul className="insight-lines">
        {insight.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
