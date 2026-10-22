# タスクボード（協調の中枢）

> 3セッションが**唯一リアルタイムに共有する状態**。ここで担当・進捗・境界を同期し、衝突を防ぐ。
> 更新したら即コミット（`docs: ボード更新`）。各ワーカーは**自分の行だけ**書き換える。
> 構造変更（タスク追加・境界変更・要相談の裁定）はリーダーOpusが行う。

最終更新: リーダーOpus 2026-10-22（L6 完了。改訂1の必須タスクはすべて完了）

## ファイルオーナーシップ（並行作業の境界）
- **Sonnet A**: `src/domain/**`, `src/store/**`
- **Sonnet B**: `src/ui/**`, `src/main.tsx`
- **リーダー**: `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.js`, `.github/**`, `.gitignore`, `README.md`, `public/**`（改訂1）, `scripts/` 内のアイコン書き出し用スクリプト（改訂1）
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
| L1 | 土台: git init、Vite+React+TS(strict)、ESLint、Vitest、npm scripts（dev/build/test/lint/typecheck）、`src/shared/` に設計書§4の型・定数を書き起こし、各レイヤーの空ディレクトリ、`main.tsx` の仮エントリ | L | 完了 | - | package.json, tsconfig, vite.config.ts, src/shared/** |
| L2 | 本番ビルド時のCSP注入（外部通信遮断）、GitHub Actions で test→build→Pages デプロイ。リポジトリ作成・push はユーザー確認後 | L | 完了 | L1 | vite.config.ts, .github/workflows/deploy.yml |
| A1 | Domain: `time.ts`（日付キー・週/月範囲・区間長）＋テスト | A | 完了 | L1 | src/domain/time.ts |
| A2 | Domain: `summary.ts`（日次/期間集計・最大剰余法の丸め・getActiveDay・findStaleDay）＋テスト | A | 完了 | A1 | src/domain/summary.ts |
| A3 | Domain: `flex.ts`（終業目安）、`format.ts`（表示整形）＋テスト | A | 完了 | A1 | src/domain/flex.ts, format.ts |
| A4 | Store: `actions.ts`（打刻・切替・業務CRUD・補正・打刻忘れ・再開の純粋更新関数とバリデーション）＋テスト | A | 完了 | A1 | src/store/actions.ts |
| A5 | Store: `persistence.ts`（localStorage・破損時退避・storageイベント）、`backup.ts`（入出力検証・最終バックアップ日時）、`createAppStore.ts` 組み立て＋テスト | A | 完了 | A4 | src/store/** |
| B1 | UI土台: `tokens.css`（群青/赤・余白・角丸4px）、`app.css`、SVGアイコン一式、hashルーティング、ナビ（PC上部/スマホ下部）、`useAppState`/`useNow`、`dev/fakeStore.ts` | B | 完了 | L1 | src/ui/App.tsx, hooks/, styles/, icons/, dev/ |
| B2 | 今日画面: 業務開始/終了/再開、計測中業務と経過時間、終業目安・残り時間、業務ボタン（計測中を強調）＋休憩ボタン、その場で新規業務作成、当日の業務別累計、バックアップ注意表示 | B | 完了 | B1 | src/ui/screens/TodayScreen.tsx, components/ |
| B3 | 集計画面: 日/週/月切替と前後移動、業務別合計表、日次は±分補正入力と切り替え履歴（時刻・業務） | B | 完了 | B1 | src/ui/screens/SummaryScreen.tsx |
| B4 | 業務管理画面（改名・非表示/再表示・上下並べ替え）、データ画面（書き出し/読み込み・最終バックアップ日時・「データはこの端末のブラウザにのみ保存」の説明）、打刻忘れダイアログ | B | 完了 | B1 | src/ui/screens/TasksScreen.tsx, DataScreen.tsx |
| B5 | fakeStore → 実Store差し替え（`main.tsx`）、`dev/` 削除、375px 幅確認 | B | 完了 | A5, B2-B4 | src/main.tsx, src/ui/dev/ |
| B6 | 改善（任意・受け入れ外）: 375px の集計表で数値「1時間30分」や業務名が途中で折り返されて読みにくい。数値列は `white-space: nowrap`、業務名は単語途中で切れないよう列幅・折り返しを調整 | B | レビュー待ち | - | src/ui/styles/summary.css |
| L3 | 統合確認: 要件定義 §7 受け入れ条件の全項目チェック、dist の外部参照 grep、デプロイ、ユーザーへ提示 | L | 完了 | 全タスク | - |
| L4 | 改訂1の契約: 設計書 §4.1 の `SegmentEdit` 型と `AppStore.editSegment` を `src/shared/types.ts` に書き起こす。fake 実装がないので型追加だけでビルドが落ちる場合は、A6 着手まで `createAppStore` に「未実装」DomainError を投げる仮メソッドを置いてよい（A に一言起票） | L | 完了 | - | src/shared/types.ts |
| L5 | F15 アプリアイコン（設計書 §8.1）: `public/icon.svg`・`public/apple-touch-icon.png`(180px)・`index.html` のリンク差し替え・書き出し手順の保存 | L | 完了 | - | public/**, index.html, scripts/ |
| A6 | F19 Store: `actions.editSegment`（§4.3 の検証順）と `createAppStore` への配線＋テスト | A | 完了 | L4 | src/store/actions.ts, createAppStore.ts |
| A7 | 改訂1 Domain: `time.ts` に `withClockTime`・`calendarWeeks`（§4.2）＋テスト（月曜始まり・月初が日曜の月・2月・不正な "HH:MM"） | A | 完了 | - | src/domain/time.ts |
| B7 | F17 バックアップ注意を今日画面から外しデータ画面へ（§8.3）＋テスト | B | 完了 | - | TodayScreen.tsx, DataScreen.tsx, BackupNotice.tsx |
| B8 | F16 補正欄の「−」トグル（§8.2）＋テスト（トグルで負の値が確定・却下時に戻る・PCの "-10" 直接入力） | B | 完了 | - | components/AdjustInput.tsx, summary.css |
| B9 | F18 集計「日」のカレンダー（§8.4）＋テスト（記録日の印・選択で日付移動・未来日は押せない） | B | 完了 | A7 | components/MonthCalendar.tsx, SummaryScreen.tsx |
| B10 | F19 履歴編集 UI（§8.5）: `SegmentHistory` の編集モード、今日画面への履歴（折りたたみ）追加＋テスト | B | 完了 | L4, A6, A7 | components/SegmentHistory.tsx, TodayScreen.tsx, SummaryScreen.tsx |
| L6 | 改訂1 統合確認: 要件 §7 の（改訂1）9項目を確認、dist の外部参照 grep、デプロイ、ユーザーへ提示（iPhone 実機のアイコン確認はユーザーに依頼） | L | 完了 | 改訂1全タスク | - |

## 要相談 / 申し送り
> 境界をまたぐ変更、契約の変更提案、ブロッカーをここに起票。リーダーが裁定して解消。
- 【L6 完了・リーダーより 2026-10-22】要件 §7（改訂1）9項目を、375px のヘッドレス Chrome で本番ビルドを自動操作して確認した。ローカルと公開URLの両方で 9/9 OK、外部通信 0 件、コンソールエラー 0 件。iPhone 実機のアイコン確認はユーザーに依頼中。残りは任意の B6 と B9 の指摘2点
- 【巡回レビュー4回目・リーダーより 2026-10-22】B10 合格→完了。§8.5 の各項目（先頭行の時刻無効化・非表示業務を選択肢に残す・却下時はフォームを開いたまま・同時1行・日付移動で閉じる・今日画面は折りたたみ）をテストとコードで確認。typecheck / lint / test(177件) / build 通過、dist の外部参照は名前空間文字列のみ。push 済み。次はリーダーが L6
- 【巡回レビュー3回目・リーダーより 2026-10-22】typecheck / lint / test(166件) / build は、作業ツリーとコミット済み HEAD 単体の両方で通過
  - **合格→完了**: A6（§4.3 の検証順・文言どおり）、A7、B7、B8、B9。L5（アイコン）も完了（`scripts/export-icon.ps1` で PNG を再生成できる）
  - 対応しなくても合格扱いにする指摘（任意）:
    - B9: カレンダーを開いたまま「前の期間／次の期間」で月をまたぐと、選択日は動くがカレンダーの表示月は元の月のまま。`shift` 時に閉じるか、`MonthCalendar` に `key={月}` を付けると揃う
    - B9: 日付ラベルをボタンにした分岐で `aria-live="polite"` が外れ、前後移動の読み上げが日モードだけ無くなった。ボタン側にも付けるとよい
- 【L4 完了・リーダーより 2026-10-22】`SegmentEdit` 型と `AppStore.editSegment` を `src/shared/types.ts` に追加（設計書 §4.1 どおり）。A6・B10 は着手可
  - **Sonnet A へ**: 型追加でビルドが落ちるため、`createAppStore.ts` に `editSegment` の仮置き（DomainError「履歴の編集はまだ使えません。」を投げるだけ）を入れた。A6 で `actions.editSegment` への配線に置き換えてください（`DomainError` の import も追加済み）
- 【改訂1 開始・メインOpusより 2026-10-22】要件 F15〜F19（`01-requirements.md` 改訂1）、設計 `02-design.md` §8 と §4 の（改訂1）を参照
  - 着手順: リーダーは **L4 を最優先**（A6・B10 が待つ）→ L5。A は A7 → A6（L4 完了後）。B は B7 → B8 → B9（A7 完了後）→ B10（L4・A6・A7 完了後）
  - B6（任意）は改訂1の後回しでよい
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
- 【巡回レビュー1回目・リーダーより 2026-10-21】typecheck / lint / test(125件) / build / dist 外部URL検査はすべて通過
  - **合格→完了**: A1〜A5、B1、B2、B5（375px の実機幅確認は L3 でリーダーも行う）
  - ※ L1 の状態が「未着手」に戻っていたので「完了」に直した。ボードを書き換えるときは、直前に読み直してから自分の行だけ変えること
  - **B3 差し戻し（修正中）** `src/ui/components/AdjustInput.tsx` / `SummaryTable.tsx`
    1. `onCommit` が false（DomainError。例: 実測10分に -999 を入力）を返しても、入力欄に却下された値が残ったままになる。ストアの値と表示がずれるので、失敗時は `draft` を `String(value)` に戻すこと
    2. `AdjustInput` の key が `${taskId}:${adjustmentMinutes}` なので、日付を移動しても入力途中の値が別の日に持ち越される。key に `editor.date` を含めること
    - 上の2点を確かめるテストを `SummaryScreen.test.tsx` に追加すること
  - **B4 差し戻し（修正中）** `src/ui/screens/downloadFile.ts`
    1. `link.click()` の直後に同期的に `URL.revokeObjectURL` を呼んでいる。iOS Safari などではダウンロードが始まる前に URL が無効になり、書き出しに失敗することがある。`setTimeout` で遅らせて解放すること（遅延時間は定数に切り出す）
  - 対応しなくても合格扱いにする指摘（任意）:
    - A: `resumeDay` で打刻忘れが残っているときのエラー文が「すでに勤務中です。」になっていて意味がずれる。`createAppStore` は30行目安を大きく超えている（クロージャ構成なので許容）
    - B: アイコンの `size={18|20|24}` が各所に直書きされている。サイズ定数にまとめると望ましい
- 【巡回レビュー2回目・リーダーより 2026-10-21】B3・B4 の修正（f037afd）と resumeDay のエラー文修正（ece39aa）を確認し、合格にした。テスト128件通過。全タスク完了につき L3（統合確認）に着手する
- 【L3 完了・リーダーより 2026-10-21】本番ビルドをヘッドレス Chrome で自動操作し、要件 §7 の受け入れ条件 12項目（確認26点）をすべて満たすことを確認した。favicon.ico の 404 はインライン SVG のファビコンで解消済み。375px の集計表が読みにくい点は B6（任意）として起票
