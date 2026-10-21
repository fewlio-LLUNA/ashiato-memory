import { describe, expect, it } from 'vitest';
import type { Segment } from '../shared/types';
import { addDays, monthRange, segmentMs, toDateKey, weekRange } from './time';

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
