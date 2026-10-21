import { useState, type ReactElement } from 'react';
import { formatMinutes } from '../../domain/format';
import { summarizeDay, summarizeRange } from '../../domain/summary';
import { toDateKey } from '../../domain/time';
import type { AppData, AppStore, DateKey, EpochMs, TaskTotal, WorkDay } from '../../shared/types';
import { ErrorMessage } from '../components/ErrorMessage';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { SegmentHistory } from '../components/SegmentHistory';
import { SummaryTable, type AdjustEditor } from '../components/SummaryTable';
import { useActionRunner, type ActionRunner } from '../hooks/useActionRunner';
import { useAppState } from '../hooks/useAppState';
import { useNow } from '../hooks/useNow';
import '../styles/summary.css';
import { rangeOf, shiftAnchor, type PeriodMode } from './summaryPeriod';

interface SummaryScreenProps {
  store: AppStore;
}

const EMPTY_TOTAL: Omit<TaskTotal, 'taskId'> = { measuredMinutes: 0, adjustmentMinutes: 0, totalMinutes: 0 };

/** 日次は、記録のない業務にも補正を入れられるよう、表示中の全業務を行にする。 */
function dayRows(data: AppData, perTask: readonly TaskTotal[]): TaskTotal[] {
  const byId = new Map(perTask.map((t) => [t.taskId, t]));
  return [...data.tasks]
    .filter((t) => !t.archived || byId.has(t.id))
    .sort((a, b) => a.order - b.order)
    .map((t) => byId.get(t.id) ?? { taskId: t.id, ...EMPTY_TOTAL });
}

function makeEditor(
  store: AppStore,
  day: WorkDay,
  runner: ActionRunner,
  onInvalid: (message: string | null) => void,
): AdjustEditor {
  return {
    date: day.date,
    onCommit: (taskId, minutes) => {
      onInvalid(null);
      return runner.run(() => store.setAdjustment(day.date, taskId, minutes));
    },
    onInvalid,
  };
}

interface TotalsProps {
  work: number;
  rest: number;
  dayCount: number;
}

function Totals({ work, rest, dayCount }: TotalsProps): ReactElement {
  return (
    <p className="summary-totals">
      実労働 <strong>{formatMinutes(work)}</strong> ／ 休憩 {formatMinutes(rest)} ／ 記録 {dayCount}日
    </p>
  );
}

function tableRows(data: AppData, day: WorkDay | undefined, perTask: readonly TaskTotal[], now: EpochMs): readonly TaskTotal[] {
  return day ? dayRows(data, summarizeDay(day, now).perTask) : perTask;
}

/** 集計画面。日/週/月を切り替え、日次では補正入力と切り替え履歴を出す。 */
export function SummaryScreen({ store }: SummaryScreenProps): ReactElement {
  const data = useAppState(store);
  const now = useNow();
  const runner = useActionRunner();
  const [mode, setMode] = useState<PeriodMode>('day');
  const [anchor, setAnchor] = useState<DateKey>(() => toDateKey(Date.now()));
  const [inputError, setInputError] = useState<string | null>(null);

  const { from, to } = rangeOf(mode, anchor);
  const range = summarizeRange(data, from, to, now);
  const day = mode === 'day' ? data.days[from] : undefined;
  const editor = day ? makeEditor(store, day, runner, setInputError) : undefined;

  const shift = (direction: -1 | 1): void => {
    setInputError(null);
    runner.clear();
    setAnchor(shiftAnchor(mode, anchor, direction));
  };

  return (
    <div className="summary">
      <h1 className="screen__title">集計</h1>
      <PeriodSwitcher mode={mode} anchor={anchor} onModeChange={setMode} onShift={shift} />
      <ErrorMessage message={inputError ?? runner.error} />
      <section className="card" aria-label="業務別合計">
        <Totals work={range.workMinutes} rest={range.breakMinutes} dayCount={range.dayCount} />
        <SummaryTable data={data} rows={tableRows(data, day, range.perTask, now)} editor={editor} />
        {editor && <p className="muted">補正は ±分 で入力し、Enter かフォーカスを外すと反映されます。</p>}
      </section>
      {day && <SegmentHistory data={data} day={day} />}
    </div>
  );
}
