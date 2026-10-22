import { describe, expect, it, vi } from 'vitest';
import {
  GENERAL_TASK_ID,
  LAST_BACKUP_KEY,
  MS_PER_MINUTE,
  STORAGE_KEY,
} from '../shared/constants';
import { DomainError, type AppStore } from '../shared/types';
import { parseAppData, readLastBackupAt, type StorageLike } from './backup';
import { createAppStore } from './createAppStore';
import type { StorageEventTarget } from './persistence';

const MIN = MS_PER_MINUTE;
const T0 = new Date(2026, 9, 21, 9, 0).getTime();
const TODAY = '2026-10-21';

class MemoryStorage implements StorageLike {
  readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

class FakeTarget implements StorageEventTarget {
  private listeners = new Set<(event: StorageEvent) => void>();
  addEventListener(_type: 'storage', listener: (event: StorageEvent) => void): void {
    this.listeners.add(listener);
  }
  removeEventListener(_type: 'storage', listener: (event: StorageEvent) => void): void {
    this.listeners.delete(listener);
  }
  emit(key: string | null): void {
    this.listeners.forEach((l) => l({ key } as StorageEvent));
  }
}

function makeStore(storage: StorageLike = new MemoryStorage(), target = new FakeTarget()): AppStore {
  let seq = 0;
  return createAppStore({
    storage,
    eventTarget: target,
    clock: () => T0,
    generateId: () => `id-${seq++}`,
  });
}

describe('操作と購読', () => {
  it('初期データは庶務のみ', () => {
    const state = makeStore().getState();
    expect(state.tasks.map((t) => t.id)).toEqual([GENERAL_TASK_ID]);
    expect(state.days).toEqual({});
  });

  it('状態が変わるたびに購読者へ通知し、解除後は通知しない', () => {
    const store = makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.clockIn(T0);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.switchTo({ kind: 'break' }, T0 + MIN);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('計測中と同じ対象への切り替えは通知も保存もしない', () => {
    const store = makeStore();
    store.clockIn(T0);
    const before = store.getState();
    const listener = vi.fn();
    store.subscribe(listener);
    store.switchTo({ kind: 'task', taskId: GENERAL_TASK_ID }, T0 + MIN);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(before);
  });

  it('now を省略すると clock の時刻を使う', () => {
    const store = makeStore();
    store.clockIn();
    expect(store.getState().days[TODAY]?.clockIn).toBe(T0);
  });

  it('バリデーションエラーでは状態を変えない', () => {
    const store = makeStore();
    const before = store.getState();
    expect(() => store.clockOut(T0)).toThrow(DomainError);
    expect(store.getState()).toBe(before);
  });

  it('createTaskAndSwitch は業務を作って計測を切り替える', () => {
    const store = makeStore();
    store.clockIn(T0);
    const task = store.createTaskAndSwitch('設計', T0 + 10 * MIN);
    expect(task.id).toBe('id-0');
    expect(store.getState().days[TODAY]?.segments.at(-1)).toMatchObject({ taskId: 'id-0', end: null });
  });

  it('createTaskAndSwitch は勤務中でなければ業務も作らない', () => {
    const store = makeStore();
    expect(() => store.createTaskAndSwitch('設計', T0)).toThrow(DomainError);
    expect(store.getState().tasks).toHaveLength(1);
  });
});

describe('editSegment', () => {
  function workedStore(storage: StorageLike = new MemoryStorage()): AppStore {
    const store = makeStore(storage);
    store.clockIn(T0);
    store.switchTo({ kind: 'break' }, T0 + 60 * MIN);
    store.switchTo({ kind: 'task', taskId: GENERAL_TASK_ID }, T0 + 120 * MIN);
    return store;
  }

  it('更新して通知・保存する。now を省略すると clock の時刻で検証する', () => {
    const storage = new MemoryStorage();
    const store = workedStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.editSegment(TODAY, 1, { start: T0 + 30 * MIN, target: { kind: 'break' } }, T0 + 200 * MIN);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().days[TODAY]?.segments[0]?.end).toBe(T0 + 30 * MIN);
    expect(parseAppData(storage.map.get(STORAGE_KEY) ?? '').days[TODAY]?.segments[1]?.start).toBe(T0 + 30 * MIN);
    // clock は T0 なので、それより後の開始は「未来」として弾かれる
    expect(() => store.editSegment(TODAY, 2, { start: T0 + 150 * MIN, target: { kind: 'break' } })).toThrow(
      DomainError,
    );
  });

  it('検証NGでは状態も通知も変わらない', () => {
    const store = workedStore();
    const before = store.getState();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(() => store.editSegment(TODAY, 0, { start: T0 + MIN, target: { kind: 'break' } }, T0 + 200 * MIN)).toThrow(
      DomainError,
    );
    expect(store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('永続化', () => {
  it('変更を保存し、新しいストアで復元できる', () => {
    const storage = new MemoryStorage();
    const first = makeStore(storage);
    first.clockIn(T0);
    first.createTask('設計');
    const second = makeStore(storage);
    expect(second.getState()).toEqual(first.getState());
  });

  it('壊れたデータは退避して初期データで起動する', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{broken');
    const store = makeStore(storage);
    expect(store.getState().days).toEqual({});
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(`${STORAGE_KEY}:corrupt-${T0}`)).toBe('{broken');
  });

  it('保存に失敗したら DomainError で、状態は変わらない', () => {
    const storage = new MemoryStorage();
    const store = makeStore(storage);
    storage.setItem = (): void => {
      throw new Error('quota');
    };
    expect(() => store.clockIn(T0)).toThrow(DomainError);
    expect(store.getState().days).toEqual({});
  });

  it('他タブの変更（storage イベント）を取り込んで通知する', () => {
    const storage = new MemoryStorage();
    const target = new FakeTarget();
    const tabA = makeStore(storage, target);
    const tabB = makeStore(storage, new FakeTarget());
    const listener = vi.fn();
    tabA.subscribe(listener);
    tabB.clockIn(T0);
    target.emit(STORAGE_KEY);
    expect(tabA.getState().days[TODAY]).toBeDefined();
    expect(listener).toHaveBeenCalled();
  });

  it('イベントが届く前でも、操作時に最新を読み直してから適用する', () => {
    const storage = new MemoryStorage();
    const tabA = makeStore(storage);
    const tabB = makeStore(storage);
    tabB.createTask('他タブの業務');
    tabA.createTask('こちらの業務');
    const names = tabA.getState().tasks.map((t) => t.name);
    expect(names).toEqual(['庶務', '他タブの業務', 'こちらの業務']);
  });
});

describe('バックアップ', () => {
  it('書き出しで最終バックアップ日時を記録する', () => {
    const storage = new MemoryStorage();
    const store = makeStore(storage);
    expect(store.getLastBackupAt()).toBeNull();
    store.exportJson(T0 + 5 * MIN);
    expect(store.getLastBackupAt()).toBe(T0 + 5 * MIN);
    expect(readLastBackupAt(storage)).toBe(T0 + 5 * MIN);
    expect(storage.getItem(LAST_BACKUP_KEY)).toBe(String(T0 + 5 * MIN));
  });

  it('書き出した JSON を読み込むと同じ状態に戻る', () => {
    const source = makeStore();
    source.clockIn(T0);
    source.createTaskAndSwitch('設計', T0 + 30 * MIN);
    const json = source.exportJson(T0);
    const dest = makeStore();
    dest.importJson(json);
    expect(dest.getState()).toEqual(source.getState());
  });

  it('読み込みは永続化され、通知される', () => {
    const storage = new MemoryStorage();
    const source = makeStore();
    source.clockIn(T0);
    const dest = makeStore(storage);
    const listener = vi.fn();
    dest.subscribe(listener);
    dest.importJson(source.exportJson(T0));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(makeStore(storage).getState()).toEqual(source.getState());
  });

  it('不正な JSON は DomainError でデータを変更しない', () => {
    const store = makeStore();
    store.clockIn(T0);
    const before = store.getState();
    expect(() => store.importJson('not json')).toThrow(DomainError);
    expect(() => store.importJson('{"schemaVersion":2,"tasks":[],"days":{}}')).toThrow(DomainError);
    expect(store.getState()).toBe(before);
  });
});

describe('parseAppData の検証', () => {
  const valid = {
    schemaVersion: 1,
    tasks: [{ id: GENERAL_TASK_ID, name: '庶務', archived: false, order: 0 }],
    days: {},
  };
  const day = {
    date: TODAY,
    clockIn: T0,
    clockOut: null,
    segments: [{ kind: 'task', taskId: GENERAL_TASK_ID, start: T0, end: null }],
    adjustments: {},
  };

  function withDay(over: Record<string, unknown>): string {
    return JSON.stringify({ ...valid, days: { [TODAY]: { ...day, ...over } } });
  }

  it('正しいデータは通る', () => {
    expect(() => parseAppData(JSON.stringify(valid))).not.toThrow();
    expect(() => parseAppData(withDay({}))).not.toThrow();
  });

  it('構造の不備は DomainError', () => {
    const bad = [
      JSON.stringify({ ...valid, tasks: [] }),
      JSON.stringify({ ...valid, tasks: [valid.tasks[0], valid.tasks[0]] }),
      JSON.stringify({ ...valid, days: { 'x': day } }),
      withDay({ date: '2026-10-22' }),
      withDay({ clockIn: 'a' }),
      withDay({ adjustments: { [GENERAL_TASK_ID]: 1.5 } }),
      withDay({ adjustments: { unknown: 5 } }),
      withDay({ segments: [{ kind: 'task', taskId: 'unknown', start: T0, end: null }] }),
      withDay({ segments: [{ kind: 'break', taskId: GENERAL_TASK_ID, start: T0, end: null }] }),
      withDay({ segments: [{ kind: 'task', taskId: GENERAL_TASK_ID, start: T0, end: T0 - 1 }] }),
      withDay({ clockOut: T0 + MIN }),
      '[]',
      'null',
    ];
    bad.forEach((json) => expect(() => parseAppData(json)).toThrow(DomainError));
  });

  it('区間の順序が逆転していたら DomainError', () => {
    const segments = [
      { kind: 'task', taskId: GENERAL_TASK_ID, start: T0 + 10 * MIN, end: T0 + 20 * MIN },
      { kind: 'task', taskId: GENERAL_TASK_ID, start: T0, end: T0 + MIN },
    ];
    expect(() => parseAppData(withDay({ segments, clockOut: T0 + 30 * MIN }))).toThrow(DomainError);
  });

  it('勤務中の日が複数あれば DomainError', () => {
    const other = { ...day, date: '2026-10-20' };
    const json = JSON.stringify({ ...valid, days: { [TODAY]: day, '2026-10-20': other } });
    expect(() => parseAppData(json)).toThrow(DomainError);
  });
});
