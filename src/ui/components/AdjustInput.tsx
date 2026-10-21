import { useState, type ReactElement } from 'react';

interface AdjustInputProps {
  /** 業務名（入力欄のラベル用） */
  taskName: string;
  /** 現在の補正値（分） */
  value: number;
  /** 確定。成功したら true */
  onCommit: (minutes: number) => boolean;
  /** 入力が整数でないときの通知 */
  onInvalid: (message: string) => void;
}

const INVALID_MESSAGE = '補正は整数の分で入力してください（例: 5、-10）。';

/** 業務別の ±分 補正入力。フォーカスを外すか Enter で確定する。 */
export function AdjustInput({ taskName, value, onCommit, onInvalid }: AdjustInputProps): ReactElement {
  const [draft, setDraft] = useState(String(value));

  const commit = (): void => {
    const minutes = Number(draft);
    if (draft.trim() === '' || !Number.isInteger(minutes)) {
      onInvalid(INVALID_MESSAGE);
      return;
    }
    if (minutes !== value) onCommit(minutes);
  };

  return (
    <input
      className="adjust-input"
      type="number"
      step={1}
      inputMode="numeric"
      aria-label={`${taskName}の補正（分）`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
}
