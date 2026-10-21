// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFakeStore } from '../dev/fakeStore';
import { SummaryScreen } from './SummaryScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    act(() => root.render(<SummaryScreen store={createFakeStore()} />));
    expect(container.textContent).toContain('この期間の記録はありません');
  });

  it('日次で補正を入れると合計に反映され、切り替え履歴が出る', () => {
    const store = createFakeStore();
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
    const store = createFakeStore();
    store.clockIn();
    act(() => root.render(<SummaryScreen store={store} />));
    const weekButton = [...container.querySelectorAll('button')].find((b) => b.textContent === '週');
    act(() => weekButton?.click());
    expect(container.querySelector('.adjust-input')).toBeNull();
    expect(container.textContent).not.toContain('切り替え履歴');
  });
});
