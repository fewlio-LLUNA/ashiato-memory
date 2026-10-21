import type { ReactElement } from 'react';
import { formatClock } from '../../domain/format';
import type { AppData, WorkDay } from '../../shared/types';
import { segmentLabel } from './taskLabels';

interface SegmentHistoryProps {
  data: AppData;
  day: WorkDay;
}

/** 切り替え履歴（時刻と業務）。計測中の区間は終了時刻の代わりに「計測中」。 */
export function SegmentHistory({ data, day }: SegmentHistoryProps): ReactElement {
  return (
    <section className="card" aria-label="切り替え履歴">
      <h2 className="section-title">切り替え履歴</h2>
      <ol className="history">
        {day.segments.map((seg) => (
          <li key={seg.start} className="history__row">
            <span className="history__time">
              {formatClock(seg.start)} 〜 {seg.end === null ? '計測中' : formatClock(seg.end)}
            </span>
            <span>{segmentLabel(data, seg)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
