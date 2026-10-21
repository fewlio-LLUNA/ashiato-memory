import { addDays, monthRange, weekRange } from '../../domain/time';
import { formatDateLabel } from '../../domain/format';
import type { DateKey } from '../../shared/types';

export type PeriodMode = 'day' | 'week' | 'month';

export interface DateRange {
  from: DateKey;
  to: DateKey;
}

const YEAR_END = 4;
const MONTH_START = 5;
const MONTH_END = 7;

/** anchor を含む期間（日: その日のみ、週: 月曜始まり、月: 暦月）。 */
export function rangeOf(mode: PeriodMode, anchor: DateKey): DateRange {
  if (mode === 'day') return { from: anchor, to: anchor };
  return mode === 'week' ? weekRange(anchor) : monthRange(anchor);
}

/** 前後の期間に動かした anchor。direction は -1（前）か 1（次）。 */
export function shiftAnchor(mode: PeriodMode, anchor: DateKey, direction: -1 | 1): DateKey {
  const range = rangeOf(mode, anchor);
  return direction === -1 ? addDays(range.from, -1) : addDays(range.to, 1);
}

/** 画面に出す期間の見出し。 */
export function periodLabel(mode: PeriodMode, anchor: DateKey): string {
  const { from, to } = rangeOf(mode, anchor);
  if (mode === 'day') return formatDateLabel(from);
  if (mode === 'week') return `${formatDateLabel(from)} 〜 ${formatDateLabel(to)}`;
  return `${from.slice(0, YEAR_END)}年${Number(from.slice(MONTH_START, MONTH_END))}月`;
}
