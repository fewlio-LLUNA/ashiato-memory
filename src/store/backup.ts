import { GENERAL_TASK_ID, LAST_BACKUP_KEY, SCHEMA_VERSION } from '../shared/constants';
import {
  DomainError,
  type AppData,
  type DateKey,
  type EpochMs,
  type Segment,
  type Task,
  type WorkDay,
} from '../shared/types';

/** localStorage のうち使う部分（テストで差し替えるための最小インターフェース） */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const JSON_INDENT = 2;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INVALID_PREFIX = 'バックアップファイルを読み込めませんでした。';

type Obj = Record<string, unknown>;

function fail(reason: string): never {
  throw new DomainError(`${INVALID_PREFIX}${reason}`);
}

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function asObj(v: unknown, where: string): Obj {
  if (!isObj(v)) fail(`${where}の形式が正しくありません。`);
  return v;
}

function asArray(v: unknown, where: string): unknown[] {
  if (!Array.isArray(v)) fail(`${where}の形式が正しくありません。`);
  return v;
}

function parseTask(raw: unknown): Task {
  const t = asObj(raw, '業務');
  const { id, name, archived, order } = t;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string') fail('業務の内容が正しくありません。');
  if (typeof archived !== 'boolean' || !isFiniteNumber(order)) fail('業務の内容が正しくありません。');
  return { id, name, archived, order };
}

function parseTasks(raw: unknown): Task[] {
  const tasks = asArray(raw, '業務一覧').map(parseTask);
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length) fail('業務のIDが重複しています。');
  if (!tasks.some((t) => t.id === GENERAL_TASK_ID)) fail('「庶務」が含まれていません。');
  return tasks;
}

function parseSegment(raw: unknown, taskIds: Set<string>): Segment {
  const s = asObj(raw, '記録の区間');
  const { kind, taskId, start, end } = s;
  if (!isFiniteNumber(start) || !(end === null || isFiniteNumber(end))) fail('区間の時刻が正しくありません。');
  if (end !== null && end < start) fail('区間の終了が開始より前になっています。');
  if (kind === 'break' && taskId === null) return { kind, taskId: null, start, end };
  if (kind === 'task' && typeof taskId === 'string' && taskIds.has(taskId)) return { kind, taskId, start, end };
  return fail('区間の種類または業務が正しくありません。');
}

function checkSegmentOrder(segments: Segment[]): void {
  segments.forEach((seg, i) => {
    const prev = segments[i - 1];
    if (prev !== undefined && (prev.end === null || seg.start < prev.end)) {
      fail('区間の順序が正しくありません。');
    }
  });
}

function parseAdjustments(raw: unknown, taskIds: Set<string>): Record<string, number> {
  const adj = asObj(raw, '補正');
  for (const [id, minutes] of Object.entries(adj)) {
    if (!taskIds.has(id) || typeof minutes !== 'number' || !Number.isInteger(minutes)) {
      fail('補正の内容が正しくありません。');
    }
  }
  return adj as Record<string, number>;
}

function parseDay(key: DateKey, raw: unknown, taskIds: Set<string>): WorkDay {
  const d = asObj(raw, `${key} の記録`);
  const { date, clockIn, clockOut } = d;
  if (date !== key || !isFiniteNumber(clockIn)) fail(`${key} の記録が正しくありません。`);
  if (!(clockOut === null || isFiniteNumber(clockOut))) fail(`${key} の終了時刻が正しくありません。`);
  const segments = asArray(d.segments, '区間一覧').map((s) => parseSegment(s, taskIds));
  checkSegmentOrder(segments);
  const last = segments[segments.length - 1];
  if (last !== undefined && last.end === null && clockOut !== null) fail('終了済みの日に計測中の区間があります。');
  return { date, clockIn, clockOut, segments, adjustments: parseAdjustments(d.adjustments, taskIds) };
}

function parseDays(raw: unknown, taskIds: Set<string>): Record<DateKey, WorkDay> {
  const days: Record<DateKey, WorkDay> = {};
  for (const [key, value] of Object.entries(asObj(raw, '日別の記録'))) {
    if (!DATE_KEY_PATTERN.test(key)) fail('日付の形式が正しくありません。');
    days[key] = parseDay(key, value, taskIds);
  }
  if (Object.values(days).filter((d) => d.clockOut === null).length > 1) fail('勤務中の日が複数あります。');
  return days;
}

/** JSON 文字列を検証して AppData にする。NG なら DomainError */
export function parseAppData(json: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail('JSON として読み取れません。');
  }
  const root = asObj(parsed, 'データ全体');
  if (root.schemaVersion !== SCHEMA_VERSION) fail('対応していないバージョンのデータです。');
  const tasks = parseTasks(root.tasks);
  const taskIds = new Set(tasks.map((t) => t.id));
  return { schemaVersion: SCHEMA_VERSION, tasks, days: parseDays(root.days, taskIds) };
}

/** 書き出し用の JSON 文字列 */
export function serializeData(data: AppData): string {
  return JSON.stringify(data, null, JSON_INDENT);
}

/** 最終バックアップ日時。未記録・不正値なら null */
export function readLastBackupAt(storage: StorageLike): EpochMs | null {
  const raw = storage.getItem(LAST_BACKUP_KEY);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function writeLastBackupAt(storage: StorageLike, at: EpochMs): void {
  storage.setItem(LAST_BACKUP_KEY, String(at));
}
