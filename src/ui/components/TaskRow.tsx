import { useState, type ReactElement } from 'react';
import { GENERAL_TASK_ID } from '../../shared/constants';
import type { Task } from '../../shared/types';
import { ArrowDownIcon, ArrowUpIcon } from '../icons';

interface TaskRowProps {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  /** 名前変更の確定。成功したら true */
  onRename: (name: string) => boolean;
  onToggleArchived: () => void;
  onMove: (delta: -1 | 1) => void;
}

/** 業務1件分の行。庶務は改名・非表示にできない。 */
export function TaskRow({ task, isFirst, isLast, onRename, onToggleArchived, onMove }: TaskRowProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.name);
  const locked = task.id === GENERAL_TASK_ID;

  const startEdit = (): void => {
    setDraft(task.name);
    setEditing(true);
  };

  const save = (): void => {
    if (onRename(draft)) setEditing(false);
  };

  return (
    <li className={task.archived ? 'task-row task-row--archived' : 'task-row'}>
      {editing ? (
        <div className="task-row__edit">
          <input
            className="field__input"
            type="text"
            aria-label={`${task.name}の新しい名前`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="button" className="btn btn--primary" onClick={save}>保存</button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>キャンセル</button>
        </div>
      ) : (
        <>
          <span className="task-row__name">
            {task.name}
            {task.archived && <span className="task-row__badge">非表示中</span>}
          </span>
          <span className="task-row__actions">
            <button type="button" className="btn" aria-label={`${task.name}を上へ`} disabled={isFirst} onClick={() => onMove(-1)}>
              <ArrowUpIcon size={18} />
            </button>
            <button type="button" className="btn" aria-label={`${task.name}を下へ`} disabled={isLast} onClick={() => onMove(1)}>
              <ArrowDownIcon size={18} />
            </button>
            {!locked && (
              <>
                <button type="button" className="btn" onClick={startEdit}>名前変更</button>
                <button type="button" className="btn" onClick={onToggleArchived}>
                  {task.archived ? '再表示' : '非表示'}
                </button>
              </>
            )}
          </span>
        </>
      )}
    </li>
  );
}
