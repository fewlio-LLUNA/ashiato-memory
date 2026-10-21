import type { ReactElement } from 'react';
import { formatMinutes } from '../../domain/format';
import type { AppData, DaySummary } from '../../shared/types';
import { taskNameOf } from './taskLabels';

interface DayTotalsProps {
  data: AppData;
  summary: DaySummary;
}

/** 当日の業務別累計。補正があれば内訳を併記する。 */
export function DayTotals({ data, summary }: DayTotalsProps): ReactElement {
  return (
    <section className="card" aria-label="今日の業務別累計">
      <h2 className="section-title">今日の業務別累計</h2>
      {summary.perTask.length === 0 ? (
        <p className="muted">まだ記録がありません。</p>
      ) : (
        <ul className="totals">
          {summary.perTask.map((t) => (
            <li key={t.taskId} className="totals__row">
              <span>{taskNameOf(data, t.taskId)}</span>
              <span className="totals__value">
                {formatMinutes(t.totalMinutes)}
                {t.adjustmentMinutes !== 0 && (
                  <span className="muted"> （補正 {t.adjustmentMinutes > 0 ? '+' : ''}{t.adjustmentMinutes}分）</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
