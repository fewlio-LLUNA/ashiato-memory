import { useState, type ChangeEvent, type ReactElement } from 'react';
import { formatClock, formatDateLabel } from '../../domain/format';
import { toDateKey } from '../../domain/time';
import { DomainError, type AppStore, type EpochMs } from '../../shared/types';
import { ErrorMessage } from '../components/ErrorMessage';
import { useActionRunner } from '../hooks/useActionRunner';
import { DownloadIcon, UploadIcon } from '../icons';
import '../styles/manage.css';
import { backupFileName, downloadJson } from './downloadFile';

interface DataScreenProps {
  store: AppStore;
}

const IMPORT_CONFIRM = '現在のデータは、読み込むファイルの内容で置き換わります。よろしいですか？';
const IMPORT_DONE = 'データを読み込みました。';
const IMPORT_READ_ERROR = 'ファイルを読み込めませんでした。';

function lastBackupText(at: EpochMs | null): string {
  if (at === null) return 'まだ書き出していません';
  return `${formatDateLabel(toDateKey(at))} ${formatClock(at)}`;
}

/** データ画面。バックアップの書き出し・読み込みと、保存先の説明。 */
export function DataScreen({ store }: DataScreenProps): ReactElement {
  const runner = useActionRunner();
  const [done, setDone] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<EpochMs | null>(() => store.getLastBackupAt());

  const handleExport = (): void => {
    setDone(null);
    const now = Date.now();
    runner.run(() => downloadJson(backupFileName(now), store.exportJson(now)));
    setLastBackupAt(store.getLastBackupAt());
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !window.confirm(IMPORT_CONFIRM)) return;
    setDone(null);
    const text = await file.text().catch(() => null);
    const imported = runner.run(() => {
      if (text === null) throw new DomainError(IMPORT_READ_ERROR);
      store.importJson(text);
    });
    if (imported) setDone(IMPORT_DONE);
  };

  return (
    <div className="manage">
      <h1 className="screen__title">データ</h1>
      <p className="notice">データはこの端末のブラウザにのみ保存されます。サーバーには送信されません。ブラウザの閲覧データを消すと記録も消えるため、定期的に書き出してください。</p>
      <ErrorMessage message={runner.error} />
      {done !== null && <p className="message--ok" role="status">{done}</p>}
      <section className="card">
        <h2 className="section-title">バックアップ</h2>
        <p>最終バックアップ: <strong>{lastBackupText(lastBackupAt)}</strong></p>
        <button type="button" className="btn btn--primary" onClick={handleExport}>
          <DownloadIcon size={18} />
          ファイルに書き出す
        </button>
      </section>
      <section className="card">
        <h2 className="section-title">復元</h2>
        <p className="muted">書き出したファイルを読み込むと、現在のデータが置き換わります。</p>
        <label className="btn file-btn">
          <UploadIcon size={18} />
          ファイルから読み込む
          <input type="file" accept="application/json,.json" className="visually-hidden" onChange={(e) => void handleImport(e)} />
        </label>
      </section>
    </div>
  );
}
