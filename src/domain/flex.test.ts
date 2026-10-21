import { describe, expect, it } from 'vitest';
import { MIN_BREAK_MS, MS_PER_MINUTE, STANDARD_WORK_MS } from '../shared/constants';
import type { Segment, WorkDay } from '../shared/types';
import { calcFlex } from './flex';

const MIN = MS_PER_MINUTE;
const CLOCK_IN = new Date(2026, 9, 21, 9, 0).getTime();

function seg(kind: 'task' | 'break', startMin: number, endMin: number | null): Segment {
  return {
    kind,
    taskId: kind === 'task' ? 'general' : null,
    start: CLOCK_IN + startMin * MIN,
    end: endMin === null ? null : CLOCK_IN + endMin * MIN,
  };
}

function makeDay(segments: Segment[], clockOutMin: number | null = null): WorkDay {
  return {
    date: '2026-10-21',
    clockIn: CLOCK_IN,
    clockOut: clockOutMin === null ? null : CLOCK_IN + clockOutMin * MIN,
    segments,
    adjustments: {},
  };
}

describe('calcFlex', () => {
  it('休憩が 60 分未満なら 60 分として終業目安を出す', () => {
    const day = makeDay([seg('task', 0, 180), seg('break', 180, 210), seg('task', 210, null)]);
    const f = calcFlex(day, CLOCK_IN + 240 * MIN);
    expect(f.breakMs).toBe(30 * MIN);
    expect(f.estimatedEnd).toBe(CLOCK_IN + STANDARD_WORK_MS + MIN_BREAK_MS);
  });

  it('休憩が 60 分を超えたら実績分だけ終業目安が後ろにずれる', () => {
    const day = makeDay([seg('task', 0, 120), seg('break', 120, 210), seg('task', 210, null)]);
    const f = calcFlex(day, CLOCK_IN + 300 * MIN);
    expect(f.breakMs).toBe(90 * MIN);
    expect(f.estimatedEnd).toBe(CLOCK_IN + STANDARD_WORK_MS + 90 * MIN);
  });

  it('休憩なしでも 60 分を見込む', () => {
    const f = calcFlex(makeDay([seg('task', 0, null)]), CLOCK_IN + 10 * MIN);
    expect(f.breakMs).toBe(0);
    expect(f.estimatedEnd).toBe(CLOCK_IN + STANDARD_WORK_MS + MIN_BREAK_MS);
  });

  it('残り時間は所定 - 実労働（休憩除く）', () => {
    const day = makeDay([seg('task', 0, 180), seg('break', 180, 240), seg('task', 240, null)]);
    const f = calcFlex(day, CLOCK_IN + 300 * MIN); // 実労働 180 + 60 = 240 分
    expect(f.remainingWorkMs).toBe(STANDARD_WORK_MS - 240 * MIN);
  });

  it('所定を超えたら残りは負（超過）', () => {
    const day = makeDay([seg('task', 0, null)]);
    const f = calcFlex(day, CLOCK_IN + 500 * MIN);
    expect(f.remainingWorkMs).toBe(-(500 * MIN - STANDARD_WORK_MS));
  });

  it('計測中の休憩も休憩実績に含める', () => {
    const day = makeDay([seg('task', 0, 120), seg('break', 120, null)]);
    const f = calcFlex(day, CLOCK_IN + 200 * MIN);
    expect(f.breakMs).toBe(80 * MIN);
  });

  it('終業済みの日は clockOut を now として計算し、now が進んでも変わらない', () => {
    const day = makeDay([seg('task', 0, 300)], 300);
    const a = calcFlex(day, CLOCK_IN + 300 * MIN);
    const b = calcFlex(day, CLOCK_IN + 1000 * MIN);
    expect(b).toEqual(a);
    expect(a.remainingWorkMs).toBe(STANDARD_WORK_MS - 300 * MIN);
  });
});
