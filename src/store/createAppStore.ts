import { LAST_BACKUP_KEY, STORAGE_KEY } from '../shared/constants';
import {
  type AppData,
  type AppStore,
  type DateKey,
  type EpochMs,
  type SegmentEdit,
  type SwitchTarget,
  type Task,
  type TaskId,
} from '../shared/types';
import * as actions from './actions';
import {
  parseAppData,
  readLastBackupAt,
  serializeData,
  writeLastBackupAt,
  type StorageLike,
} from './backup';
import { loadData, readRaw, saveData, watchStorage, type StorageEventTarget } from './persistence';

export interface AppStoreOptions {
  storage?: StorageLike;
  eventTarget?: StorageEventTarget | null;
  /** 現在時刻の供給元（省略時は Date.now） */
  clock?: () => EpochMs;
  /** 業務 ID の生成元 */
  generateId?: () => string;
}

const ID_RADIX = 36;
const ID_RANDOM_LENGTH = 8;

/** イベント対象がない環境用の何もしない実装 */
const noTarget: StorageEventTarget = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** localStorage が使えない環境（プライベートモード等）ではメモリ保存に落とす */
function defaultStorage(): StorageLike {
  try {
    return globalThis.localStorage ?? createMemoryStorage();
  } catch {
    return createMemoryStorage();
  }
}

function defaultEventTarget(): StorageEventTarget | null {
  return typeof window === 'undefined' ? null : window;
}

function defaultGenerateId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid !== undefined) return uuid;
  const random = Math.random().toString(ID_RADIX).slice(2, 2 + ID_RANDOM_LENGTH);
  return `${Date.now().toString(ID_RADIX)}-${random}`;
}

export function createAppStore(options: AppStoreOptions = {}): AppStore {
  const storage = options.storage ?? defaultStorage();
  const clock = options.clock ?? Date.now;
  const generateId = options.generateId ?? defaultGenerateId;
  const listeners = new Set<() => void>();

  let state: AppData = loadData(storage, clock());
  let lastRaw: string | null = readRaw(storage);

  const notify = (): void => listeners.forEach((listener) => listener());

  /** 他タブの変更を取り込む */
  const reload = (): void => {
    state = loadData(storage, clock());
    lastRaw = readRaw(storage);
  };

  /** 操作の前に、保存領域が自分の知る内容と違えば読み直す */
  const syncLatest = (): void => {
    if (readRaw(storage) !== lastRaw) reload();
  };

  const commit = (next: AppData): void => {
    if (next === state) return;
    lastRaw = saveData(storage, next);
    state = next;
    notify();
  };

  const mutate = (update: (data: AppData) => AppData): void => {
    syncLatest();
    commit(update(state));
  };

  const eventTarget = options.eventTarget === undefined ? defaultEventTarget() : options.eventTarget;
  watchStorage(eventTarget ?? noTarget, (key) => {
    if (key === STORAGE_KEY || key === null) reload();
    if (key === STORAGE_KEY || key === LAST_BACKUP_KEY || key === null) notify();
  });

  const createTask = (name: string, switchAt: EpochMs | null): Task => {
    syncLatest();
    const created = actions.createTask(state, generateId(), name);
    const next =
      switchAt === null
        ? created.data
        : actions.switchTo(created.data, { kind: 'task', taskId: created.task.id }, switchAt);
    commit(next);
    return created.task;
  };

  return {
    getState: () => state,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    clockIn: (now: EpochMs = clock()) => mutate((d) => actions.clockIn(d, now)),
    switchTo: (target: SwitchTarget, now: EpochMs = clock()) =>
      mutate((d) => actions.switchTo(d, target, now)),
    clockOut: (now: EpochMs = clock()) => mutate((d) => actions.clockOut(d, now)),
    resumeDay: (now: EpochMs = clock()) => mutate((d) => actions.resumeDay(d, now)),
    closeStaleDay: (date: DateKey, clockOutAt: EpochMs) =>
      mutate((d) => actions.closeStaleDay(d, date, clockOutAt)),

    createTask: (name: string) => createTask(name, null),
    createTaskAndSwitch: (name: string, now: EpochMs = clock()) => createTask(name, now),
    renameTask: (id: TaskId, name: string) => mutate((d) => actions.renameTask(d, id, name)),
    setTaskArchived: (id: TaskId, archived: boolean) =>
      mutate((d) => actions.setTaskArchived(d, id, archived)),
    reorderTasks: (orderedIds: TaskId[]) => mutate((d) => actions.reorderTasks(d, orderedIds)),

    setAdjustment: (date: DateKey, taskId: TaskId, minutes: number) =>
      mutate((d) => actions.setAdjustment(d, date, taskId, minutes, clock())),

    editSegment: (date: DateKey, index: number, edit: SegmentEdit, now: EpochMs = clock()) =>
      mutate((d) => actions.editSegment(d, date, index, edit, now)),

    exportJson(now: EpochMs = clock()): string {
      syncLatest();
      writeLastBackupAt(storage, now);
      notify();
      return serializeData(state);
    },
    importJson(json: string): void {
      commit(parseAppData(json));
    },
    getLastBackupAt: () => readLastBackupAt(storage),
  };
}
