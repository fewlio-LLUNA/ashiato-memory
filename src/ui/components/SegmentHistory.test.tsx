// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MS_PER_MINUTE } from '../../shared/constants';
import type { AppStore } from '../../shared/types';
import { SummaryScreen } from '../screens/SummaryScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { createTestStore } from '../testing/createTestStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date(2026, 9, 22, 12, 0).getTime();
const AT_10 = new Date(2026, 9, 22, 10, 0).getTime();
const AT_11 = new Date(2026, 9, 22, 11, 0).getTime();
const PAST_BEFORE_START = '09:00';
const NEW_START = '11:30';

let container: HTMLDivElement;
let root: Root;

/** 10:00 庶務 → 11:00 資料作成 → 現在 12:00 の当日データ */
function setup(): AppStore {
  const store = createTestStore();
  store.clockIn(AT_10);
  const task = store.createTask('資料作成');
  store.switchTo({ kind: 'task', taskId: task.id }, AT_11);
  return store;
}

function setField(el: HTMLInputElement | HTMLSelectElement, value: string, event: 'input' | 'change'): void {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  act(() => {
    setter?.call(el, value);
    el.dispatchEvent(new Event(event, { bubbles: true }));
  });
}

function editButtons(): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('.history__edit')];
}

function formButton(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll<HTMLButtonElement>('.history-edit button')].find((b) => b.textContent === label);
  if (!found) throw new Error(`ボタンが見つかりません: ${label}`);
  return found;
}

function timeInput(): HTMLInputElement {
  return container.querySelector('.history-edit input[type="time"]') as HTMLInputElement;
}

function segmentsOf(store: AppStore): { start: number; end: number | null; kind: string }[] {
  return Object.values(store.getState().days)[0]?.segments ?? [];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('切り替え履歴の編集（集計 日）', () => {
  it('開始時刻を変えて保存すると、その行と直前の行の境界が動く', () => {
    const store = setup();
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[1]?.click());
    setField(timeInput(), NEW_START, 'input');
    act(() => formButton('保存').click());
    const [first, second] = segmentsOf(store);
    expect(second?.start).toBe(AT_11 + 30 * MS_PER_MINUTE);
    expect(first?.end).toBe(second?.start);
    expect(container.querySelector('.history-edit')).toBeNull();
    expect(container.textContent).toContain('10:00 〜 11:30');
  });

  it('業務を休憩に変えて保存できる', () => {
    const store = setup();
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[1]?.click());
    setField(container.querySelector('.history-edit select') as HTMLSelectElement, 'break', 'change');
    act(() => formButton('保存').click());
    expect(segmentsOf(store)[1]?.kind).toBe('break');
  });

  it('先頭の行は開始時刻が無効化され「業務開始」と出る', () => {
    const store = setup();
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[0]?.click());
    expect(timeInput().disabled).toBe(true);
    expect(container.querySelector('.history-edit')?.textContent).toContain('業務開始');
  });

  it('却下されたらエラーが出て、フォームは開いたままでデータは変わらない', () => {
    const store = setup();
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[1]?.click());
    setField(timeInput(), PAST_BEFORE_START, 'input');
    act(() => formButton('保存').click());
    expect(container.querySelector('.card [role="alert"]')).not.toBeNull();
    expect(container.querySelector('.history-edit')).not.toBeNull();
    expect(segmentsOf(store)[1]?.start).toBe(AT_11);
  });

  it('キャンセルでフォームが閉じ、変更されない', () => {
    const store = setup();
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[1]?.click());
    setField(timeInput(), NEW_START, 'input');
    act(() => formButton('キャンセル').click());
    expect(container.querySelector('.history-edit')).toBeNull();
    expect(segmentsOf(store)[1]?.start).toBe(AT_11);
  });

  it('同時に編集できる行は1つだけ', () => {
    const store = setup();
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[0]?.click());
    act(() => editButtons()[0]?.click());
    expect(container.querySelectorAll('.history-edit')).toHaveLength(1);
  });

  it('日付を移動すると編集状態が閉じる', () => {
    const store = setup();
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[1]?.click());
    act(() => (container.querySelector('button[aria-label="前の期間"]') as HTMLButtonElement).click());
    expect(container.querySelector('.history-edit')).toBeNull();
  });

  it('非表示にした業務の行でも、その業務が選択肢に残る', () => {
    const store = setup();
    const task = store.getState().tasks.find((t) => t.name === '資料作成');
    store.setTaskArchived(task?.id ?? '', true);
    act(() => root.render(<SummaryScreen store={store} />));
    act(() => editButtons()[1]?.click());
    const options = [...container.querySelectorAll('.history-edit option')].map((o) => o.textContent);
    expect(options).toContain('資料作成');
  });
});

describe('切り替え履歴（今日画面）', () => {
  it('履歴は折りたたみで、業務ボタンより後ろに置かれる', () => {
    const store = setup();
    act(() => root.render(<TodayScreen store={store} />));
    const details = container.querySelector('details.history-details') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    const buttons = container.querySelector('[aria-label="業務の切り替え"]') as HTMLElement;
    expect(buttons.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('今日画面からも編集できる', () => {
    const store = setup();
    act(() => root.render(<TodayScreen store={store} />));
    act(() => editButtons()[1]?.click());
    setField(timeInput(), NEW_START, 'input');
    act(() => formButton('保存').click());
    expect(segmentsOf(store)[1]?.start).toBe(AT_11 + 30 * MS_PER_MINUTE);
  });

  it('勤務前は履歴を出さない', () => {
    act(() => root.render(<TodayScreen store={createTestStore()} />));
    expect(container.querySelector('details.history-details')).toBeNull();
  });
});
