import { MS_PER_MINUTE } from '../shared/constants';
import type {
  AppData,
  DateKey,
  DaySummary,
  EpochMs,
  RangeSummary,
  Segment,
  TaskId,
  TaskTotal,
  WorkDay,
} from '../shared/types';
import { segmentMs, toDateKey } from './time';

/** 業務ごとの実測ミリ秒（出現順を保つ） */
function sumTaskMs(day: WorkDay, now: EpochMs): Map<TaskId, number> {
  const result = new Map<TaskId, number>();
  for (const seg of day.segments) {
    if (seg.kind !== 'task' || seg.taskId === null) continue;
    result.set(seg.taskId, (result.get(seg.taskId) ?? 0) + segmentMs(seg, now));
  }
  return result;
}

function sumBreakMs(day: WorkDay, now: EpochMs): number {
  return day.segments
    .filter((seg) => seg.kind === 'break')
    .reduce((acc, seg) => acc + segmentMs(seg, now), 0);
}

/**
 * 最大剰余法で業務別の分を配分する。
 * 合計は floor(Σms / 分) と必ず一致する。剰余が同じなら出現順を優先する。
 */
export function allocateMinutes(msByTask: Map<TaskId, number>): Map<TaskId, number> {
  const entries = [...msByTask.entries()].map(([taskId, ms], index) => ({
    taskId,
    index,
    minutes: Math.floor(ms / MS_PER_MINUTE),
    remainder: ms % MS_PER_MINUTE,
  }));
  const totalMs = entries.reduce((acc, e) => acc + (msByTask.get(e.taskId) ?? 0), 0);
  const target = Math.floor(totalMs / MS_PER_MINUTE);
  const base = entries.reduce((acc, e) => acc + e.minutes, 0);
  const byRemainder = [...entries].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  byRemainder.slice(0, target - base).forEach((e) => {
    e.minutes += 1;
  });
  return new Map(entries.map((e) => [e.taskId, e.minutes]));
}

function byTotalDesc(a: TaskTotal, b: TaskTotal): number {
  return b.totalMinutes - a.totalMinutes;
}

function buildPerTask(day: WorkDay, measured: Map<TaskId, number>): TaskTotal[] {
  const ids = new Set<TaskId>([...measured.keys(), ...Object.keys(day.adjustments)]);
  const totals: TaskTotal[] = [];
  for (const taskId of ids) {
    const measuredMinutes = measured.get(taskId) ?? 0;
    const adjustmentMinutes = day.adjustments[taskId] ?? 0;
    if (measuredMinutes === 0 && adjustmentMinutes === 0) continue;
    totals.push({
      taskId,
      measuredMinutes,
      adjustmentMinutes,
      totalMinutes: measuredMinutes + adjustmentMinutes,
    });
  }
  return totals.sort(byTotalDesc);
}

function findCurrent(day: WorkDay): Segment | null {
  const last = day.segments[day.segments.length - 1];
  return last !== undefined && last.end === null ? last : null;
}

/** 1日分を集計する。now は計測中区間の終端に使う */
export function summarizeDay(day: WorkDay, now: EpochMs): DaySummary {
  const msByTask = sumTaskMs(day, now);
  const measured = allocateMinutes(msByTask);
  const workMinutes = [...measured.values()].reduce((acc, m) => acc + m, 0);
  return {
    date: day.date,
    workMinutes,
    breakMinutes: Math.floor(sumBreakMs(day, now) / MS_PER_MINUTE),
    perTask: buildPerTask(day, measured),
    current: findCurrent(day),
  };
}

function mergeTotals(summaries: DaySummary[]): TaskTotal[] {
  const merged = new Map<TaskId, TaskTotal>();
  for (const summary of summaries) {
    for (const t of summary.perTask) {
      const prev = merged.get(t.taskId);
      merged.set(t.taskId, {
        taskId: t.taskId,
        measuredMinutes: (prev?.measuredMinutes ?? 0) + t.measuredMinutes,
        adjustmentMinutes: (prev?.adjustmentMinutes ?? 0) + t.adjustmentMinutes,
        totalMinutes: (prev?.totalMinutes ?? 0) + t.totalMinutes,
      });
    }
  }
  return [...merged.values()].sort(byTotalDesc);
}

/** from〜to（両端含む）の各日を集計し、業務ごとに合算する */
export function summarizeRange(
  data: AppData,
  from: DateKey,
  to: DateKey,
  now: EpochMs,
): RangeSummary {
  const summaries = Object.values(data.days)
    .filter((day) => day.date >= from && day.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => summarizeDay(day, now));
  return {
    from,
    to,
    workMinutes: summaries.reduce((acc, s) => acc + s.workMinutes, 0),
    breakMinutes: summaries.reduce((acc, s) => acc + s.breakMinutes, 0),
    perTask: mergeTotals(summaries),
    dayCount: summaries.length,
  };
}

/** 勤務中（clockOut が null）の日。複数あれば最新日 */
export function getActiveDay(data: AppData): WorkDay | null {
  const active = Object.values(data.days).filter((day) => day.clockOut === null);
  active.sort((a, b) => b.date.localeCompare(a.date));
  return active[0] ?? null;
}

/** 勤務中のまま日付が過去になっている日（打刻忘れ） */
export function findStaleDay(data: AppData, now: EpochMs): WorkDay | null {
  const active = getActiveDay(data);
  return active !== null && active.date < toDateKey(now) ? active : null;
}
