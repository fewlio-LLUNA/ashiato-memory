import type { DateKey, EpochMs } from '../shared/types';

const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 137 → "2時間17分", 45 → "45分", 120 → "2時間", -5 → "-5分" */
export function formatMinutes(min: number): string {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(min));
  const hours = Math.floor(abs / MINUTES_PER_HOUR);
  const minutes = abs % MINUTES_PER_HOUR;
  if (hours === 0) return `${sign}${minutes}分`;
  return minutes === 0 ? `${sign}${hours}時間` : `${sign}${hours}時間${minutes}分`;
}

/** ローカル時刻の "09:05" */
export function formatClock(t: EpochMs): string {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 経過時間 "1:02:09"。負は 0 として扱う */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / MS_PER_SECOND);
  const sec = totalSec % SECONDS_PER_MINUTE;
  const totalMin = Math.floor(totalSec / SECONDS_PER_MINUTE);
  const min = totalMin % MINUTES_PER_HOUR;
  const hours = Math.floor(totalMin / MINUTES_PER_HOUR);
  return `${hours}:${pad2(min)}:${pad2(sec)}`;
}

/** "2026-10-21" → "10/21(水)" */
export function formatDateLabel(date: DateKey): string {
  const [y, m, d] = date.split('-').map(Number);
  const local = new Date(y ?? NaN, (m ?? NaN) - 1, d ?? NaN);
  return `${local.getMonth() + 1}/${local.getDate()}(${WEEKDAY_LABELS[local.getDay()]})`;
}
