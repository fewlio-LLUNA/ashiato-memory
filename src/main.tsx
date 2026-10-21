// B5 で fakeStore を createAppStore() に差し替える。
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { createFakeStore } from './ui/dev/fakeStore';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root が見つかりません');
}

createRoot(rootElement).render(
  <StrictMode>
    <App store={createFakeStore()} />
  </StrictMode>,
);
