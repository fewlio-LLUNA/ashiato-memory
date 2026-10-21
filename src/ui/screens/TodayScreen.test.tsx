// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestStore } from '../testing/createTestStore';
import { TodayScreen } from './TodayScreen';

// React に act 環境であることを伝える
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function buttonByText(text: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`ボタンが見つかりません: ${text}`);
  return found;
}

function click(text: string): void {
  act(() => buttonByText(text).click());
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

describe('TodayScreen', () => {
  it('業務開始で庶務の計測が始まり、終業目安が出る', () => {
    const store = createTestStore();
    act(() => root.render(<TodayScreen store={store} />));
    click('業務開始');
    expect(container.textContent).toContain('計測中');
    expect(container.textContent).toContain('終業目安');
    expect(buttonByText('庶務').getAttribute('aria-pressed')).toBe('true');
  });

  it('新しい業務名を入力すると、ボタンが増えて計測が移る', () => {
    const store = createTestStore();
    act(() => root.render(<TodayScreen store={store} />));
    click('業務開始');
    const input = container.querySelector('input') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      setValue?.call(input, '資料作成');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click('追加して開始');
    expect(buttonByText('資料作成').getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText('庶務').getAttribute('aria-pressed')).toBe('false');
  });

  it('空の業務名は DomainError の文言をそのまま表示する', () => {
    const store = createTestStore();
    act(() => root.render(<TodayScreen store={store} />));
    click('業務開始');
    click('追加して開始');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('業務名を入力してください');
  });

  it('休憩に切り替え、業務終了すると再開ボタンが出る', () => {
    const store = createTestStore();
    act(() => root.render(<TodayScreen store={store} />));
    click('業務開始');
    click('休憩');
    expect(buttonByText('休憩中').getAttribute('aria-pressed')).toBe('true');
    click('業務終了');
    expect(buttonByText('勤務を再開する')).toBeTruthy();
  });
});
