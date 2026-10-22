import { describe, expect, it } from 'vitest';
import type { Segment } from '../shared/types';
import {
  addDays,
  calendarWeeks,
  monthRange,
  segmentMs,
  toDateKey,
  weekRange,
  withClockTime,
} from './time';

describe('toDateKey', () => {
  it('ローカル日付のキーにする', () => {
    expect(toDateKey(new Date(2026, 9, 21, 9, 5).getTime())).toBe('2026-10-21');
  });

  it('日付の境界（23:59 と 0:00）で日が変わる', () => {
    expect(toDateKey(new Date(2026, 9, 21, 23, 59, 59).getTime())).toBe('2026-10-21');
    expect(toDateKey(new Date(2026, 9, 22, 0, 0, 0).getTime())).toBe('2026-10-22');
  });
});

describe('addDays', () => {
  it('月・年をまたいで加算できる', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('負の値で遡れる', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('うるう年の 2/29 を扱える', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('0 なら同じ日', () => {
    expect(addDays('2026-10-21', 0)).toBe('2026-10-21');
  });
});

describe('weekRange（月曜始まり）', () => {
  it('水曜から月曜〜日曜を返す', () => {
    expect(weekRange('2026-10-21')).toEqual({ from: '2026-10-19', to: '2026-10-25' });
  });

  it('月曜はその日が週の開始', () => {
    expect(weekRange('2026-10-19')).toEqual({ from: '2026-10-19', to: '2026-10-25' });
  });

  it('日曜は同じ週の最終日', () => {
    expect(weekRange('2026-10-25')).toEqual({ from: '2026-10-19', to: '2026-10-25' });
  });

  it('月・年をまたぐ週を扱える', () => {
    expect(weekRange('2026-12-31')).toEqual({ from: '2026-12-28', to: '2027-01-03' });
  });
});

describe('monthRange', () => {
  it('月初〜月末を返す', () => {
    expect(monthRange('2026-10-21')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2026-11-05')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });

  it('2 月はうるう年で末日が変わる', () => {
    expect(monthRange('2026-02-10').to).toBe('2026-02-28');
    expect(monthRange('2028-02-10').to).toBe('2028-02-29');
  });

  it('12 月を扱える', () => {
    expect(monthRange('2026-12-15')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('segmentMs', () => {
  const closed: Segment = { kind: 'task', taskId: 'a', start: 1000, end: 4000 };
  const open: Segment = { kind: 'task', taskId: 'a', start: 1000, end: null };

  it('終了済みは end - start', () => {
    expect(segmentMs(closed, 99999)).toBe(3000);
  });

  it('計測中は now まで', () => {
    expect(segmentMs(open, 6000)).toBe(5000);
  });

  it('now が start より前でも負にならない', () => {
    expect(segmentMs(open, 500)).toBe(0);
  });
});

describe('withClockTime', () => {
  const base = new Date(2026, 9, 21, 15, 30, 45, 123).getTime();

  it('base のローカル日付で指定時刻（秒・ms は 0）にする', () => {
    expect(withClockTime(base, '09:05')).toBe(new Date(2026, 9, 21, 9, 5, 0, 0).getTime());
    expect(withClockTime(base, '00:00')).toBe(new Date(2026, 9, 21, 0, 0, 0, 0).getTime());
    expect(withClockTime(base, '23:59')).toBe(new Date(2026, 9, 21, 23, 59, 0, 0).getTime());
  });

  it('形式不正・範囲外は null', () => {
    for (const bad of ['', '9:05', '0905', '09:5', '24:00', '12:60', 'ab:cd', '12:30:00', ' 12:30']) {
      expect(withClockTime(base, bad)).toBeNull();
    }
  });
});

describe('calendarWeeks', () => {
  it('月曜始まりで週ごとに並び、月外のマスは null', () => {
    // 2026-10-01 は木曜
    const weeks = calendarWeeks('2026-10-15');
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks[weeks.length - 1]).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null,
    ]);
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('月初が日曜の月は先頭週に 6 マスの null が入る', () => {
    // 2026-02-01 は日曜、2月は28日でちょうど4週+1日
    const weeks = calendarWeeks('2026-02-01');
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-02-01']);
    expect(weeks).toHaveLength(5);
    expect(weeks[4]).toEqual(['2026-02-23', '2026-02-24', '2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28', null]);
  });

  it('月初が月曜で月末が日曜なら null を含まない 4 週になる', () => {
    // 2027-02-01 は月曜、28日で日曜終わり
    const weeks = calendarWeeks('2027-02-10');
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((d) => d !== null)).toBe(true);
  });

  it('うるう年の 2 月は 29 日まで含む', () => {
    const days = calendarWeeks('2028-02-10').flat().filter((d) => d !== null);
    expect(days).toHaveLength(29);
    expect(days[28]).toBe('2028-02-29');
  });

  it('6 週になる月がある', () => {
    // 2026-11-01 は日曜、30日 → 6週
    expect(calendarWeeks('2026-11-01')).toHaveLength(6);
  });

  it('日付は weekRange と同じ週区切りになる', () => {
    for (const week of calendarWeeks('2026-10-15')) {
      const dates = week.filter((d): d is string => d !== null);
      const range = weekRange(dates[0] ?? '');
      expect(range.from <= (dates[0] ?? '')).toBe(true);
      expect(range.to >= (dates[dates.length - 1] ?? '')).toBe(true);
    }
  });
});
