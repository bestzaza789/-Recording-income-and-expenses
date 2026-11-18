import type { InsightResult } from '../lib/insights';
import { Mascot } from './Mascot';

export function InsightCard({ insight }: { insight: InsightResult }) {
  return (
    <div className="card insight-card">
      <Mascot
        mood={insight.mood}
        size={64}
        reason={insight.mood === 'shocked'
          ? 'ตกใจ เพราะเดือนนี้ใช้มากกว่าเดือนก่อนตั้งแต่ 20% หรือใช้เกินรายรับ'
          : insight.mood === 'cheer'
            ? 'ดีใจ เพราะเดือนนี้ใช้น้อยกว่าเดือนก่อนตั้งแต่ 10% หรือเก็บได้ตั้งแต่ 20% ของรายรับ'
            : 'ยิ้ม ๆ เพราะเดือนนี้ทรงตัว ไม่ได้ดีขึ้นหรือแย่ลงชัดเจนจากเดือนก่อน'}
      />
      <ul className="insight-lines">
        {insight.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
