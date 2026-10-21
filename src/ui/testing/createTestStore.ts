import type { AppStore } from '../../shared/types';
import { createAppStore } from '../../store/createAppStore';

/** UI テスト用。localStorage を使わず、タブ間同期も無効にした実 Store を返す。 */
export function createTestStore(): AppStore {
  const map = new Map<string, string>();
  return createAppStore({
    storage: {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => void map.set(key, value),
      removeItem: (key) => void map.delete(key),
    },
    eventTarget: null,
  });
}
