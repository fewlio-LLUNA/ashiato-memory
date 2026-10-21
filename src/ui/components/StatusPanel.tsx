import type { ReactElement } from 'react';
import { calcFlex } from '../../domain/flex';
import { formatClock, formatElapsed, formatMinutes } from '../../domain/format';
import { summarizeDay } from '../../domain/summary';
import { segmentMs } from '../../domain/time';
import { MS_PER_MINUTE } from '../../shared/constants';
import type { AppData, EpochMs, WorkDay } from '../../shared/types';
import { segmentLabel } from './taskLabels';

interface StatusPanelProps {
  data: AppData;
  day: WorkDay;
  now: EpochMs;
}

function remainingText(remainingMs: number): string {
  const minutes = Math.ceil(Math.abs(remainingMs) / MS_PER_MINUTE);
  return remainingMs >= 0 ? `所定まで残り ${formatMinutes(minutes)}` : `所定を ${formatMinutes(minutes)} 超過`;
}

/** 計測中の業務・経過時間・終業目安・当日の実労働/休憩を表示する。 */
export function StatusPanel({ data, day, now }: StatusPanelProps): ReactElement {
  const summary = summarizeDay(day, now);
  const flex = calcFlex(day, now);
  const current = summary.current;

  return (
    <section className="card status" aria-label="現在の状況">
      <p className="status__label">{current ? '計測中' : '勤務終了'}</p>
      <p className="status__task">{current ? segmentLabel(data, current) : '—'}</p>
      {current && <p className="status__timer">{formatElapsed(segmentMs(current, now))}</p>}
      <dl className="status__facts">
        <div>
          <dt>終業目安</dt>
          <dd>{formatClock(flex.estimatedEnd)}</dd>
        </div>
        <div>
          <dt>残り</dt>
          <dd>{remainingText(flex.remainingWorkMs)}</dd>
        </div>
        <div>
          <dt>実労働</dt>
          <dd>{formatMinutes(summary.workMinutes)}</dd>
        </div>
        <div>
          <dt>休憩</dt>
          <dd>{formatMinutes(summary.breakMinutes)}</dd>
        </div>
      </dl>
    </section>
  );
}
