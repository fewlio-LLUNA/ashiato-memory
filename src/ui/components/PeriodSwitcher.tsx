import type { ReactElement } from 'react';
import type { DateKey } from '../../shared/types';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';
import { periodLabel, type PeriodMode } from '../screens/summaryPeriod';

const MODES: readonly { mode: PeriodMode; label: string }[] = [
  { mode: 'day', label: '日' },
  { mode: 'week', label: '週' },
  { mode: 'month', label: '月' },
];

interface PeriodSwitcherProps {
  mode: PeriodMode;
  anchor: DateKey;
  onModeChange: (mode: PeriodMode) => void;
  onShift: (direction: -1 | 1) => void;
  /** 指定すると日付ラベルがボタンになる（日モードのカレンダー開閉用） */
  onLabelClick?: () => void;
  /** カレンダーが開いているか */
  labelExpanded?: boolean;
}

/** 日/週/月の切り替えと、前後への移動。 */
export function PeriodSwitcher({ mode, anchor, onModeChange, onShift, onLabelClick, labelExpanded = false }: PeriodSwitcherProps): ReactElement {
  return (
    <div className="period">
      <div className="period__modes" role="group" aria-label="集計単位">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            className={m.mode === mode ? 'btn btn--primary' : 'btn'}
            aria-pressed={m.mode === mode}
            onClick={() => onModeChange(m.mode)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="period__nav">
        <button type="button" className="btn" aria-label="前の期間" onClick={() => onShift(-1)}>
          <ChevronLeftIcon size={20} />
        </button>
        {onLabelClick ? (
          <button type="button" className="btn period__label" aria-expanded={labelExpanded} aria-live="polite" onClick={onLabelClick}>
            <CalendarIcon size={18} />
            {periodLabel(mode, anchor)}
          </button>
        ) : (
          <span className="period__label" aria-live="polite">
            {periodLabel(mode, anchor)}
          </span>
        )}
        <button type="button" className="btn" aria-label="次の期間" onClick={() => onShift(1)}>
          <ChevronRightIcon size={20} />
        </button>
      </div>
    </div>
  );
}
