# Sonnet B 作業ログ

## B1〜B5 完了（2026-10-21）
状態はすべて「レビュー待ち」。`npm run typecheck` / `lint` / `test`（125件）/ `build` 通過。

### 実装の構成（`src/ui/**`）
- `App.tsx`: ナビ＋hash ルーティング＋打刻忘れダイアログ（`findStaleDay` で検出、確定まで操作を止める）
- `screens/`: Today / Summary / Tasks / Data。期間計算は `summaryPeriod.ts`、ダウンロードは `downloadFile.ts`
- `hooks/`: `useAppState`・`useNow`・`useRoute`・`useActionRunner`（DomainError を捕まえて message を画面表示）
- `styles/`: `tokens.css`（色・余白・角丸 4px・タップ 44px を一元管理）、`app.css`（共通）、画面別 css
- `icons/`: SVG のみ（絵文字なし）
- `testing/createTestStore.ts`: メモリ保存・タブ間同期なしの実 Store（UI テスト用）

### B5 でやったこと
- `main.tsx` を `createAppStore()` に差し替え、`src/ui/dev/`（fakeStore）を削除
- UI テストは fakeStore から `createTestStore()`（実 Store）に切り替え

### 実ブラウザ（Chrome headless・本番ビルド＝CSP あり）で確認したこと
- 375px 幅で 今日（開始前・計測中）/ 集計（日・月）/ 業務管理 / データ のすべてで横スクロールなし
- 今日画面のボタン・ナビは全て 44px 以上
- 書き出し: ファイルが生成され、最終バックアップ日時が更新、CSP 違反 0
- 書き出し → localStorage 削除 → 再読み込み（開始前の画面に戻る）→ 読み込み → 計測中が復元

### 未確認（リーダーへ）
- Edge・iOS Safari・Android Chrome の実機（Chrome のみ確認）
- 日をまたぐ実運用（打刻忘れダイアログは jsdom テストと実 Store で確認。実ブラウザでの日付跨ぎは未実施）
- 週・月集計の実データでの見え方（空データ／1日分のみ確認）

### 気づいたこと
- ボード L1 行が「未着手」のまま（実際は完了）。リーダー管理の行なので触っていない
- `DataScreen` の `lastBackupAt` は書き出し時に画面側で再取得している（`getLastBackupAt` は購読対象外のため）
