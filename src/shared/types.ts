// 設計書 §4.1 の契約をそのまま書き起こしたもの。変更はボードの「要相談」経由のみ。

export type TaskId = string;
/** ローカル日付キー "YYYY-MM-DD"（業務開始時刻のローカル日付） */
export type DateKey = string;
/** epoch ミリ秒 */
export type EpochMs = number;

export interface Task {
  id: TaskId;
  name: string;
  archived: boolean;   // true: ボタン非表示。過去の集計には出る
  order: number;       // 小さいほど先頭
}

export type SegmentKind = 'task' | 'break';

export interface Segment {
  kind: SegmentKind;
  taskId: TaskId | null;   // kind='break' のとき null
  start: EpochMs;
  end: EpochMs | null;     // 計測中は null（1日に高々1つ、最後の要素のみ）
}

export interface WorkDay {
  date: DateKey;
  clockIn: EpochMs;
  clockOut: EpochMs | null;            // null = 勤務中
  segments: Segment[];                 // start 昇順
  adjustments: Record<TaskId, number>; // 業務別の補正（分, 整数, 負も可）
}

export interface AppData {
  schemaVersion: 1;
  tasks: Task[];
  days: Record<DateKey, WorkDay>;
}

export type SwitchTarget = { kind: 'task'; taskId: TaskId } | { kind: 'break' };

/** 改訂1 F19: 切り替え履歴1行の編集内容。変更しない項目も現在値を入れて渡す */
export interface SegmentEdit {
  start: EpochMs;        // その行の開始時刻（直前の行の end も同じ値になる）
  target: SwitchTarget;  // その行の業務または休憩
}

export interface TaskTotal {
  taskId: TaskId;
  measuredMinutes: number;    // 実測（丸め後）
  adjustmentMinutes: number;  // 補正合計
  totalMinutes: number;       // measured + adjustment
}

export interface DaySummary {
  date: DateKey;
  workMinutes: number;        // 実労働（休憩除く）。= Σ measuredMinutes
  breakMinutes: number;
  perTask: TaskTotal[];       // totalMinutes 降順。0分かつ補正なしの業務は含めない
  current: Segment | null;    // 計測中区間
}

export interface RangeSummary {
  from: DateKey;              // 含む
  to: DateKey;                // 含む
  workMinutes: number;
  breakMinutes: number;
  perTask: TaskTotal[];       // 各日の DaySummary を業務ごとに合算
  dayCount: number;           // 記録のある日数
}

export interface FlexInfo {
  estimatedEnd: EpochMs;      // 終業目安
  remainingWorkMs: number;    // 所定まで残り（負なら超過）
  breakMs: number;            // 休憩実績
}

/** 利用者に見せるエラー。message は日本語でそのまま表示できる文にする */
export class DomainError extends Error {
  constructor(message: string) { super(message); this.name = 'DomainError'; }
}

export interface AppStore {
  getState(): AppData;
  subscribe(listener: () => void): () => void;

  // 打刻・切り替え（now 省略時は Date.now()）
  clockIn(now?: EpochMs): void;                       // 当日WorkDay作成＋庶務区間開始
  switchTo(target: SwitchTarget, now?: EpochMs): void;// 計測中と同じ対象なら何もしない
  clockOut(now?: EpochMs): void;
  resumeDay(now?: EpochMs): void;                     // 当日終業済みを勤務中に戻し庶務を開始
  closeStaleDay(date: DateKey, clockOutAt: EpochMs): void; // F14 打刻忘れの確定

  // 業務
  createTask(name: string): Task;
  createTaskAndSwitch(name: string, now?: EpochMs): Task;
  renameTask(id: TaskId, name: string): void;
  setTaskArchived(id: TaskId, archived: boolean): void;
  reorderTasks(orderedIds: TaskId[]): void;

  // 補正
  setAdjustment(date: DateKey, taskId: TaskId, minutes: number): void;

  // 履歴編集（改訂1 F19）。index は day.segments の添字。開始時刻と対象を1回で原子的に更新する
  editSegment(date: DateKey, index: number, edit: SegmentEdit, now?: EpochMs): void;

  // バックアップ
  exportJson(now?: EpochMs): string; // 呼んだ時刻を最終バックアップ日時として記録
  importJson(json: string): void;    // 検証NGなら DomainError、データは変更しない
  getLastBackupAt(): EpochMs | null;
}
