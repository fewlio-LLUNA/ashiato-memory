// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFakeStore } from '../dev/fakeStore';
import { TasksScreen } from './TasksScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(
    (b) => b.textContent === label || b.getAttribute('aria-label') === label,
  );
  if (!found) throw new Error(`ボタンが見つかりません: ${label}`);
  return found;
}

function rowNames(): string[] {
  return [...container.querySelectorAll('.task-row__name')].map((el) => el.textContent ?? '');
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

describe('TasksScreen', () => {
  it('非表示にすると「非表示中」になり、再表示で戻る', () => {
    const store = createFakeStore();
    store.createTask('資料作成');
    act(() => root.render(<TasksScreen store={store} />));
    act(() => button('非表示').click());
    expect(container.textContent).toContain('非表示中');
    act(() => button('再表示').click());
    expect(container.textContent).not.toContain('非表示中');
  });

  it('下へ移動すると並び順が入れ替わる', () => {
    const store = createFakeStore();
    store.createTask('資料作成');
    act(() => root.render(<TasksScreen store={store} />));
    expect(rowNames()).toEqual(['庶務', '資料作成']);
    act(() => button('庶務を下へ').click());
    expect(rowNames()).toEqual(['資料作成', '庶務']);
  });

  it('庶務には名前変更・非表示ボタンが出ない', () => {
    const store = createFakeStore();
    act(() => root.render(<TasksScreen store={store} />));
    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).not.toContain('名前変更');
    expect(labels).not.toContain('非表示');
  });
});
