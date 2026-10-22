// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestStore } from '../testing/createTestStore';
import { SummaryScreen } from './SummaryScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOUR_MS = 60 * 60 * 1000;
const MS_PER_DAY = 24 * HOUR_MS;

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
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
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
});
