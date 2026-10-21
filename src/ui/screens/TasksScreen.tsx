import type { ReactElement } from 'react';
import type { AppStore, Task } from '../../shared/types';
import { ErrorMessage } from '../components/ErrorMessage';
import { TaskRow } from '../components/TaskRow';
import { useActionRunner } from '../hooks/useActionRunner';
import { useAppState } from '../hooks/useAppState';
import '../styles/manage.css';

interface TasksScreenProps {
  store: AppStore;
}

function sortedTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => a.order - b.order);
}

/** index の要素を delta だけ動かした id の並びを返す。範囲外なら null。 */
function movedIds(tasks: readonly Task[], index: number, delta: -1 | 1): string[] | null {
  const target = index + delta;
  if (target < 0 || target >= tasks.length) return null;
  const ids = tasks.map((t) => t.id);
  const moving = ids[index];
  const other = ids[target];
  if (moving === undefined || other === undefined) return null;
  ids[index] = other;
  ids[target] = moving;
  return ids;
}

/** 業務管理画面。改名・非表示/再表示・並べ替え。非表示でも過去の集計には残る。 */
export function TasksScreen({ store }: TasksScreenProps): ReactElement {
  const data = useAppState(store);
  const runner = useActionRunner();
  const tasks = sortedTasks(data.tasks);

  const move = (index: number, delta: -1 | 1): void => {
    const ids = movedIds(tasks, index, delta);
    if (ids) runner.run(() => store.reorderTasks(ids));
  };

  return (
    <div className="manage">
      <h1 className="screen__title">業務管理</h1>
      <p className="muted">非表示にしても、過去の集計には残ります。並び順は今日画面のボタンに反映されます。</p>
      <ErrorMessage message={runner.error} />
      <ul className="task-list">
        {tasks.map((task, index) => (
          <TaskRow
            key={task.id}
            task={task}
            isFirst={index === 0}
            isLast={index === tasks.length - 1}
            onRename={(name) => runner.run(() => store.renameTask(task.id, name))}
            onToggleArchived={() => runner.run(() => store.setTaskArchived(task.id, !task.archived))}
            onMove={(delta) => move(index, delta)}
          />
        ))}
      </ul>
    </div>
  );
}
