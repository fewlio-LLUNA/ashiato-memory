import { describe, expect, it } from 'vitest';
import { MIN_BREAK_MS, MS_PER_MINUTE, STANDARD_WORK_MS } from './constants';
import { DomainError } from './types';

// 土台の動作確認を兼ねた契約値のテスト
describe('共有定数', () => {
  it('所定労働は7時間40分', () => {
    expect(STANDARD_WORK_MS).toBe(460 * MS_PER_MINUTE);
  });
  it('最低休憩は60分', () => {
    expect(MIN_BREAK_MS).toBe(60 * MS_PER_MINUTE);
  });
});

describe('DomainError', () => {
  it('name と message を保持する', () => {
    const err = new DomainError('業務名を入力してください');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DomainError');
    expect(err.message).toBe('業務名を入力してください');
  });
});
