import { useState, type ReactElement } from 'react';
import { formatDateLabel } from '../../domain/format';
import { addDays, calendarWeeks, monthRange } from '../../domain/time';
import type { DateKey } from '../../shared/types';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';
import { periodLabel } from '../screens/summaryPeriod';

const WEEKDAY_LABELS: readonly string[] = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_START = 8;

interface MonthCalendarProps {
  /** 最初に表示する月（この日を含む月） */
  initialMonth: DateKey;
  /** 選択中の日 */
  selected: DateKey;
  /** 今日。これより後の日は押せない */
  today: DateKey;
  /** 記録のある日の判定 */
  hasRecord: (date: DateKey) => boolean;
  onSelect: (date: DateKey) => void;
}

function cellLabel(date: DateKey, today: DateKey, recorded: boolean): string {
  const marks = [date === today ? '今日' : '', recorded ? '記録あり' : ''].filter((m) => m !== '');
  return marks.length > 0 ? `${formatDateLabel(date)} ${marks.join('・')}` : formatDateLabel(date);
}

function dayClass(date: DateKey, selected: DateKey, today: DateKey): string {
  const classes = ['calendar__day'];
  if (date === selected) classes.push('calendar__day--selected');
  if (date === today) classes.push('calendar__day--today');
  return classes.join(' ');
}

interface DayCellProps extends Omit<MonthCalendarProps, 'initialMonth' | 'hasRecord'> {
  date: DateKey;
  recorded: boolean;
}

function DayCell({ date, recorded, selected, today, onSelect }: DayCellProps): ReactElement {
  return (
    <button
      type="button"
      className={dayClass(date, selected, today)}
      aria-label={cellLabel(date, today, recorded)}
      aria-pressed={date === selected}
      disabled={date > today}
      onClick={() => onSelect(date)}
    >
      {Number(date.slice(DAY_START))}
      {recorded && <span className="calendar__dot" aria-hidden="true" />}
    </button>
  );
}

/** 月カレンダー。記録のある日に印（ドット）、今日と選択中の日を枠・塗りで区別する。 */
export function MonthCalendar({ initialMonth, selected, today, hasRecord, onSelect }: MonthCalendarProps): ReactElement {
  const [month, setMonth] = useState<DateKey>(initialMonth);
  const { from, to } = monthRange(month);

  return (
    <div className="calendar">
      <div className="calendar__head">
        <button type="button" className="btn" aria-label="前の月" onClick={() => setMonth(addDays(from, -1))}>
          <ChevronLeftIcon size={20} />
        </button>
        <span className="calendar__title">{periodLabel('month', month)}</span>
        <button type="button" className="btn" aria-label="次の月" disabled={to >= today} onClick={() => setMonth(addDays(to, 1))}>
          <ChevronRightIcon size={20} />
        </button>
      </div>
      <div className="calendar__grid" role="group" aria-label="日付">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="calendar__weekday">{w}</span>
        ))}
        {calendarWeeks(month).flat().map((date, i) =>
          date === null ? (
            <span key={`blank-${i}`} aria-hidden="true" />
          ) : (
            <DayCell key={date} date={date} recorded={hasRecord(date)} selected={selected} today={today} onSelect={onSelect} />
          ),
        )}
      </div>
    </div>
  );
}
