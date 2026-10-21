import { useState, type FormEvent, type ReactElement } from 'react';
import { TASK_NAME_MAX_LENGTH } from '../../shared/constants';
import { PlusIcon } from '../icons';

interface NewTaskFormProps {
  /** 作成して計測開始。成功したら true（入力欄をクリアする） */
  onCreate: (name: string) => boolean;
}

/** その場で業務を作成し、そのまま計測を始めるフォーム。 */
export function NewTaskForm({ onCreate }: NewTaskFormProps): ReactElement {
  const [name, setName] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (onCreate(name)) setName('');
  };

  return (
    <form className="new-task" onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="new-task-name">
        新しい業務名
      </label>
      <input
        id="new-task-name"
        className="new-task__input"
        type="text"
        value={name}
        maxLength={TASK_NAME_MAX_LENGTH}
        placeholder="新しい業務名を入力"
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="btn btn--primary">
        <PlusIcon size={18} />
        追加して開始
      </button>
    </form>
  );
}
