import type { ReactElement } from 'react';
import { findStaleDay, summarizeDay } from '../../domain/summary';
import { toDateKey } from '../../domain/time';
import type { AppData, AppStore, EpochMs, WorkDay } from '../../shared/types';
import { DayTotals } from '../components/DayTotals';
import { ErrorMessage } from '../components/ErrorMessage';
import { NewTaskForm } from '../components/NewTaskForm';
import { SegmentHistory } from '../components/SegmentHistory';
import { StatusPanel } from '../components/StatusPanel';
import { TaskButtons } from '../components/TaskButtons';
import { useActionRunner, type ActionRunner } from '../hooks/useActionRunner';
import { useAppState } from '../hooks/useAppState';
import { useNow } from '../hooks/useNow';
import { PlayIcon, StopIcon } from '../icons';
import '../styles/today.css';

interface TodayScreenProps {
  store: AppStore;
}

interface WorkingViewProps {
  store: AppStore;
  data: AppData;
  day: WorkDay;
  now: EpochMs;
  runner: ActionRunner;
}

function WorkingView({ store, data, day, now, runner }: WorkingViewProps): ReactElement {
  const summary = summarizeDay(day, now);
  const { run } = runner;
  return (
    <>
      <StatusPanel data={data} day={day} now={now} />
      <TaskButtons
        tasks={data.tasks}
        current={summary.current}
        onSwitch={(target) => run(() => store.switchTo(target))}
      />
      <NewTaskForm onCreate={(name) => run(() => store.createTaskAndSwitch(name))} />
      <DayTotals data={data} summary={summary} />
      <button type="button" className="btn btn--danger end-btn" onClick={() => run(() => store.clockOut())}>
        <StopIcon size={20} />
        業務終了
      </button>
    </>
  );
}

function FinishedView({ store, data, day, now, runner }: WorkingViewProps): ReactElement {
  return (
    <>
      <StatusPanel data={data} day={day} now={now} />
      <DayTotals data={data} summary={summarizeDay(day, now)} />
      <button type="button" className="btn end-btn" onClick={() => runner.run(() => store.resumeDay())}>
        <PlayIcon size={20} />
        勤務を再開する
      </button>
    </>
  );
}

function StartView({ store, runner }: Pick<WorkingViewProps, 'store' | 'runner'>): ReactElement {
  return (
    <section className="card start">
      <p className="muted">業務開始を押すと「庶務」の計測が始まります。</p>
      <button type="button" className="btn btn--primary start__btn" onClick={() => runner.run(() => store.clockIn())}>
        <PlayIcon size={24} />
        業務開始
      </button>
    </section>
  );
}

function StaleNotice(): ReactElement {
  return <p className="notice">前回の業務終了が押されていません。終了時刻を確定すると操作できます。</p>;
}

function renderBody(props: WorkingViewProps | null, store: AppStore, runner: ActionRunner): ReactElement {
  if (props === null) return <StartView store={store} runner={runner} />;
  return props.day.clockOut === null ? <WorkingView {...props} /> : <FinishedView {...props} />;
}

/** 今日画面。勤務前／勤務中／終了後で表示を切り替える。 */
export function TodayScreen({ store }: TodayScreenProps): ReactElement {
  const data = useAppState(store);
  const now = useNow();
  const runner = useActionRunner();
  const today = data.days[toDateKey(now)];
  const stale = findStaleDay(data, now) !== null;
  const props = today ? { store, data, day: today, now, runner } : null;

  return (
    <div className="today">
      <h1 className="screen__title">今日</h1>
      <ErrorMessage message={runner.error} />
      {stale ? <StaleNotice /> : renderBody(props, store, runner)}
      {today && !stale && <SegmentHistory key={today.date} store={store} data={data} day={today} collapsible />}
    </div>
  );
}
