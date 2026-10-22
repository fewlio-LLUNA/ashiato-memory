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
const ABS_PATTERN = /^\d+$/;
const MINUS_SIGN = '-';

/** 絶対値の文字列と符号から補正値（分）を作る。整数でなければ null。 */
function toMinutes(abs: string, negative: boolean): number | null {
  const text = abs.trim();
  if (!ABS_PATTERN.test(text)) return null;
  const minutes = Number(text);
  return negative && minutes !== 0 ? -minutes : minutes;
}

/**
 * 業務別の ±分 補正入力。入力欄は絶対値を持ち、「−」トグルで符号を切り替える。
 * 欄に "-" 付きで打たれたら符号をトグルへ移す（PC の直接入力用）。
 * フォーカスを外すか Enter で確定する。トグルは即確定する。
 */
export function AdjustInput({ taskName, value, onCommit, onInvalid }: AdjustInputProps): ReactElement {
  const [abs, setAbs] = useState(String(Math.abs(value)));
  const [negative, setNegative] = useState(value < 0);

  /** 却下された値を入力欄に残さない。表示は常にストアの値と一致させる。 */
  const revert = (): void => {
    setAbs(String(Math.abs(value)));
    setNegative(value < 0);
  };

  const submit = (minutes: number | null): void => {
    if (minutes === null) {
      onInvalid(INVALID_MESSAGE);
      revert();
      return;
    }
    if (minutes !== value && !onCommit(minutes)) revert();
  };

  const handleChange = (text: string): void => {
    if (text.startsWith(MINUS_SIGN)) {
      setNegative(true);
      setAbs(text.slice(MINUS_SIGN.length));
      return;
    }
    setAbs(text);
  };

  const handleToggle = (): void => {
    const next = !negative;
    setNegative(next);
    const minutes = toMinutes(abs, next);
    if (minutes !== null) submit(minutes);
  };

  return (
    <div className="adjust">
      <button
        type="button"
        className="adjust__sign"
        aria-pressed={negative}
        aria-label={`${taskName}の補正をマイナスにする`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleToggle}
      >
        −
      </button>
      <input
        className="adjust-input"
        type="text"
        inputMode="numeric"
        aria-label={`${taskName}の補正（分）`}
        value={abs}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => submit(toMinutes(abs, negative))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit(toMinutes(abs, negative));
        }}
      />
    </div>
  );
}
