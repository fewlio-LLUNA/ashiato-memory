import { describe, expect, it } from 'vitest';
import { formatClock, formatDateLabel, formatElapsed, formatMinutes } from './format';

describe('formatMinutes', () => {
  it('1 時間未満は分のみ', () => {
    expect(formatMinutes(45)).toBe('45分');
    expect(formatMinutes(0)).toBe('0分');
  });

  it('1 時間以上は時間と分', () => {
    expect(formatMinutes(137)).toBe('2時間17分');
    expect(formatMinutes(60)).toBe('1時間');
  });

  it('負の値は符号を付ける', () => {
    expect(formatMinutes(-5)).toBe('-5分');
    expect(formatMinutes(-75)).toBe('-1時間15分');
  });
});

describe('formatClock', () => {
  it('ゼロ埋めした HH:mm', () => {
    expect(formatClock(new Date(2026, 9, 21, 9, 5).getTime())).toBe('09:05');
    expect(formatClock(new Date(2026, 9, 21, 17, 40).getTime())).toBe('17:40');
  });
});

describe('formatElapsed', () => {
  it('H:mm:ss 形式', () => {
    expect(formatElapsed((1 * 3600 + 2 * 60 + 9) * 1000)).toBe('1:02:09');
    expect(formatElapsed(0)).toBe('0:00:00');
  });

  it('100 時間を超えても崩れない / 負は 0', () => {
    expect(formatElapsed(100 * 3600 * 1000)).toBe('100:00:00');
    expect(formatElapsed(-5000)).toBe('0:00:00');
  });
});

describe('formatDateLabel', () => {
  it('月/日(曜) 形式', () => {
    expect(formatDateLabel('2026-10-21')).toBe('10/21(水)');
    expect(formatDateLabel('2026-10-25')).toBe('10/25(日)');
    expect(formatDateLabel('2026-01-05')).toBe('1/5(月)');
  });
});
