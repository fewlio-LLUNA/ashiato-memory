import { useCallback, useState } from 'react';
import { DomainError } from '../../shared/types';

export interface ActionRunner {
  /** 直近の操作で出た利用者向けエラー文。なければ null */
  error: string | null;
  /** Store 操作を実行する。DomainError は message を保持し false を返す。それ以外は再送出 */
  run: (action: () => void) => boolean;
  clear: () => void;
}

/** Store 操作の DomainError を捕まえて画面に出すための小さなフック。 */
export function useActionRunner(): ActionRunner {
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((action: () => void): boolean => {
    try {
      action();
      setError(null);
      return true;
    } catch (e: unknown) {
      if (e instanceof DomainError) {
        setError(e.message);
        return false;
      }
      throw e;
    }
  }, []);

  const clear = useCallback((): void => setError(null), []);

  return { error, run, clear };
}
