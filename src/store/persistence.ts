import { STORAGE_KEY } from '../shared/constants';
import { DomainError, type AppData, type EpochMs } from '../shared/types';
import { createInitialData } from './actions';
import { parseAppData, type StorageLike } from './backup';

/** 壊れた保存データの退避先キーの接頭辞 */
const CORRUPT_KEY_PREFIX = `${STORAGE_KEY}:corrupt-`;
const SAVE_FAILED_MESSAGE = '保存できませんでした。ブラウザの保存領域がいっぱいか、保存が許可されていない可能性があります。';

/** window など、storage イベントを受け取れる対象 */
export interface StorageEventTarget {
  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
}

/** 保存データの生文字列。なければ null */
export function readRaw(storage: StorageLike): string | null {
  return storage.getItem(STORAGE_KEY);
}

/**
 * 保存データを読み込む。なければ初期データ。
 * 壊れていたら中身を退避キーへ移し、初期データで起動する。
 */
export function loadData(storage: StorageLike, now: EpochMs): AppData {
  const raw = readRaw(storage);
  if (raw === null) return createInitialData();
  try {
    return parseAppData(raw);
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    storage.setItem(`${CORRUPT_KEY_PREFIX}${now}`, raw);
    storage.removeItem(STORAGE_KEY);
    return createInitialData();
  }
}

/** 保存する。失敗したら DomainError。保存した生文字列を返す */
export function saveData(storage: StorageLike, data: AppData): string {
  const raw = JSON.stringify(data);
  try {
    storage.setItem(STORAGE_KEY, raw);
  } catch {
    throw new DomainError(SAVE_FAILED_MESSAGE);
  }
  return raw;
}

/** 他タブによる変更（storage イベント）を監視する。解除関数を返す */
export function watchStorage(
  target: StorageEventTarget,
  onChange: (key: string | null) => void,
): () => void {
  const listener = (event: StorageEvent): void => onChange(event.key);
  target.addEventListener('storage', listener);
  return () => target.removeEventListener('storage', listener);
}
