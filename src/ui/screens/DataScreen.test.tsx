// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestStore } from '../testing/createTestStore';
import { DataScreen, MAX_BACKUP_BYTES } from './DataScreen';
import { TodayScreen } from './TodayScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOTICE_TEXT = 'まだバックアップを書き出していません。';

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

describe('バックアップ注意の表示場所', () => {
  it('記録があり未バックアップなら、データ画面に注意が出る（書き出しリンクは出ない）', () => {
    const store = createTestStore();
    store.clockIn();
    act(() => root.render(<DataScreen store={store} />));
    expect(container.querySelector('.notice')?.textContent).toContain('データはこの端末');
    expect(container.textContent).toContain(NOTICE_TEXT);
    expect(container.textContent).not.toContain('データ画面で書き出す');
  });

  it('記録がなければ、データ画面に注意は出ない', () => {
    act(() => root.render(<DataScreen store={createTestStore()} />));
    expect(container.textContent).not.toContain(NOTICE_TEXT);
  });

  it('今日画面にはバックアップ注意が出ない', () => {
    const store = createTestStore();
    store.clockIn();
    act(() => root.render(<TodayScreen store={store} />));
    expect(container.textContent).not.toContain(NOTICE_TEXT);
  });
});

describe('バックアップの読み込み', () => {
  it('上限を超えるファイルは、確認を出さずにエラーを表示して読み込まない', async () => {
    const store = createTestStore();
    store.clockIn();
    const before = store.exportJson(0);
    const confirmSpy = vi.spyOn(window, 'confirm');
    act(() => root.render(<DataScreen store={store} />));

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const bigFile = new File([new Uint8Array(MAX_BACKUP_BYTES + 1)], 'big.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [bigFile] });
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(container.textContent).toContain('ファイルが大きすぎます');
    expect(store.exportJson(0)).toBe(before);
    confirmSpy.mockRestore();
  });
});
