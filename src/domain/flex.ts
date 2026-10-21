import { MIN_BREAK_MS, STANDARD_WORK_MS } from '../shared/constants';
import type { EpochMs, FlexInfo, WorkDay } from '../shared/types';
import { segmentMs } from './time';

function sumMs(day: WorkDay, kind: 'task' | 'break', now: EpochMs): number {
  return day.segments
    .filter((seg) => seg.kind === kind)
    .reduce((acc, seg) => acc + segmentMs(seg, now), 0);
}

/**
 * 終業目安を計算する。
 * 終業済みの日は clockOut を now として扱う（終業後に時間が進んでも値が変わらない）。
 */
export function calcFlex(day: WorkDay, now: EpochMs): FlexInfo {
  const effectiveNow = day.clockOut ?? now;
  const breakMs = sumMs(day, 'break', effectiveNow);
  const workMs = sumMs(day, 'task', effectiveNow);
  return {
    estimatedEnd: day.clockIn + STANDARD_WORK_MS + Math.max(breakMs, MIN_BREAK_MS),
    remainingWorkMs: STANDARD_WORK_MS - workMs,
    breakMs,
  };
}
