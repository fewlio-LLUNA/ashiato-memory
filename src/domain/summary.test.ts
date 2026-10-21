import { describe, expect, it } from 'vitest';
import { GENERAL_TASK_ID, MS_PER_MINUTE } from '../shared/constants';
import type { AppData, Segment, WorkDay } from '../shared/types';
import {
  allocateMinutes,
  findStaleDay,
  getActiveDay,
  summarizeDay,
  summarizeRange,
} from './summary';

const MIN = MS_PER_MINUTE;
const SEC = 1000;
const BASE = new Date(2026, 9, 21, 9, 0, 0).getTime();

function task(taskId: string, startMs: number, endMs: number | null): Segment {
  return { kind: 'task', taskId, start: BASE + startMs, end: endMs === null ? null : BASE + endMs };
}

function rest(startMs: number, endMs: number | null): Segment {
  return { kind: 'break', taskId: null, start: BASE + startMs, end: endMs === null ? null : BASE + endMs };
}

function makeDay(date: string, segments: Segment[], over: Partial<WorkDay> = {}): WorkDay {
  return { date, clockIn: BASE, clockOut: BASE + 8 * 60 * MIN, segments, adjustments: {}, ...over };
}

function makeData(...days: WorkDay[]): AppData {
  return { schemaVersion: 1, tasks: [], days: Object.fromEntries(days.map((d) => [d.date, d])) };
}

describe('allocateMinutes（最大剰余法）', () => {
  it('合計が floor(総ms/分) に一致し、剰余の大きい業務へ端数を配る', () => {
    const ms = new Map([
      ['a', 59 * SEC],
      ['b', 59 * SEC],
      ['c', 59 * SEC],
    ]);
    const result = allocateMinutes(ms);
    // 合計 177 秒 → 2 分。剰余が同じなので先頭 2 つに配る
    expect([...result.values()].reduce((x, y) => x + y, 0)).toBe(2);
    expect(result.get('a')).toBe(1);
    expect(result.get('b')).toBe(1);
    expect(result.get('c')).toBe(0);
  });

  it('剰余が最も大きい業務が端数を得る', () => {
    const ms = new Map([
      ['a', 1 * MIN + 10 * SEC],
      ['b', 1 * MIN + 50 * SEC],
      ['c', 1 * MIN + 40 * SEC],
    ]);
    const result = allocateMinutes(ms);
    // 合計 280 秒 → 4 分。floor 合計 3 なので 1 つ配る: 剰余最大の b(50 秒)
    expect(result.get('a')).toBe(1);
    expect(result.get('b')).toBe(2);
    expect(result.get('c')).toBe(1);
  });

  it('空なら空', () => {
    expect(allocateMinutes(new Map()).size).toBe(0);
  });
});

describe('summarizeDay', () => {
  it('業務別の合計は workMinutes と必ず一致する', () => {
    const day = makeDay('2026-10-21', [
      task('a', 0, 100 * SEC),
      task('b', 100 * SEC, 190 * SEC),
      task('c', 190 * SEC, 299 * SEC),
    ]);
    const s = summarizeDay(day, BASE + 10 * 60 * MIN);
    const sum = s.perTask.reduce((acc, t) => acc + t.measuredMinutes, 0);
    expect(s.workMinutes).toBe(4); // 299 秒 → 4 分
    expect(sum).toBe(s.workMinutes);
  });

  it('休憩は workMinutes に含めず breakMinutes に出る（60 分未満の端数は切り捨て）', () => {
    const day = makeDay('2026-10-21', [
      task('a', 0, 120 * MIN),
      rest(120 * MIN, 150 * MIN + 59 * SEC),
      task('a', 150 * MIN + 59 * SEC, 200 * MIN),
    ]);
    const s = summarizeDay(day, BASE + 300 * MIN);
    expect(s.breakMinutes).toBe(30);
    expect(s.workMinutes).toBe(120 + 49); // 120 + (200*60-150*60-59)s = 49分1秒
  });

  it('休憩が 60 分を超えても同様に集計する', () => {
    const day = makeDay('2026-10-21', [task('a', 0, 60 * MIN), rest(60 * MIN, 150 * MIN)]);
    const s = summarizeDay(day, BASE + 300 * MIN);
    expect(s.breakMinutes).toBe(90);
    expect(s.workMinutes).toBe(60);
  });

  it('計測中区間は now まで数え、current に入る', () => {
    const open = task('a', 0, null);
    const day = makeDay('2026-10-21', [open], { clockOut: null });
    const s = summarizeDay(day, BASE + 30 * MIN);
    expect(s.workMinutes).toBe(30);
    expect(s.current).toBe(open);
  });

  it('終了済みの日は current が null', () => {
    const s = summarizeDay(makeDay('2026-10-21', [task('a', 0, MIN)]), BASE + MIN);
    expect(s.current).toBeNull();
  });

  it('補正は合計に加わり、実測 0 分でも補正があれば一覧に出る', () => {
    const day = makeDay('2026-10-21', [task('a', 0, 60 * MIN)], { adjustments: { a: -10, b: 15 } });
    const s = summarizeDay(day, BASE + 120 * MIN);
    expect(s.perTask).toEqual([
      { taskId: 'a', measuredMinutes: 60, adjustmentMinutes: -10, totalMinutes: 50 },
      { taskId: 'b', measuredMinutes: 0, adjustmentMinutes: 15, totalMinutes: 15 },
    ]);
    expect(s.workMinutes).toBe(60); // 補正は workMinutes に含めない
  });

  it('実測 0 分かつ補正なしの業務は含めない / totalMinutes 降順', () => {
    const day = makeDay('2026-10-21', [
      task('a', 0, 20 * SEC),
      task('b', 20 * SEC, 20 * SEC + 90 * MIN),
      task(GENERAL_TASK_ID, 20 * SEC + 90 * MIN, 20 * SEC + 100 * MIN),
    ]);
    const s = summarizeDay(day, BASE + 200 * MIN);
    expect(s.perTask.map((t) => t.taskId)).toEqual(['b', GENERAL_TASK_ID]);
  });

  it('日またぎ（0 時を越える区間）も区間の長さ通りに数える', () => {
    const start = new Date(2026, 9, 21, 23, 30).getTime();
    const day: WorkDay = {
      date: '2026-10-21',
      clockIn: start,
      clockOut: null,
      segments: [{ kind: 'task', taskId: 'a', start, end: null }],
      adjustments: {},
    };
    const s = summarizeDay(day, new Date(2026, 9, 22, 1, 0).getTime());
    expect(s.workMinutes).toBe(90);
  });
});

describe('summarizeRange', () => {
  const d1 = makeDay('2026-10-19', [task('a', 0, 60 * MIN)], { adjustments: { a: 5 } });
  const d2 = makeDay('2026-10-20', [task('a', 0, 30 * MIN), task('b', 30 * MIN, 50 * MIN)]);
  const d3 = makeDay('2026-10-27', [task('b', 0, 10 * MIN)]);
  const data = makeData(d1, d2, d3);
  const now = BASE + 24 * 60 * MIN;

  it('範囲内の日だけを業務ごとに合算する', () => {
    const r = summarizeRange(data, '2026-10-19', '2026-10-25', now);
    expect(r.dayCount).toBe(2);
    expect(r.workMinutes).toBe(110);
    expect(r.perTask).toEqual([
      { taskId: 'a', measuredMinutes: 90, adjustmentMinutes: 5, totalMinutes: 95 },
      { taskId: 'b', measuredMinutes: 20, adjustmentMinutes: 0, totalMinutes: 20 },
    ]);
  });

  it('両端の日を含む', () => {
    const r = summarizeRange(data, '2026-10-20', '2026-10-27', now);
    expect(r.dayCount).toBe(2);
    expect(r.workMinutes).toBe(60);
  });

  it('記録がなければ 0 日', () => {
    const r = summarizeRange(data, '2026-11-01', '2026-11-30', now);
    expect(r).toMatchObject({ dayCount: 0, workMinutes: 0, breakMinutes: 0, perTask: [] });
  });
});

describe('getActiveDay / findStaleDay', () => {
  const closed = makeDay('2026-10-20', [task('a', 0, MIN)]);
  const working = makeDay('2026-10-21', [task('a', 0, null)], { clockOut: null });
  const todayNoon = new Date(2026, 9, 21, 12, 0).getTime();
  const tomorrowMorning = new Date(2026, 9, 22, 8, 0).getTime();

  it('勤務中の日を返す。なければ null', () => {
    expect(getActiveDay(makeData(closed, working))).toBe(working);
    expect(getActiveDay(makeData(closed))).toBeNull();
  });

  it('当日の勤務中は打刻忘れではない', () => {
    expect(findStaleDay(makeData(working), todayNoon)).toBeNull();
  });

  it('日付が過去の勤務中は打刻忘れ', () => {
    expect(findStaleDay(makeData(working), tomorrowMorning)).toBe(working);
  });

  it('終業済みなら打刻忘れではない', () => {
    expect(findStaleDay(makeData(closed), tomorrowMorning)).toBeNull();
  });
});
