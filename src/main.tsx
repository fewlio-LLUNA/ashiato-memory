// 仮エントリ（L1）。B1/B5 で App と AppStore の接続に書き換える。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root が見つかりません');
}

createRoot(rootElement).render(
  <StrictMode>
    <p>あしあとメモリー（準備中）</p>
  </StrictMode>,
);
