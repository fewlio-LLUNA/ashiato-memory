import { formatClock } from '../../domain/format';
import { toDateKey } from '../../domain/time';
import type { EpochMs } from '../../shared/types';

const BACKUP_FILE_PREFIX = 'ashiatomemory-backup';
const JSON_MIME = 'application/json';

/** "ashiatomemory-backup-2026-10-21-0905.json" 形式のファイル名。 */
export function backupFileName(now: EpochMs): string {
  const time = formatClock(now).replace(':', '');
  return `${BACKUP_FILE_PREFIX}-${toDateKey(now)}-${time}.json`;
}

/** 文字列を JSON ファイルとしてブラウザにダウンロードさせる（通信は発生しない）。 */
export function downloadJson(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: JSON_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
