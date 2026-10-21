// A の Store 完成までの仮実装（B5 で実 Store に差し替えて削除する）。
// AppStore 契約（設計書 §4.1）を満たすメモリ実装。バリデーションは最低限。
import {
  GENERAL_TASK_ID,
  GENERAL_TASK_NAME,
  SCHEMA_VERSION,
  TASK_NAME_MAX_LENGTH,
} from '../../shared/constants';
import {
  DomainError,
  type AppData,
  type AppStore,
  type DateKey,
  type EpochMs,
  type Segment,
  type SwitchTarget,
  type Task,
  type TaskId,
  type WorkDay,
} from '../../shared/types';

const PAD_WIDTH = 2;

function pad(n: number): string {
  return String(n).padStart(PAD_WIDTH, '0');
}

function dateKeyOf(t: EpochMs): DateKey {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function initialData(): AppData {
  const general: Task = { id: GENERAL_TASK_ID, name: GENERAL_TASK_NAME, archived: false, order: 0 };
  return { schemaVersion: SCHEMA_VERSION, tasks: [general], days: {} };
}

function activeDayOf(data: AppData): WorkDay | null {
  return Object.values(data.days).find((day) => day.clockOut === null) ?? null;
}

function requireActiveDay(data: AppData): WorkDay {
  const day = activeDayOf(data);
  if (!day) throw new DomainError('勤務中ではありません。先に業務開始を押してください。');
  return day;
}

function closeLast(segments: Segment[], now: EpochMs): Segment[] {
  return segments.map((seg) => (seg.end === null ? { ...seg, end: now } : seg));
}

function targetSegment(target: SwitchTarget, now: EpochMs): Segment {
  return target.kind === 'break'
    ? { kind: 'break', taskId: null, start: now, end: null }
    : { kind: 'task', taskId: target.taskId, start: now, end: null };
}

function validateName(data: AppData, name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') throw new DomainError('業務名を入力してください。');
  if (trimmed.length > TASK_NAME_MAX_LENGTH) {
    throw new DomainError(`業務名は${TASK_NAME_MAX_LENGTH}文字以内にしてください。`);
  }
  if (data.tasks.some((t) => !t.archived && t.name === trimmed)) {
    throw new DomainError('同じ名前の業務がすでにあります。');
  }
  return trimmed;
}

function sameTarget(seg: Segment | undefined, target: SwitchTarget): boolean {
  if (!seg || seg.end !== null) return false;
  return target.kind === 'break' ? seg.kind === 'break' : seg.taskId === target.taskId;
}

export function createFakeStore(): AppStore {
  let data: AppData = initialData();
  let lastBackupAt: EpochMs | null = null;
  const listeners = new Set<() => void>();

  const commit = (next: AppData): void => {
    data = next;
    listeners.forEach((listener) => listener());
  };

  const replaceDay = (day: WorkDay): void => {
    commit({ ...data, days: { ...data.days, [day.date]: day } });
  };

  const startDay = (now: EpochMs): void => {
    const seg = targetSegment({ kind: 'task', taskId: GENERAL_TASK_ID }, now);
    replaceDay({ date: dateKeyOf(now), clockIn: now, clockOut: null, segments: [seg], adjustments: {} });
  };

  const switchTo = (target: SwitchTarget, now: EpochMs = Date.now()): void => {
    const day = requireActiveDay(data);
    if (sameTarget(day.segments[day.segments.length - 1], target)) return;
    replaceDay({ ...day, segments: [...closeLast(day.segments, now), targetSegment(target, now)] });
  };

  const createTask = (name: string): Task => {
    const task: Task = { id: `task-${Date.now()}-${data.tasks.length}`, name: validateName(data, name), archived: false, order: data.tasks.length };
    commit({ ...data, tasks: [...data.tasks, task] });
    return task;
  };

  const updateTask = (id: TaskId, patch: Partial<Task>): void => {
    if (id === GENERAL_TASK_ID) throw new DomainError('庶務は変更できません。');
    commit({ ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  };

  return {
    getState: () => data,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clockIn: (now = Date.now()) => {
      if (activeDayOf(data)) throw new DomainError('すでに勤務中です。');
      startDay(now);
    },
    switchTo,
    clockOut: (now = Date.now()) => {
      const day = requireActiveDay(data);
      replaceDay({ ...day, clockOut: now, segments: closeLast(day.segments, now) });
    },
    resumeDay: (now = Date.now()) => {
      const day = data.days[dateKeyOf(now)];
      if (!day) throw new DomainError('今日の記録がありません。');
      const seg = targetSegment({ kind: 'task', taskId: GENERAL_TASK_ID }, now);
      replaceDay({ ...day, clockOut: null, segments: [...day.segments, seg] });
    },
    closeStaleDay: (date, clockOutAt) => {
      const day = data.days[date];
      if (!day) throw new DomainError('対象の日がありません。');
      replaceDay({ ...day, clockOut: clockOutAt, segments: closeLast(day.segments, clockOutAt) });
    },
    createTask,
    createTaskAndSwitch: (name, now = Date.now()) => {
      const task = createTask(name);
      switchTo({ kind: 'task', taskId: task.id }, now);
      return task;
    },
    renameTask: (id, name) => updateTask(id, { name: validateName(data, name) }),
    setTaskArchived: (id, archived) => updateTask(id, { archived }),
    reorderTasks: (orderedIds) => {
      const orderOf = (id: TaskId): number => orderedIds.indexOf(id);
      commit({ ...data, tasks: data.tasks.map((t) => ({ ...t, order: orderOf(t.id) })) });
    },
    setAdjustment: (date, taskId, minutes) => {
      const day = data.days[date];
      if (!day) throw new DomainError('対象の日がありません。');
      const adjustments = { ...day.adjustments, [taskId]: minutes };
      if (minutes === 0) delete adjustments[taskId];
      replaceDay({ ...day, adjustments });
    },
    exportJson: (now = Date.now()) => {
      lastBackupAt = now;
      return JSON.stringify(data);
    },
    importJson: (json) => {
      try {
        commit(JSON.parse(json) as AppData);
      } catch {
        throw new DomainError('ファイルを読み込めませんでした。');
      }
    },
    getLastBackupAt: () => lastBackupAt,
  };
}
