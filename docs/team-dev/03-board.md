# タスクボード（協調の中枢）

> 3セッションが**唯一リアルタイムに共有する状態**。ここで担当・進捗・境界を同期し、衝突を防ぐ。
> 更新したら即コミット（`docs: ボード更新`）。各ワーカーは**自分の行だけ**書き換える。
> 構造変更（タスク追加・境界変更・要相談の裁定）はリーダーOpusが行う。

最終更新: リーダーOpus 2026-10-21（L1・L2 完了）

## ファイルオーナーシップ（並行作業の境界）
- **Sonnet A**: `src/domain/**`, `src/store/**`
- **Sonnet B**: `src/ui/**`, `src/main.tsx`
- **リーダー**: `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.js`, `.github/**`, `.gitignore`, `README.md`
- **共有（変更時はボードの「要相談」に起票しリーダーが裁定）**: `src/shared/**`（型・定数＝設計書 §4 の契約）

> 原則: 自分のオーナー範囲の外は触らない。境界をまたぐ必要が出たら手を止めて「要相談」へ。
> npm パッケージの追加が必要になったら「要相談」に起票（package.json はリーダー管理）。

## 作業ディレクトリ方針
- **同一作業ディレクトリ＋オーナーシップ分離＋頻繁な小コミット**（ブランチは `main` のみ）。
- コミット前に `git pull` 相当の確認は不要（同一ディレクトリのため）。`git add` は**自分の範囲のファイルだけ**を指定する（`git add -A` 禁止）。

## タスク一覧
状態: `未着手` → `作業中` → `レビュー待ち` → （`修正中`）→ `完了`

| ID | 内容 | 担当 | 状態 | 依存 | 主な対象ファイル |
|----|------|------|------|------|------------------|
| L1 | 土台: git init、Vite+React+TS(strict)、ESLint、Vitest、npm scripts（dev/build/test/lint/typecheck）、`src/shared/` に設計書§4の型・定数を書き起こし、各レイヤーの空ディレクトリ、`main.tsx` の仮エントリ | L | 未着手 | - | package.json, tsconfig, vite.config.ts, src/shared/** |
| L2 | 本番ビルド時のCSP注入（外部通信遮断）、GitHub Actions で test→build→Pages デプロイ。リポジトリ作成・push はユーザー確認後 | L | 完了 | L1 | vite.config.ts, .github/workflows/deploy.yml |
| A1 | Domain: `time.ts`（日付キー・週/月範囲・区間長）＋テスト | A | 未着手 | L1 | src/domain/time.ts |
| A2 | Domain: `summary.ts`（日次/期間集計・最大剰余法の丸め・getActiveDay・findStaleDay）＋テスト | A | 未着手 | A1 | src/domain/summary.ts |
| A3 | Domain: `flex.ts`（終業目安）、`format.ts`（表示整形）＋テスト | A | 未着手 | A1 | src/domain/flex.ts, format.ts |
| A4 | Store: `actions.ts`（打刻・切替・業務CRUD・補正・打刻忘れ・再開の純粋更新関数とバリデーション）＋テスト | A | 未着手 | A1 | src/store/actions.ts |
| A5 | Store: `persistence.ts`（localStorage・破損時退避・storageイベント）、`backup.ts`（入出力検証・最終バックアップ日時）、`createAppStore.ts` 組み立て＋テスト | A | 未着手 | A4 | src/store/** |
| B1 | UI土台: `tokens.css`（群青/赤・余白・角丸4px）、`app.css`、SVGアイコン一式、hashルーティング、ナビ（PC上部/スマホ下部）、`useAppState`/`useNow`、`dev/fakeStore.ts` | B | 作業中 | L1 | src/ui/App.tsx, hooks/, styles/, icons/, dev/ |
| B2 | 今日画面: 業務開始/終了/再開、計測中業務と経過時間、終業目安・残り時間、業務ボタン（計測中を強調）＋休憩ボタン、その場で新規業務作成、当日の業務別累計、バックアップ注意表示 | B | 未着手 | B1 | src/ui/screens/TodayScreen.tsx, components/ |
| B3 | 集計画面: 日/週/月切替と前後移動、業務別合計表、日次は±分補正入力と切り替え履歴（時刻・業務） | B | 未着手 | B1 | src/ui/screens/SummaryScreen.tsx |
| B4 | 業務管理画面（改名・非表示/再表示・上下並べ替え）、データ画面（書き出し/読み込み・最終バックアップ日時・「データはこの端末のブラウザにのみ保存」の説明）、打刻忘れダイアログ | B | 未着手 | B1 | src/ui/screens/TasksScreen.tsx, DataScreen.tsx |
| B5 | fakeStore → 実Store差し替え（`main.tsx`）、`dev/` 削除、375px 幅確認 | B | 未着手 | A5, B2-B4 | src/main.tsx, src/ui/dev/ |
| L3 | 統合確認: 要件定義 §7 受け入れ条件の全項目チェック、dist の外部参照 grep、デプロイ、ユーザーへ提示 | L | 未着手 | 全タスク | - |

## 要相談 / 申し送り
> 境界をまたぐ変更、契約の変更提案、ブロッカーをここに起票。リーダーが裁定して解消。
- 【L1 完了・リーダーより】Sonnet A・B は着手してください。土台の前提:
  - 版: Vite 8 / React 18.3 / TypeScript 6 / Vitest 5 / ESLint 10（typescript-eslint 8）
  - `tsconfig.app.json` は strict に加えて `noUncheckedIndexedAccess` / `noUnusedLocals` / `noUnusedParameters` が有効。配列・Record の添字アクセスは `T | undefined` になる点に注意
  - テストは `src/**/*.test.{ts,tsx}`、既定の環境は `node`。DOM が必要なテストはファイル先頭に `// @vitest-environment jsdom`（jsdom 導入済み）。`@testing-library/*` は未導入（必要なら要相談）
  - 改行は LF（`.gitattributes`）。コミット前に `npm run typecheck && npm run lint && npm test` を通すこと
- 【L2 途中・リーダーより】本番ビルドに CSP を注入済み（`script-src 'self'; style-src 'self'; connect-src 'none'` ほか）。B への注意:
  - `<style>` タグや HTML 文字列での `style="..."` は本番で無効になる。スタイルは `src/ui/styles/*.css` を import する。JSX の `style={{...}}` は可（CSSOM 経由のため）
  - 外部 URL（フォント・画像・CDN）は一切参照しない。画像は SVG コンポーネントか `data:` のみ
- 【L2 完了・リーダーより】公開済み（ユーザー承認: Public / `ashiato-memory`）
  - リポジトリ: https://github.com/fewlio-LLUNA/ashiato-memory
  - 公開URL: https://fewlio-lluna.github.io/ashiato-memory/ （main への push ごとに Actions で検査→デプロイ）
  - **push はリーダーがレビュー巡回で行う。ワーカーはコミットまでで push しない**（未レビューのコードが本番に出るのを防ぐため）
