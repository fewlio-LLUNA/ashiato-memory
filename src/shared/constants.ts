// 設計書 §4.4 の共有定数。変更はボードの「要相談」経由のみ。

export const STORAGE_KEY = 'ashiatomemory:v1';
export const SCHEMA_VERSION = 1;
export const GENERAL_TASK_ID = 'general';
export const GENERAL_TASK_NAME = '庶務';
export const MS_PER_MINUTE = 60_000;
export const STANDARD_WORK_MS = (7 * 60 + 40) * MS_PER_MINUTE; // 所定 7時間40分
export const MIN_BREAK_MS = 60 * MS_PER_MINUTE;                // 休憩 1時間
export const TASK_NAME_MAX_LENGTH = 50;
export const LAST_BACKUP_KEY = 'ashiatomemory:v1:lastBackupAt'; // AppData とは別キー
export const BACKUP_WARN_DAYS = 7;                              // これ以上空いたら注意表示
