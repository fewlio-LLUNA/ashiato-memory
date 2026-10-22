import {
  GENERAL_TASK_ID,
  GENERAL_TASK_NAME,
  SCHEMA_VERSION,
  TASK_NAME_MAX_LENGTH,
} from '../shared/constants';
import {
  DomainError,
  type AppData,
  type DateKey,
  type EpochMs,
  type Segment,
  type SegmentEdit,
  type SwitchTarget,
  type Task,
  type TaskId,
  type WorkDay,
} from '../shared/types';
import { findStaleDay, getActiveDay, summarizeDay } from '../domain/summary';
import { formatClock } from '../domain/format';
import { toDateKey } from '../domain/time';

const STALE_DAY_MESSAGE = '前の日の終了時刻が未確定です。先に終了時刻を入力してください。';

/** 初期データ（庶務のみ） */
export function createInitialData(): AppData {
  const general: Task = { id: GENERAL_TASK_ID, name: GENERAL_TASK_NAME, archived: false, order: 0 };
  return { schemaVersion: SCHEMA_VERSION, tasks: [general], days: {} };
}

// ---- 共通ヘルパー ----

function generalSegment(start: EpochMs): Segment {
  return { kind: 'task', taskId: GENERAL_TASK_ID, start, end: null };
}

function withDay(data: AppData, day: WorkDay): AppData {
  return { ...data, days: { ...data.days, [day.date]: day } };
}

/** 計測中区間を now で閉じる。now が開始より前なら DomainError */
function closeCurrent(segments: Segment[], now: EpochMs): Segment[] {
  const last = segments[segments.length - 1];
  if (last === undefined || last.end !== null) return segments;
  if (now < last.start) throw new DomainError('現在の記録より前の時刻には切り替えられません。');
  return [...segments.slice(0, -1), { ...last, end: now }];
}

/** 勤務中の日を返す。なければ・打刻忘れなら DomainError */
function requireWorkingDay(data: AppData, now: EpochMs): WorkDay {
  if (findStaleDay(data, now) !== null) {
    throw new DomainError(STALE_DAY_MESSAGE);
  }
  const day = getActiveDay(data);
  if (day === null) throw new DomainError('勤務中ではありません。先に出勤を記録してください。');
  return day;
}

function findTask(data: AppData, id: TaskId): Task {
  const task = data.tasks.find((t) => t.id === id);
  if (task === undefined) throw new DomainError('その業務が見つかりません。');
  return task;
}

function requireNotGeneral(id: TaskId): void {
  if (id === GENERAL_TASK_ID) throw new DomainError(`「${GENERAL_TASK_NAME}」は変更できません。`);
}

// ---- 打刻・切り替え ----

/** 出勤。当日の WorkDay を作成し庶務の計測を始める */
export function clockIn(data: AppData, now: EpochMs): AppData {
  if (findStaleDay(data, now) !== null) {
    throw new DomainError(STALE_DAY_MESSAGE);
  }
  if (getActiveDay(data) !== null) throw new DomainError('すでに勤務中です。');
  const date = toDateKey(now);
  if (data.days[date] !== undefined) {
    throw new DomainError('今日はすでに終了しています。再開する場合は「再開」を押してください。');
  }
  const day: WorkDay = { date, clockIn: now, clockOut: null, segments: [generalSegment(now)], adjustments: {} };
  return withDay(data, day);
}

function targetToSegment(data: AppData, target: SwitchTarget, now: EpochMs): Segment {
  if (target.kind === 'break') return { kind: 'break', taskId: null, start: now, end: null };
  const task = findTask(data, target.taskId);
  if (task.archived) throw new DomainError('非表示の業務には切り替えられません。');
  return { kind: 'task', taskId: task.id, start: now, end: null };
}

function isSameTarget(current: Segment | undefined, next: Segment): boolean {
  return current !== undefined && current.end === null && current.kind === next.kind && current.taskId === next.taskId;
}

/** 計測対象の切り替え。計測中と同じ対象なら何もしない */
export function switchTo(data: AppData, target: SwitchTarget, now: EpochMs): AppData {
  const day = requireWorkingDay(data, now);
  const next = targetToSegment(data, target, now);
  if (isSameTarget(day.segments[day.segments.length - 1], next)) return data;
  return withDay(data, { ...day, segments: [...closeCurrent(day.segments, now), next] });
}

/** 退勤。計測中の区間を閉じて終業にする */
export function clockOut(data: AppData, now: EpochMs): AppData {
  const day = requireWorkingDay(data, now);
  return withDay(data, { ...day, segments: closeCurrent(day.segments, now), clockOut: now });
}

/** 当日の終業済みを勤務中に戻す。終業〜再開の間は記録しない */
export function resumeDay(data: AppData, now: EpochMs): AppData {
  if (findStaleDay(data, now) !== null) throw new DomainError(STALE_DAY_MESSAGE);
  if (getActiveDay(data) !== null) throw new DomainError('すでに勤務中です。');
  const day = data.days[toDateKey(now)];
  if (day === undefined || day.clockOut === null) throw new DomainError('再開できる今日の記録がありません。');
  if (now < day.clockOut) throw new DomainError('終了時刻より前には再開できません。');
  return withDay(data, { ...day, clockOut: null, segments: [...day.segments, generalSegment(now)] });
}

/** 打刻忘れの確定。clockOutAt を最後の区間の終了と退勤時刻にする */
export function closeStaleDay(data: AppData, date: DateKey, clockOutAt: EpochMs): AppData {
  const day = data.days[date];
  if (day === undefined || day.clockOut !== null) throw new DomainError('確定できる打刻忘れの記録がありません。');
  const lastStart = day.segments[day.segments.length - 1]?.start ?? day.clockIn;
  if (clockOutAt <= lastStart) {
    throw new DomainError('終了時刻は、最後の記録の開始より後にしてください。');
  }
  return withDay(data, { ...day, segments: closeCurrent(day.segments, clockOutAt), clockOut: clockOutAt });
}

// ---- 業務 ----

function normalizeName(raw: string): string {
  const name = raw.trim();
  if (name === '') throw new DomainError('業務名を入力してください。');
  if (name.length > TASK_NAME_MAX_LENGTH) {
    throw new DomainError(`業務名は${TASK_NAME_MAX_LENGTH}文字以内にしてください。`);
  }
  return name;
}

function assertNoDuplicate(data: AppData, name: string, exceptId: TaskId | null): void {
  const dup = data.tasks.some((t) => !t.archived && t.id !== exceptId && t.name === name);
  if (dup) throw new DomainError(`「${name}」はすでにあります。`);
}

/** 業務を追加する。id は呼び出し側が決める（純粋性のため） */
export function createTask(data: AppData, id: TaskId, rawName: string): { data: AppData; task: Task } {
  const name = normalizeName(rawName);
  assertNoDuplicate(data, name, null);
  const nextOrder = data.tasks.reduce((max, t) => Math.max(max, t.order), -1) + 1;
  const task: Task = { id, name, archived: false, order: nextOrder };
  return { data: { ...data, tasks: [...data.tasks, task] }, task };
}

function replaceTask(data: AppData, task: Task): AppData {
  return { ...data, tasks: data.tasks.map((t) => (t.id === task.id ? task : t)) };
}

export function renameTask(data: AppData, id: TaskId, rawName: string): AppData {
  requireNotGeneral(id);
  const task = findTask(data, id);
  const name = normalizeName(rawName);
  if (!task.archived) assertNoDuplicate(data, name, id);
  return replaceTask(data, { ...task, name });
}

export function setTaskArchived(data: AppData, id: TaskId, archived: boolean): AppData {
  requireNotGeneral(id);
  const task = findTask(data, id);
  if (!archived && task.archived) assertNoDuplicate(data, task.name, id);
  return replaceTask(data, { ...task, archived });
}

/** 指定順を先頭に並べ、指定されなかった業務は元の順で後ろに続ける */
export function reorderTasks(data: AppData, orderedIds: TaskId[]): AppData {
  orderedIds.forEach((id) => findTask(data, id));
  if (new Set(orderedIds).size !== orderedIds.length) throw new DomainError('並べ替えの指定が重複しています。');
  const rest = [...data.tasks].sort((a, b) => a.order - b.order).filter((t) => !orderedIds.includes(t.id));
  const sequence = [...orderedIds.map((id) => findTask(data, id)), ...rest];
  const orderOf = new Map(sequence.map((t, index) => [t.id, index]));
  return { ...data, tasks: data.tasks.map((t) => ({ ...t, order: orderOf.get(t.id) ?? t.order })) };
}

// ---- 補正 ----

function withoutKey(record: Record<TaskId, number>, key: TaskId): Record<TaskId, number> {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

/** 業務別の補正（分）を設定する。0 ならキーを削除。実測との合計が負になる値は不可 */
export function setAdjustment(
  data: AppData,
  date: DateKey,
  taskId: TaskId,
  minutes: number,
  now: EpochMs,
): AppData {
  const day = data.days[date];
  if (day === undefined) throw new DomainError('その日の記録がありません。');
  findTask(data, taskId);
  if (!Number.isInteger(minutes)) throw new DomainError('補正は整数の分で入力してください。');
  const measured = summarizeDay(day, now).perTask.find((t) => t.taskId === taskId)?.measuredMinutes ?? 0;
  if (measured + minutes < 0) {
    throw new DomainError('補正後の合計が0分より小さくなるため設定できません。');
  }
  const adjustments =
    minutes === 0 ? withoutKey(day.adjustments, taskId) : { ...day.adjustments, [taskId]: minutes };
  return withDay(data, { ...day, adjustments });
}

// ---- 履歴編集 ----

const NEGATIVE_TOTAL_MESSAGE = '補正と合わせて0分未満になる業務があるため変更できません。';

/** 先頭の行は業務開始時刻なので動かせない。それ以外は前後の行と矛盾しない範囲に限る */
function assertStartAllowed(day: WorkDay, index: number, start: EpochMs, now: EpochMs): void {
  const current = day.segments[index];
  if (current === undefined) throw new DomainError('その履歴が見つかりません。');
  if (index === 0) {
    if (start !== current.start) throw new DomainError('先頭の行の開始時刻（業務開始）は変更できません。');
    return;
  }
  const prevStart = day.segments[index - 1]?.start ?? current.start;
  if (start <= prevStart) {
    throw new DomainError(`直前の行の開始（${formatClock(prevStart)}）より後にしてください。`);
  }
  if (current.end !== null && start >= current.end) {
    throw new DomainError(`この行の終了（${formatClock(current.end)}）より前にしてください。`);
  }
  if (start > now) throw new DomainError('未来の時刻は指定できません。');
  if (current.end === null && start >= now) {
    throw new DomainError(`現在時刻（${formatClock(now)}）より前にしてください。`);
  }
}

/** 変更後の対象を区間に反映する。非表示の業務は、現在と同じ業務のときだけ許す */
function editedSegment(data: AppData, current: Segment, edit: SegmentEdit): Segment {
  const { target } = edit;
  if (target.kind === 'break') return { ...current, kind: 'break', taskId: null, start: edit.start };
  const task = findTask(data, target.taskId);
  const unchanged = current.kind === 'task' && current.taskId === task.id;
  if (task.archived && !unchanged) throw new DomainError('非表示の業務には変更できません。');
  return { ...current, kind: 'task', taskId: task.id, start: edit.start };
}

function assertAdjustmentsHold(day: WorkDay, now: EpochMs): void {
  const totals = summarizeDay(day, now).perTask;
  const broken = Object.entries(day.adjustments).some(([taskId, minutes]) => {
    const measured = totals.find((t) => t.taskId === taskId)?.measuredMinutes ?? 0;
    return measured + minutes < 0;
  });
  if (broken) throw new DomainError(NEGATIVE_TOTAL_MESSAGE);
}

/** 切り替え履歴1行の開始時刻と対象を更新する。直前の行の終了も同じ時刻に揃える */
export function editSegment(
  data: AppData,
  date: DateKey,
  index: number,
  edit: SegmentEdit,
  now: EpochMs,
): AppData {
  const day = data.days[date];
  if (day === undefined) throw new DomainError('その日の記録がありません。');
  const current = Number.isInteger(index) ? day.segments[index] : undefined;
  if (current === undefined) throw new DomainError('その履歴が見つかりません。');
  assertStartAllowed(day, index, edit.start, now);
  const edited = editedSegment(data, current, edit);
  const segments = day.segments.map((seg, i) => {
    if (i === index) return edited;
    return i === index - 1 ? { ...seg, end: edit.start } : seg;
  });
  const next: WorkDay = { ...day, segments };
  assertAdjustmentsHold(next, now);
  return withDay(data, next);
}
