import type { ReactElement } from 'react';
import { formatMinutes } from '../../domain/format';
import type { AppData, DateKey, TaskId, TaskTotal } from '../../shared/types';
import { AdjustInput } from './AdjustInput';
import { taskNameOf } from './taskLabels';

export interface AdjustEditor {
  date: DateKey;
  onCommit: (taskId: TaskId, minutes: number) => boolean;
  onInvalid: (message: string) => void;
}

interface SummaryTableProps {
  data: AppData;
  rows: readonly TaskTotal[];
  /** 指定すると補正列が入力欄になる（日次のみ） */
  editor?: AdjustEditor;
}

function signed(minutes: number): string {
  if (minutes === 0) return '—';
  return `${minutes > 0 ? '+' : ''}${minutes}分`;
}

function AdjustCell({ data, row, editor }: { data: AppData; row: TaskTotal; editor?: AdjustEditor }): ReactElement {
  if (!editor) return <td className="num">{signed(row.adjustmentMinutes)}</td>;
  return (
    <td className="num summary-table__adjust">
      <AdjustInput
        key={`${editor.date}:${row.taskId}:${row.adjustmentMinutes}`}
        taskName={taskNameOf(data, row.taskId)}
        value={row.adjustmentMinutes}
        onCommit={(minutes) => editor.onCommit(row.taskId, minutes)}
        onInvalid={editor.onInvalid}
      />
    </td>
  );
}

/** 業務別合計表。実測・補正・合計を並べ、補正は別列で区別する。 */
export function SummaryTable({ data, rows, editor }: SummaryTableProps): ReactElement {
  if (rows.length === 0) return <p className="muted">この期間の記録はありません。</p>;
  return (
    <table className={editor ? 'summary-table summary-table--editable' : 'summary-table'}>
      <thead>
        <tr>
          <th scope="col">業務</th>
          <th scope="col" className="num">実測</th>
          <th scope="col" className="num summary-table__adjust">補正</th>
          <th scope="col" className="num">合計</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.taskId}>
            <th scope="row">{taskNameOf(data, row.taskId)}</th>
            <td className="num">{formatMinutes(row.measuredMinutes)}</td>
            <AdjustCell data={data} row={row} editor={editor} />
            <td className="num strong">{formatMinutes(row.totalMinutes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
