import { useState, type ReactElement } from 'react';
import { formatClock } from '../../domain/format';
import { withClockTime } from '../../domain/time';
import { DomainError, type AppData, type AppStore, type Segment, type WorkDay } from '../../shared/types';
import { useActionRunner } from '../hooks/useActionRunner';
import { PencilIcon } from '../icons';
import '../styles/history.css';
import { ErrorMessage } from './ErrorMessage';
import { SegmentEditForm, type SegmentFormValues } from './SegmentEditForm';
import { segmentLabel } from './taskLabels';

interface SegmentHistoryProps {
  store: AppStore;
  data: AppData;
  day: WorkDay;
  /** true なら折りたたみ（今日画面用）。業務ボタンより目立たせない */
  collapsible?: boolean;
}

const TITLE = '切り替え履歴';
const INVALID_TIME_MESSAGE = '開始時刻を「時:分」の形式で入力してください。';

function rangeText(seg: Segment): string {
  return `${formatClock(seg.start)} 〜 ${seg.end === null ? '計測中' : formatClock(seg.end)}`;
}

interface HistoryRowProps {
  data: AppData;
  seg: Segment;
  onEdit: () => void;
}

function HistoryRow({ data, seg, onEdit }: HistoryRowProps): ReactElement {
  return (
    <>
      <span className="history__time">{rangeText(seg)}</span>
      <span className="history__label">{segmentLabel(data, seg)}</span>
      <button type="button" className="btn history__edit" aria-label={`${rangeText(seg)} ${segmentLabel(data, seg)} を編集`} onClick={onEdit}>
        <PencilIcon size={18} />
      </button>
    </>
  );
}

/**
 * 切り替え履歴（時刻と業務）。各行を編集できる（同時に1行まで）。
 * 日付が変わるときは呼び出し側が key={day.date} で作り直し、編集状態を持ち越さない。
 */
export function SegmentHistory({ store, data, day, collapsible = false }: SegmentHistoryProps): ReactElement {
  const runner = useActionRunner();
  const [editing, setEditing] = useState<number | null>(null);

  const startEdit = (index: number): void => {
    runner.clear();
    setEditing(index);
  };

  const close = (): void => {
    runner.clear();
    setEditing(null);
  };

  const save = (index: number, seg: Segment, values: SegmentFormValues): void => {
    const start = index === 0 ? seg.start : withClockTime(seg.start, values.time);
    const saved = runner.run(() => {
      if (start === null) throw new DomainError(INVALID_TIME_MESSAGE);
      store.editSegment(day.date, index, { start, target: values.target });
    });
    if (saved) setEditing(null);
  };

  const body = (
    <>
      <ErrorMessage message={runner.error} />
      <ol className="history">
        {day.segments.map((seg, index) => (
          <li key={seg.start} className="history__row">
            {editing === index ? (
              <SegmentEditForm data={data} seg={seg} isFirst={index === 0} onSave={(v) => save(index, seg, v)} onCancel={close} />
            ) : (
              <HistoryRow data={data} seg={seg} onEdit={() => startEdit(index)} />
            )}
          </li>
        ))}
      </ol>
    </>
  );

  if (collapsible) {
    return (
      <details className="card history-details">
        <summary className="history-details__summary">{TITLE}</summary>
        {body}
      </details>
    );
  }
  return (
    <section className="card" aria-label={TITLE}>
      <h2 className="section-title">{TITLE}</h2>
      {body}
    </section>
  );
}
