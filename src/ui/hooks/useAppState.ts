import { useSyncExternalStore } from 'react';
import type { AppData, AppStore } from '../../shared/types';

/** Store の状態を購読する。getState は変更がない限り同一参照を返す契約。 */
export function useAppState(store: AppStore): AppData {
  return useSyncExternalStore(store.subscribe, store.getState);
}
