// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDateLabel } from '../../domain/format';
import { toDateKey } from '../../domain/time';
import { createTestStore } from '../testing/createTestStore';
import { SummaryScreen } from './SummaryScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOUR_MS = 60 * 60 * 1000;
const MS_PER_DAY = 24 * HOUR_MS;
// 実行時刻で結果が変わらないよう、月の中ほどの日中に固定する
// （深夜は「2時間前に出勤」が前日になり、23時台は前日の退勤が日をまたぐ。月初・月末はカレンダーの表示が変わる）
const FIXED_NOW = new Date(2026, 9, 22, 12, 0);

let container: HTMLDivElement;
let root: Root;

function typeInto(input: HTMLInputElement, value: string): void {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function commitWithEnter(input: HTMLInputElement): void {
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('SummaryScreen', () => {
  it('記録のない日は「記録はありません」を出す', () => {
    act(() => root.render(<SummaryScreen store={createTestStore()} />));
    expect(container.textContent).toContain('この期間の記録はありません');
  });

  it('日次で補正を入れると合計に反映され、切り替え履歴が出る', () => {
    const store = createTestStore();
    store.clockIn();
    act(() => root.render(<SummaryScreen store={store} />));
    expect(container.textContent).toContain('切り替え履歴');
    const input = container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement;
    typeInto(input, '5');
    commitWithEnter(input);
    const totalCell = container.querySelector('.summary-table tbody tr td:last-child');
    expect(totalCell?.textContent).toBe('5分');
    const reflected = container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement;
    expect(reflected.value).toBe('5');
  });

  it('週に切り替えると補正は入力欄ではなく表示になり、履歴は出ない', () => {
    const store = createTestStore();
    store.clockIn();
    act(() => root.render(<SummaryScreen store={store} />));
    const weekButton = [...container.querySelectorAll('button')].find((b) => b.textContent === '週');
    act(() => weekButton?.click());
    expect(container.querySelector('.adjust-input')).toBeNull();
    expect(container.textContent).not.toContain('切り替え履歴');
  });

  it('却下された補正値は入力欄に残らず、ストアの値に戻る', () => {
    const store = createTestStore();
    store.clockIn();
    act(() => root.render(<SummaryScreen store={store} />));
    const input = container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement;
    typeInto(input, '-999');
    commitWithEnter(input);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    const after = container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement;
    expect(after.value).toBe('0');
  });

  it('入力途中の値は、日付を移動しても別の日に持ち越されない', () => {
    const store = createTestStore();
    store.clockIn(Date.now() - MS_PER_DAY);
    store.clockOut(Date.now() - MS_PER_DAY + HOUR_MS);
    store.clockIn();
    act(() => root.render(<SummaryScreen store={store} />));
    const input = container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement;
    typeInto(input, '7');
    const prev = container.querySelector('button[aria-label="前の期間"]') as HTMLButtonElement;
    act(() => prev.click());
    const moved = container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement;
    expect(moved.value).toBe('0');
  });

  describe('補正の「−」トグル', () => {
    const LABEL = '庶務の補正（分）';
    const SIGN_LABEL = '庶務の補正をマイナスにする';

    function field(): HTMLInputElement {
      return container.querySelector(`input[aria-label="${LABEL}"]`) as HTMLInputElement;
    }

    function signButton(): HTMLButtonElement {
      return container.querySelector(`button[aria-label="${SIGN_LABEL}"]`) as HTMLButtonElement;
    }

    function setup(): ReturnType<typeof createTestStore> {
      const store = createTestStore();
      store.clockIn(Date.now() - 2 * HOUR_MS);
      act(() => root.render(<SummaryScreen store={store} />));
      return store;
    }

    it('絶対値を入れて「−」を押すと負の値が確定する', () => {
      const store = setup();
      typeInto(field(), '10');
      act(() => signButton().click());
      expect(Object.values(store.getState().days)[0]?.adjustments['general']).toBe(-10);
      expect(signButton().getAttribute('aria-pressed')).toBe('true');
      expect(field().value).toBe('10');
    });

    it('もう一度押すと正に戻る', () => {
      const store = setup();
      typeInto(field(), '10');
      act(() => signButton().click());
      act(() => signButton().click());
      const day = Object.values(store.getState().days)[0];
      expect(day?.adjustments['general']).toBe(10);
      expect(signButton().getAttribute('aria-pressed')).toBe('false');
    });

    it('実測を超えるマイナスは却下され、表示が元に戻る', () => {
      const store = createTestStore();
      store.clockIn();
      act(() => root.render(<SummaryScreen store={store} />));
      typeInto(field(), '999');
      act(() => signButton().click());
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(field().value).toBe('0');
      expect(signButton().getAttribute('aria-pressed')).toBe('false');
    });

    it('PC で "-10" と直接入力すると符号がトグルに移り、確定で -10 になる', () => {
      const store = setup();
      typeInto(field(), '-10');
      expect(field().value).toBe('10');
      expect(signButton().getAttribute('aria-pressed')).toBe('true');
      commitWithEnter(field());
      const day = Object.values(store.getState().days)[0];
      expect(day?.adjustments['general']).toBe(-10);
    });

    it('整数でない入力は通知され、元の値に戻る', () => {
      setup();
      typeInto(field(), '1.5');
      commitWithEnter(field());
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(field().value).toBe('0');
    });
  });

  describe('カレンダー', () => {
    function openCalendar(): void {
      const label = container.querySelector('button.period__label') as HTMLButtonElement;
      act(() => label.click());
    }

    function setupWithPastDay(): { store: ReturnType<typeof createTestStore>; pastLabel: string } {
      const store = createTestStore();
      const past = Date.now() - 2 * MS_PER_DAY;
      store.clockIn(past);
      store.clockOut(past + HOUR_MS);
      store.clockIn();
      act(() => root.render(<SummaryScreen store={store} />));
      return { store, pastLabel: formatDateLabel(toDateKey(past)) };
    }

    it('日付ラベルを押すとカレンダーが開閉する', () => {
      setupWithPastDay();
      expect(container.querySelector('.calendar')).toBeNull();
      openCalendar();
      expect(container.querySelector('.calendar')).not.toBeNull();
      openCalendar();
      expect(container.querySelector('.calendar')).toBeNull();
    });

    it('週・月モードではラベルはボタンではなくカレンダーも出ない', () => {
      setupWithPastDay();
      openCalendar();
      const week = [...container.querySelectorAll('button')].find((b) => b.textContent === '週');
      act(() => week?.click());
      expect(container.querySelector('button.period__label')).toBeNull();
      expect(container.querySelector('.calendar')).toBeNull();
    });

    it('記録のある日だけ「記録あり」の印が付く（今日も記録あり）', () => {
      const { pastLabel } = setupWithPastDay();
      openCalendar();
      const marked = [...container.querySelectorAll('.calendar__dot')].length;
      expect(marked).toBe(2);
      expect(container.querySelector(`.calendar__day[aria-label^="${pastLabel}"]`)?.getAttribute('aria-label')).toContain('記録あり');
    });

    it('過去の日を選ぶとその日へ移動してカレンダーが閉じる', () => {
      const { pastLabel } = setupWithPastDay();
      openCalendar();
      const target = container.querySelector(`.calendar__day[aria-label^="${pastLabel}"]`) as HTMLButtonElement;
      act(() => target.click());
      expect(container.querySelector('.calendar')).toBeNull();
      expect(container.querySelector('.period__label')?.textContent).toBe(pastLabel);
    });

    it('未来の日は押せない', () => {
      setupWithPastDay();
      openCalendar();
      const buttons = [...container.querySelectorAll<HTMLButtonElement>('.calendar__day')];
      const todayIndex = buttons.findIndex((b) => b.getAttribute('aria-label')?.includes('今日'));
      expect(todayIndex).toBeGreaterThanOrEqual(0);
      const future = buttons.slice(todayIndex + 1);
      expect(future.every((b) => b.disabled)).toBe(true);
      expect(buttons[todayIndex]?.disabled).toBe(false);
      expect(future.length).toBeGreaterThan(0);
    });

    it('今日の月では「次の月」を押せず、「前の月」で月が変わる', () => {
      setupWithPastDay();
      openCalendar();
      const next = container.querySelector('button[aria-label="次の月"]') as HTMLButtonElement;
      expect(next.disabled).toBe(true);
      const before = container.querySelector('.calendar__title')?.textContent;
      act(() => (container.querySelector('button[aria-label="前の月"]') as HTMLButtonElement).click());
      expect(container.querySelector('.calendar__title')?.textContent).not.toBe(before);
      expect((container.querySelector('button[aria-label="次の月"]') as HTMLButtonElement).disabled).toBe(false);
    });

    it('カレンダーを開いたまま前の期間へ移動すると、表示月も追従する', () => {
      setupWithPastDay();
      openCalendar();
      const before = container.querySelector('.calendar__title')?.textContent;
      const prev = container.querySelector('button[aria-label="前の期間"]') as HTMLButtonElement;
      for (let i = 0; i < 25; i++) act(() => prev.click());
      expect(container.querySelector('.calendar__title')?.textContent).not.toBe(before);
    });

    it('選んだ日を移動しても入力途中の補正は持ち越されない', () => {
      setupWithPastDay();
      typeInto(container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement, '7');
      openCalendar();
      const past = container.querySelector('.calendar__day[aria-label*="記録あり"]:not(.calendar__day--today)') as HTMLButtonElement;
      act(() => past.click());
      expect((container.querySelector('input[aria-label="庶務の補正（分）"]') as HTMLInputElement).value).toBe('0');
    });
  });
});
