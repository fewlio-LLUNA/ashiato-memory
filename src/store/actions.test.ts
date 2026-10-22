import { describe, expect, it } from 'vitest';
import { GENERAL_TASK_ID, MS_PER_MINUTE, TASK_NAME_MAX_LENGTH } from '../shared/constants';
import { DomainError, type AppData, type WorkDay } from '../shared/types';
import {
  clockIn,
  clockOut,
  closeStaleDay,
  createInitialData,
  createTask,
  editSegment,
  renameTask,
  reorderTasks,
  resumeDay,
  setAdjustment,
  setTaskArchived,
  switchTo,
} from './actions';

const MIN = MS_PER_MINUTE;
const T0 = new Date(2026, 9, 21, 9, 0).getTime();
const NEXT_DAY_MORNING = new Date(2026, 9, 22, 8, 0).getTime();
const TODAY = '2026-10-21';

function working(): AppData {
  return clockIn(createInitialData(), T0);
}

function withTask(data: AppData, id: string, name: string): AppData {
  return createTask(data, id, name).data;
}

describe('clockIn', () => {
  it('当日の WorkDay を作り、庶務の計測を始める', () => {
    const day = working().days[TODAY];
    expect(day?.clockIn).toBe(T0);
    expect(day?.clockOut).toBeNull();
    expect(day?.segments).toEqual([{ kind: 'task', taskId: GENERAL_TASK_ID, start: T0, end: null }]);
  });

  it('元のデータを書き換えない', () => {
    const base = createInitialData();
    clockIn(base, T0);
    expect(base.days).toEqual({});
  });

  it('勤務中なら DomainError', () => {
    expect(() => clockIn(working(), T0 + MIN)).toThrow(DomainError);
  });

  it('当日が終業済みなら DomainError', () => {
    const closed = clockOut(working(), T0 + 60 * MIN);
    expect(() => clockIn(closed, T0 + 90 * MIN)).toThrow(DomainError);
  });

  it('打刻忘れの日があれば DomainError', () => {
    expect(() => clockIn(working(), NEXT_DAY_MORNING)).toThrow(DomainError);
  });
});

describe('switchTo', () => {
  it('計測中を閉じて新しい区間を開く', () => {
    const data = withTask(working(), 'a', '設計');
    const next = switchTo(data, { kind: 'task', taskId: 'a' }, T0 + 30 * MIN);
    expect(next.days[TODAY]?.segments).toEqual([
      { kind: 'task', taskId: GENERAL_TASK_ID, start: T0, end: T0 + 30 * MIN },
      { kind: 'task', taskId: 'a', start: T0 + 30 * MIN, end: null },
    ]);
  });

  it('休憩にも切り替えられる', () => {
    const next = switchTo(working(), { kind: 'break' }, T0 + 10 * MIN);
    expect(next.days[TODAY]?.segments[1]).toMatchObject({ kind: 'break', taskId: null, end: null });
  });

  it('計測中と同じ対象なら何もしない（同一参照）', () => {
    const data = working();
    expect(switchTo(data, { kind: 'task', taskId: GENERAL_TASK_ID }, T0 + MIN)).toBe(data);
  });

  it('勤務中でなければ DomainError', () => {
    expect(() => switchTo(createInitialData(), { kind: 'break' }, T0)).toThrow(DomainError);
  });

  it('存在しない・非表示の業務は DomainError', () => {
    const data = setTaskArchived(withTask(working(), 'a', '設計'), 'a', true);
    expect(() => switchTo(data, { kind: 'task', taskId: 'a' }, T0 + MIN)).toThrow(DomainError);
    expect(() => switchTo(data, { kind: 'task', taskId: 'zzz' }, T0 + MIN)).toThrow(DomainError);
  });

  it('打刻忘れの日があれば DomainError', () => {
    expect(() => switchTo(working(), { kind: 'break' }, NEXT_DAY_MORNING)).toThrow(DomainError);
  });

  it('現在の区間の開始より前の時刻は DomainError', () => {
    expect(() => switchTo(working(), { kind: 'break' }, T0 - MIN)).toThrow(DomainError);
  });
});

describe('clockOut / resumeDay', () => {
  it('退勤で計測中区間と clockOut が閉じる', () => {
    const day = clockOut(working(), T0 + 120 * MIN).days[TODAY];
    expect(day?.clockOut).toBe(T0 + 120 * MIN);
    expect(day?.segments.at(-1)?.end).toBe(T0 + 120 * MIN);
  });

  it('勤務中でなければ退勤は DomainError', () => {
    expect(() => clockOut(createInitialData(), T0)).toThrow(DomainError);
  });

  it('再開すると clockOut が null に戻り、終業〜再開の間は記録されない', () => {
    const closed = clockOut(working(), T0 + 120 * MIN);
    const day = resumeDay(closed, T0 + 150 * MIN).days[TODAY];
    expect(day?.clockOut).toBeNull();
    expect(day?.segments).toEqual([
      { kind: 'task', taskId: GENERAL_TASK_ID, start: T0, end: T0 + 120 * MIN },
      { kind: 'task', taskId: GENERAL_TASK_ID, start: T0 + 150 * MIN, end: null },
    ]);
  });

  it('打刻忘れが残っていれば未確定である旨のエラーにする', () => {
    expect(() => resumeDay(working(), NEXT_DAY_MORNING)).toThrow('未確定');
  });

  it('当日の記録がない・勤務中なら再開は DomainError', () => {
    expect(() => resumeDay(createInitialData(), T0)).toThrow(DomainError);
    expect(() => resumeDay(working(), T0 + MIN)).toThrow(DomainError);
  });
});

describe('closeStaleDay', () => {
  it('指定時刻で区間と clockOut を閉じる', () => {
    const out = new Date(2026, 9, 21, 18, 0).getTime();
    const day = closeStaleDay(working(), TODAY, out).days[TODAY];
    expect(day?.clockOut).toBe(out);
    expect(day?.segments.at(-1)?.end).toBe(out);
  });

  it('最後の区間の開始以前の時刻は DomainError', () => {
    expect(() => closeStaleDay(working(), TODAY, T0)).toThrow(DomainError);
  });

  it('対象がない・終業済みなら DomainError', () => {
    expect(() => closeStaleDay(createInitialData(), TODAY, T0 + MIN)).toThrow(DomainError);
    const closed = clockOut(working(), T0 + 60 * MIN);
    expect(() => closeStaleDay(closed, TODAY, T0 + 90 * MIN)).toThrow(DomainError);
  });

  it('確定後は打刻できるようになる', () => {
    const out = new Date(2026, 9, 21, 18, 0).getTime();
    const closed = closeStaleDay(working(), TODAY, out);
    expect(clockIn(closed, NEXT_DAY_MORNING).days['2026-10-22']).toBeDefined();
  });
});

describe('業務の作成・名前', () => {
  it('前後の空白を除去し、order は末尾に付く', () => {
    const { task } = createTask(createInitialData(), 'a', '  設計  ');
    expect(task).toEqual({ id: 'a', name: '設計', archived: false, order: 1 });
  });

  it('空・50 文字超・重複は DomainError', () => {
    const data = withTask(createInitialData(), 'a', '設計');
    expect(() => createTask(data, 'b', '   ')).toThrow(DomainError);
    expect(() => createTask(data, 'b', 'あ'.repeat(TASK_NAME_MAX_LENGTH + 1))).toThrow(DomainError);
    expect(() => createTask(data, 'b', ' 設計 ')).toThrow(DomainError);
    expect(() => createTask(data, 'b', '庶務')).toThrow(DomainError);
  });

  it('50 文字ちょうどは作成できる', () => {
    const name = 'あ'.repeat(TASK_NAME_MAX_LENGTH);
    expect(createTask(createInitialData(), 'a', name).task.name).toBe(name);
  });

  it('非表示の業務と同名は作成できる', () => {
    const data = setTaskArchived(withTask(createInitialData(), 'a', '設計'), 'a', true);
    expect(() => createTask(data, 'b', '設計')).not.toThrow();
  });

  it('改名できる。他のアクティブ業務との重複は DomainError', () => {
    const data = withTask(withTask(createInitialData(), 'a', '設計'), 'b', '開発');
    expect(renameTask(data, 'a', '基本設計').tasks.find((t) => t.id === 'a')?.name).toBe('基本設計');
    expect(() => renameTask(data, 'a', '開発')).toThrow(DomainError);
    expect(() => renameTask(data, 'a', '設計')).not.toThrow();
  });

  it('庶務の改名・非表示は DomainError', () => {
    const data = createInitialData();
    expect(() => renameTask(data, GENERAL_TASK_ID, '別名')).toThrow(DomainError);
    expect(() => setTaskArchived(data, GENERAL_TASK_ID, true)).toThrow(DomainError);
  });

  it('存在しない業務の操作は DomainError', () => {
    expect(() => renameTask(createInitialData(), 'zzz', 'x')).toThrow(DomainError);
  });
});

describe('非表示・再表示', () => {
  it('非表示にして、再表示できる', () => {
    const data = withTask(createInitialData(), 'a', '設計');
    const hidden = setTaskArchived(data, 'a', true);
    expect(hidden.tasks.find((t) => t.id === 'a')?.archived).toBe(true);
    expect(setTaskArchived(hidden, 'a', false).tasks.find((t) => t.id === 'a')?.archived).toBe(false);
  });

  it('同名のアクティブ業務がある場合は再表示できない', () => {
    const hidden = setTaskArchived(withTask(createInitialData(), 'a', '設計'), 'a', true);
    const dup = withTask(hidden, 'b', '設計');
    expect(() => setTaskArchived(dup, 'a', false)).toThrow(DomainError);
  });
});

describe('reorderTasks', () => {
  const base = withTask(withTask(createInitialData(), 'a', '設計'), 'b', '開発');
  const orderOf = (d: AppData): string[] =>
    [...d.tasks].sort((x, y) => x.order - y.order).map((t) => t.id);

  it('指定順に order を振り直す', () => {
    expect(orderOf(reorderTasks(base, ['b', 'a', GENERAL_TASK_ID]))).toEqual(['b', 'a', GENERAL_TASK_ID]);
  });

  it('指定されなかった業務は元の順で後ろに続く', () => {
    expect(orderOf(reorderTasks(base, ['b']))).toEqual(['b', GENERAL_TASK_ID, 'a']);
  });

  it('未知の id や重複は DomainError', () => {
    expect(() => reorderTasks(base, ['zzz'])).toThrow(DomainError);
    expect(() => reorderTasks(base, ['a', 'a'])).toThrow(DomainError);
  });
});

describe('setAdjustment', () => {
  const now = T0 + 300 * MIN;

  function closedAfter60Min(): AppData {
    return clockOut(working(), T0 + 60 * MIN);
  }

  it('補正を設定できる', () => {
    const data = setAdjustment(closedAfter60Min(), TODAY, GENERAL_TASK_ID, 10, now);
    expect(data.days[TODAY]?.adjustments).toEqual({ [GENERAL_TASK_ID]: 10 });
  });

  it('0 を設定するとキーが消える', () => {
    const set = setAdjustment(closedAfter60Min(), TODAY, GENERAL_TASK_ID, 10, now);
    const cleared = setAdjustment(set, TODAY, GENERAL_TASK_ID, 0, now);
    expect(cleared.days[TODAY]?.adjustments).toEqual({});
  });

  it('実測との合計がちょうど 0 になる値は設定でき、負になる値は DomainError', () => {
    const data = closedAfter60Min();
    expect(() => setAdjustment(data, TODAY, GENERAL_TASK_ID, -60, now)).not.toThrow();
    expect(() => setAdjustment(data, TODAY, GENERAL_TASK_ID, -61, now)).toThrow(DomainError);
  });

  it('実測のない業務には正の補正だけ設定できる', () => {
    const data = withTask(closedAfter60Min(), 'a', '設計');
    expect(() => setAdjustment(data, TODAY, 'a', 5, now)).not.toThrow();
    expect(() => setAdjustment(data, TODAY, 'a', -1, now)).toThrow(DomainError);
  });

  it('整数でない値・記録のない日・未知の業務は DomainError', () => {
    const data = closedAfter60Min();
    expect(() => setAdjustment(data, TODAY, GENERAL_TASK_ID, 1.5, now)).toThrow(DomainError);
    expect(() => setAdjustment(data, '2026-01-01', GENERAL_TASK_ID, 5, now)).toThrow(DomainError);
    expect(() => setAdjustment(data, TODAY, 'zzz', 5, now)).toThrow(DomainError);
  });
});

describe('editSegment', () => {
  const NOW = T0 + 300 * MIN;
  const TASK_A = { kind: 'task', taskId: 'a' } as const;

  /** 庶務 9:00-10:00 → A 10:00-12:00 → 休憩 12:00-13:00 → 庶務 13:00-計測中 */
  function history(): AppData {
    let d = withTask(working(), 'a', 'A');
    d = switchTo(d, TASK_A, T0 + 60 * MIN);
    d = switchTo(d, { kind: 'break' }, T0 + 180 * MIN);
    return switchTo(d, { kind: 'task', taskId: GENERAL_TASK_ID }, T0 + 240 * MIN);
  }

  const day = (d: AppData): WorkDay => d.days[TODAY] as WorkDay;
  const edit = (d: AppData, index: number, start: number, target: Parameters<typeof editSegment>[3]['target']) =>
    editSegment(d, TODAY, index, { start, target }, NOW);

  it('開始時刻を変えると直前の行の終了も同じ時刻になる', () => {
    const next = edit(history(), 1, T0 + 90 * MIN, TASK_A);
    expect(day(next).segments[0]?.end).toBe(T0 + 90 * MIN);
    expect(day(next).segments[1]?.start).toBe(T0 + 90 * MIN);
    expect(day(next).segments[1]?.end).toBe(T0 + 180 * MIN);
  });

  it('対象を業務から休憩に、休憩から業務に変えられる', () => {
    const toBreak = edit(history(), 1, T0 + 60 * MIN, { kind: 'break' });
    expect(day(toBreak).segments[1]).toMatchObject({ kind: 'break', taskId: null });
    const toTask = edit(history(), 2, T0 + 180 * MIN, TASK_A);
    expect(day(toTask).segments[2]).toMatchObject({ kind: 'task', taskId: 'a' });
  });

  it('隣と同じ業務になっても区間は結合しない', () => {
    const next = edit(history(), 2, T0 + 180 * MIN, TASK_A);
    expect(day(next).segments).toHaveLength(4);
  });

  it('計測中の最後の行も編集でき、end は null のまま', () => {
    const next = edit(history(), 3, T0 + 250 * MIN, TASK_A);
    expect(day(next).segments[3]).toMatchObject({ start: T0 + 250 * MIN, end: null, taskId: 'a' });
    expect(day(next).segments[2]?.end).toBe(T0 + 250 * MIN);
  });

  it('先頭の行は対象だけ変えられ、開始時刻の変更は DomainError', () => {
    const next = edit(history(), 0, T0, TASK_A);
    expect(day(next).segments[0]).toMatchObject({ taskId: 'a', start: T0 });
    expect(() => edit(history(), 0, T0 + MIN, TASK_A)).toThrow('先頭の行の開始時刻（業務開始）は変更できません。');
  });

  it('境界: 直前の開始ちょうどは不可、1ms 後は可', () => {
    expect(() => edit(history(), 1, T0, TASK_A)).toThrow('直前の行の開始（09:00）より後にしてください。');
    expect(() => edit(history(), 1, T0 + 1, TASK_A)).not.toThrow();
  });

  it('境界: この行の終了ちょうどは不可、1ms 前は可', () => {
    expect(() => edit(history(), 1, T0 + 180 * MIN, TASK_A)).toThrow('この行の終了（12:00）より前にしてください。');
    expect(() => edit(history(), 1, T0 + 180 * MIN - 1, TASK_A)).not.toThrow();
  });

  it('境界: 計測中の行は now ちょうどは不可、未来は不可、1ms 前は可', () => {
    expect(() => edit(history(), 3, NOW, TASK_A)).toThrow('現在時刻（14:00）より前にしてください。');
    expect(() => edit(history(), 3, NOW + 1, TASK_A)).toThrow('未来の時刻は指定できません。');
    expect(() => edit(history(), 3, NOW - 1, TASK_A)).not.toThrow();
  });

  it('記録のない日・範囲外の index は DomainError', () => {
    const d = history();
    expect(() => editSegment(d, '2000-01-01', 0, { start: T0, target: TASK_A }, NOW)).toThrow(DomainError);
    expect(() => edit(d, 4, T0 + MIN, TASK_A)).toThrow(DomainError);
    expect(() => edit(d, -1, T0 + MIN, TASK_A)).toThrow(DomainError);
    expect(() => edit(d, 1.5, T0 + MIN, TASK_A)).toThrow(DomainError);
  });

  it('存在しない業務・非表示の業務は不可。現在と同じ非表示業務なら可', () => {
    expect(() => edit(history(), 1, T0 + 90 * MIN, { kind: 'task', taskId: 'zzz' })).toThrow(DomainError);
    const archived = setTaskArchived(history(), 'a', true);
    expect(() => edit(archived, 2, T0 + 190 * MIN, TASK_A)).toThrow('非表示の業務には変更できません。');
    expect(() => edit(archived, 1, T0 + 90 * MIN, TASK_A)).not.toThrow();
  });

  it('補正と合わせて 0 分未満になる変更は DomainError', () => {
    // A は実測 120 分。-120 の補正まで許される
    const adjusted = setAdjustment(history(), TODAY, 'a', -120, NOW);
    expect(() => edit(adjusted, 1, T0 + 61 * MIN, TASK_A)).toThrow(
      '補正と合わせて0分未満になる業務があるため変更できません。',
    );
    expect(() => edit(adjusted, 1, T0 + 60 * MIN, { kind: 'break' })).toThrow(DomainError);
  });

  it('補正があっても合計が 0 以上に保たれる変更は成功する', () => {
    const adjusted = setAdjustment(history(), TODAY, 'a', -60, NOW);
    expect(() => edit(adjusted, 1, T0 + 90 * MIN, TASK_A)).not.toThrow();
  });

  it('失敗時はデータを変更しない／成功時も元データを書き換えない', () => {
    const base = history();
    const snapshot = structuredClone(base);
    expect(() => edit(base, 1, T0, TASK_A)).toThrow(DomainError);
    edit(base, 1, T0 + 90 * MIN, TASK_A);
    expect(base).toEqual(snapshot);
  });
});
