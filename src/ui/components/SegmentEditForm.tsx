import { useState, type FormEvent, type ReactElement } from 'react';
import { formatClock } from '../../domain/format';
import type { AppData, Segment, SwitchTarget } from '../../shared/types';
import { BREAK_LABEL, taskNameOf } from './taskLabels';

const BREAK_VALUE = 'break';
const TASK_PREFIX = 'task:';
const START_LABEL = '業務開始';

export interface SegmentFormValues {
  /** "HH:MM"。先頭行では使われない */
  time: string;
  target: SwitchTarget;
}

interface SegmentEditFormProps {
  data: AppData;
  seg: Segment;
  /** 先頭の行か（開始時刻＝業務開始は変更できない） */
  isFirst: boolean;
  onSave: (values: SegmentFormValues) => void;
  onCancel: () => void;
}

interface Option {
  value: string;
  label: string;
}

function valueOf(seg: Segment): string {
  return seg.kind === 'break' || seg.taskId === null ? BREAK_VALUE : `${TASK_PREFIX}${seg.taskId}`;
}

function targetOf(value: string): SwitchTarget {
  return value === BREAK_VALUE ? { kind: 'break' } : { kind: 'task', taskId: value.slice(TASK_PREFIX.length) };
}

/** 選べる業務: 表示中の業務＋休憩。現在の行の業務が非表示でも残す。 */
function optionsFor(data: AppData, seg: Segment): Option[] {
  const current = valueOf(seg);
  const tasks = [...data.tasks]
    .filter((t) => !t.archived || `${TASK_PREFIX}${t.id}` === current)
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ value: `${TASK_PREFIX}${t.id}`, label: t.name }));
  const options = [...tasks, { value: BREAK_VALUE, label: BREAK_LABEL }];
  if (options.some((o) => o.value === current)) return options;
  return [{ value: current, label: taskNameOf(data, seg.taskId ?? '') }, ...options];
}

/** 切り替え履歴1行の編集フォーム。保存・キャンセルは親が処理する。 */
export function SegmentEditForm({ data, seg, isFirst, onSave, onCancel }: SegmentEditFormProps): ReactElement {
  const [time, setTime] = useState(formatClock(seg.start));
  const [value, setValue] = useState(valueOf(seg));

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    onSave({ time, target: targetOf(value) });
  };

  return (
    <form className="history-edit" onSubmit={submit}>
      <label className="history-edit__field">
        開始時刻
        <input type="time" value={time} disabled={isFirst} required onChange={(e) => setTime(e.target.value)} />
        {isFirst && <span className="muted">{START_LABEL}（変更できません）</span>}
      </label>
      <label className="history-edit__field">
        業務
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          {optionsFor(data, seg).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <div className="history-edit__actions">
        <button type="submit" className="btn btn--primary">保存</button>
        <button type="button" className="btn" onClick={onCancel}>キャンセル</button>
      </div>
    </form>
  );
}
