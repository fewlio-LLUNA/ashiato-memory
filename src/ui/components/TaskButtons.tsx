import type { ReactElement } from 'react';
import type { Segment, SwitchTarget, Task } from '../../shared/types';
import { CupIcon, PlayIcon } from '../icons';
import { BREAK_LABEL } from './taskLabels';

interface TaskButtonsProps {
  tasks: readonly Task[];
  current: Segment | null;
  onSwitch: (target: SwitchTarget) => void;
}

function visibleTasks(tasks: readonly Task[]): Task[] {
  return tasks.filter((t) => !t.archived).sort((a, b) => a.order - b.order);
}

function isCurrentTask(current: Segment | null, task: Task): boolean {
  return current !== null && current.kind === 'task' && current.taskId === task.id;
}

/** 業務切り替えボタン群（計測中を強調）と、見た目を区別した休憩ボタン。 */
export function TaskButtons({ tasks, current, onSwitch }: TaskButtonsProps): ReactElement {
  const onBreak = current !== null && current.kind === 'break';
  return (
    <section aria-label="業務の切り替え">
      <div className="task-grid">
        {visibleTasks(tasks).map((task) => {
          const active = isCurrentTask(current, task);
          return (
            <button
              key={task.id}
              type="button"
              className={active ? 'task-btn task-btn--active' : 'task-btn'}
              aria-pressed={active}
              onClick={() => onSwitch({ kind: 'task', taskId: task.id })}
            >
              {active && <PlayIcon size={18} />}
              <span className="task-btn__name">{task.name}</span>
              {active && <span className="task-btn__badge">計測中</span>}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={onBreak ? 'break-btn break-btn--active' : 'break-btn'}
        aria-pressed={onBreak}
        onClick={() => onSwitch({ kind: 'break' })}
      >
        <CupIcon size={20} />
        <span>{onBreak ? `${BREAK_LABEL}中` : BREAK_LABEL}</span>
      </button>
    </section>
  );
}
