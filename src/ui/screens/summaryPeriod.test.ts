import { describe, expect, it } from 'vitest';
import { periodLabel, rangeOf, shiftAnchor } from './summaryPeriod';

describe('summaryPeriod', () => {
  it('週は月曜始まりの範囲を返す', () => {
    expect(rangeOf('week', '2026-10-21')).toEqual({ from: '2026-10-19', to: '2026-10-25' });
  });

  it('日は前後に1日ずつ動く', () => {
    expect(shiftAnchor('day', '2026-10-21', -1)).toBe('2026-10-20');
    expect(shiftAnchor('day', '2026-10-21', 1)).toBe('2026-10-22');
  });

  it('週は前後の週に動く', () => {
    expect(rangeOf('week', shiftAnchor('week', '2026-10-21', -1)).from).toBe('2026-10-12');
    expect(rangeOf('week', shiftAnchor('week', '2026-10-21', 1)).from).toBe('2026-10-26');
  });

  it('月は月またぎ・年またぎで前後の月に動く', () => {
    expect(rangeOf('month', shiftAnchor('month', '2026-01-15', -1))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(rangeOf('month', shiftAnchor('month', '2026-10-21', 1)).from).toBe('2026-11-01');
  });

  it('月の見出しは「YYYY年M月」', () => {
    expect(periodLabel('month', '2026-10-21')).toBe('2026年10月');
  });
});
