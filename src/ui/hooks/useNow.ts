import { useEffect, useState } from 'react';
import type { EpochMs } from '../../shared/types';

const TICK_INTERVAL_MS = 1000;

/** 1秒ごとに現在時刻を更新して再描画を促す。状態は書き換えない。 */
export function useNow(intervalMs: number = TICK_INTERVAL_MS): EpochMs {
  const [now, setNow] = useState<EpochMs>(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timerId);
  }, [intervalMs]);

  return now;
}
