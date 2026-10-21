import type { AppData, Segment, TaskId } from '../../shared/types';

export const BREAK_LABEL = '休憩';
const UNKNOWN_TASK_LABEL = '(不明な業務)';

export function taskNameOf(data: AppData, id: TaskId): string {
  return data.tasks.find((t) => t.id === id)?.name ?? UNKNOWN_TASK_LABEL;
}

/** 区間の表示名。休憩は固定ラベル、業務は業務名。 */
export function segmentLabel(data: AppData, seg: Segment): string {
  if (seg.kind === 'break' || seg.taskId === null) return BREAK_LABEL;
  return taskNameOf(data, seg.taskId);
}
