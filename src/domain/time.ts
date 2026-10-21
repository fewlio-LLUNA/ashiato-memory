import type { DateKey, EpochMs, Segment } from '../shared/types';

const DAYS_PER_WEEK = 7;
const PAD_WIDTH = 2;

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

function pad(n: number): string {
  return String(n).padStart(PAD_WIDTH, '0');
}

function formatKey(year: number, month: number, day: number): DateKey {
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
}

function parseKey(date: DateKey): DateParts {
  const [y, m, d] = date.split('-').map(Number);
  return { year: y ?? NaN, month: m ?? NaN, day: d ?? NaN };
}

/** DateKey をローカル時刻の 0:00 の Date にする */
function keyToLocalDate(date: DateKey): Date {
  const { year, month, day } = parseKey(date);
  return new Date(year, month - 1, day);
}

function localDateToKey(d: Date): DateKey {
  return formatKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** epoch ms をローカル日付キー "YYYY-MM-DD" にする */
export function toDateKey(t: EpochMs): DateKey {
  return localDateToKey(new Date(t));
}

/** date を n 日ずらした日付キー（負も可） */
export function addDays(date: DateKey, n: number): DateKey {
  const d = keyToLocalDate(date);
  d.setDate(d.getDate() + n);
  return localDateToKey(d);
}

/** date を含む週の範囲（月曜始まり、両端を含む） */
export function weekRange(date: DateKey): { from: DateKey; to: DateKey } {
  const sinceMonday = (keyToLocalDate(date).getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  const from = addDays(date, -sinceMonday);
  return { from, to: addDays(from, DAYS_PER_WEEK - 1) };
}

/** date を含む月の範囲（両端を含む） */
export function monthRange(date: DateKey): { from: DateKey; to: DateKey } {
  const { year, month } = parseKey(date);
  const lastDay = new Date(year, month, 0).getDate();
  return { from: formatKey(year, month, 1), to: formatKey(year, month, lastDay) };
}

/** 区間の長さ(ms)。計測中（end が null）は now まで。負にはならない */
export function segmentMs(seg: Segment, now: EpochMs): number {
  return Math.max(0, (seg.end ?? now) - seg.start);
}
