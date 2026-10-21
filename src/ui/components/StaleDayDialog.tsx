import { useState, type FormEvent, type ReactElement } from 'react';
import { formatDateLabel } from '../../domain/format';
import type { AppStore, WorkDay } from '../../shared/types';
import { useActionRunner } from '../hooks/useActionRunner';
import { ErrorMessage } from './ErrorMessage';

interface StaleDayDialogProps {
  store: AppStore;
  day: WorkDay;
}

/** 業務終了の押し忘れ（打刻忘れ）を確定させるダイアログ。確定するまで他の操作を止める。 */
export function StaleDayDialog({ store, day }: StaleDayDialogProps): ReactElement {
  const [value, setValue] = useState('');
  const runner = useActionRunner();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const clockOutAt = new Date(value).getTime();
    if (Number.isNaN(clockOutAt)) return;
    runner.run(() => store.closeStaleDay(day.date, clockOutAt));
  };

  return (
    <div className="dialog-backdrop">
      <form className="dialog card" role="dialog" aria-modal="true" aria-labelledby="stale-title" onSubmit={handleSubmit}>
        <h2 id="stale-title" className="dialog__title">
          {formatDateLabel(day.date)} の業務終了が押されていません
        </h2>
        <p>実際に業務を終えた日時を入力してください。確定すると、その時刻までの記録が残ります。</p>
        <label className="field">
          <span className="field__label">終了した日時</span>
          <input
            className="field__input"
            type="datetime-local"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <ErrorMessage message={runner.error} />
        <button type="submit" className="btn btn--primary" disabled={value === ''}>
          この時刻で確定する
        </button>
      </form>
    </div>
  );
}
