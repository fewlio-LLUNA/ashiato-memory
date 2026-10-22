import type { ReactElement } from 'react';
import { BACKUP_WARN_DAYS } from '../../shared/constants';
import type { EpochMs } from '../../shared/types';
import { AlertIcon } from '../icons';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface BackupNoticeProps {
  lastBackupAt: EpochMs | null;
  hasRecords: boolean;
  now: EpochMs;
}

function noticeText(lastBackupAt: EpochMs | null, now: EpochMs): string | null {
  if (lastBackupAt === null) return 'まだバックアップを書き出していません。';
  const days = Math.floor((now - lastBackupAt) / MS_PER_DAY);
  return days >= BACKUP_WARN_DAYS ? `最後のバックアップから${days}日たっています。` : null;
}

/** 記録があるのにバックアップが古い／未実施のときだけ注意を出す（データ画面用）。 */
export function BackupNotice({ lastBackupAt, hasRecords, now }: BackupNoticeProps): ReactElement | null {
  if (!hasRecords) return null;
  const text = noticeText(lastBackupAt, now);
  if (text === null) return null;
  return (
    <p className="notice">
      <AlertIcon size={18} /> {text}データは、この端末のブラウザを消すと失われます。
    </p>
  );
}
