/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 外部への通信・外部リソース読み込みを仕組みで遮断する CSP（要件 §5 セキュリティ）
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** 本番ビルドのみ CSP メタタグを注入する（開発サーバーは HMR の WebSocket を使うため対象外） */
function injectCsp(): Plugin {
  return {
    name: 'ashiatomemory:inject-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// GitHub Pages のサブパス配信に対応するため相対パスで出力する
export default defineConfig({
  base: './',
  plugins: [react(), injectCsp()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
