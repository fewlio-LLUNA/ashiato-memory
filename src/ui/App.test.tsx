// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createFakeStore } from './dev/fakeStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('App', () => {
  it('打刻忘れがなければダイアログを出さない', () => {
    act(() => root.render(<App store={createFakeStore()} />));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('前日から勤務中のままならダイアログを出し、確定すると消える', () => {
    const store = createFakeStore();
    const yesterday = Date.now() - MS_PER_DAY;
    store.clockIn(yesterday);
    act(() => root.render(<App store={store} />));
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    const input = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    const end = new Date(yesterday + HOUR_MS);
    const pad = (n: number): string => String(n).padStart(2, '0');
    const local = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    act(() => {
      setValue?.call(input, local);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const form = container.querySelector('form') as HTMLFormElement;
    act(() => form.requestSubmit());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
