# Sonnet A 申し送り（A1〜A5）

## B（UI）向けの利用メモ
- 例外はすべて `DomainError`（`message` は日本語でそのまま表示可）。保存失敗（容量超過等）も `DomainError`。
- `exportJson()` は最終バックアップ日時を記録した後、購読者へ通知する（状態は変わらないが `getLastBackupAt()` を読み直せる）。
- `createAppStore(options?)`: 引数なしで本番用（localStorage + window の storage イベント）。テスト用に `storage` / `eventTarget` / `clock` / `generateId` を差し替え可。localStorage が使えない環境ではメモリ保存に落ちる。
- `switchTo` は計測中と同じ対象・`getState()` の参照も不変（再描画されない）。
- 打刻忘れの日があると `clockIn` / `switchTo` / `clockOut` / `resumeDay` は DomainError。UI は `findStaleDay` でダイアログを先に出すこと。
- 非表示の業務への `switchTo` は DomainError。
- `formatMinutes(120)` は "2時間"（分が 0 のときは分を省略）。

## 設計書との差異・補足
- 設計書 §4.2 の `formatDateLabel` 例 "10/21(火)" は実際の 2026-10-21 が水曜のため、実装は "10/21(水)" を返す（例が仮のもの）。
- actions.ts の純粋関数は `now`/`id` を引数で受ける（契約の AppStore 公開 API は変更なし）。
- 同名チェックはアクティブ（非表示でない）業務のみが対象。
- `importJson` の検証: schemaVersion、業務の一意性と庶務の存在、区間の時刻・順序、参照する業務の存在、補正が整数、勤務中の日が高々1つ。
