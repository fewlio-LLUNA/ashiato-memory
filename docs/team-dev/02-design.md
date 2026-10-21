# 設計書（指示書）

> `/design-handoff` の成果物。3セッション（Sonnet A / Sonnet B / リーダーOpus）が共通の地図として読む。
> 要件定義書 `01-requirements.md` を入力とする。

最終更新: 2026-10-21
ステータス: **承認済み**（2026-10-21）

## 1. アーキテクチャ概要

```
[ブラウザ（会社PC / スマホ）]
  ┌──────────────────────────────────────────────┐
  │ UI層 (React)  src/ui/**                       │
  │   画面: 今日 / 集計 / 業務管理 / データ        │
  │   useAppState() ─ useSyncExternalStore         │
  │        │ 操作(action)          ▲ 状態(AppData) │
  │        ▼                       │               │
  │ Store層  src/store/**  AppStore                │
  │   状態保持・永続化・タブ間同期・入出力         │
  │        │ 純粋関数を呼ぶ                        │
  │        ▼                                       │
  │ Domain層 src/domain/**  集計・終業目安・丸め・ │
  │   日付計算・表示フォーマット（副作用なし）     │
  │        │                                       │
  │ localStorage  キー "ashiatomemory:v1"          │
  └──────────────────────────────────────────────┘
GitHub Pages ── 配信するのはビルド済みの静的ファイルのみ（データは送らない）
```

- 記録の単位は **区間（Segment）**。「いつからいつまで何をしていたか」を時刻（epoch ms）で持ち、経過時間はすべて差分から計算する。タイマーの積算はしない（スリープ・タブ非アクティブでもずれない）。
- 計測中の区間は `end: null`。切り替え時に現在の区間を閉じ、新しい区間を開く。
- UIは1秒ごとに `now` を更新して再描画するだけで、状態は書き換えない。

## 2. 技術選定と理由（Why）
| 領域 | 採用 | 理由 |
|------|------|------|
| 言語 | TypeScript (strict) | 型注釈必須の個人規約。境界の契約を型で固定できる |
| UI | React 18 + Vite | 画面4つ＋毎秒更新があり、素のDOM操作より状態と表示の同期が楽。ビルド成果物は静的ファイルなので会社PCに何も入れなくてよい |
| ルーティング | 自前の hash ルーティング（`#/today` 等） | 画面4つにライブラリは過剰。GitHub Pages は SPA の履歴ルーティングに弱いため hash が安全 |
| 保存 | localStorage（単一JSON） | 1年分でも数千区間・数百KBで容量内。IndexedDB より実装が単純で同期的に読める |
| テスト | Vitest | Vite と設定共有。Domain層の純粋関数を中心にテスト |
| Lint | ESLint（typescript-eslint, `no-explicit-any`, `no-console` を error） | 個人規約の機械チェック |
| 配信 | GitHub Pages ＋ GitHub Actions | ユーザーのアカウント・会社PCからの閲覧可を確認済み |
| 外部通信の遮断 | ビルド時に CSP メタタグを注入（`connect-src 'none'` 等） | 「外部に送らない」を仕組みで保証する。開発サーバーは HMR を使うので本番ビルドのみに適用 |
| フォント・アイコン | システムフォント、インラインSVG | 外部リソースを読まない。絵文字アイコン禁止の要件 |

## 3. ディレクトリ / モジュール構成
```
ashiatomemory/
├─ index.html
├─ vite.config.ts            # base: './'、本番のみCSP注入プラグイン
├─ package.json / tsconfig*.json / eslint.config.js
├─ .github/workflows/deploy.yml   # main push → test → build → Pages
├─ src/
│  ├─ main.tsx               # エントリ。createAppStore() を生成し <App> に渡す
│  ├─ shared/                # 【共有・契約】型と定数（L1で作成、以降は要相談）
│  │  ├─ types.ts
│  │  └─ constants.ts
│  ├─ domain/                # 【A】純粋関数（副作用・Date.now() 直呼び禁止。now は引数）
│  │  ├─ time.ts             # 日付キー、週・月範囲、区間の長さ
│  │  ├─ summary.ts          # 日次・期間集計、分への丸め
│  │  ├─ flex.ts             # 終業目安
│  │  ├─ format.ts           # 表示用フォーマット
│  │  └─ *.test.ts
│  ├─ store/                 # 【A】AppStore 実装
│  │  ├─ createAppStore.ts
│  │  ├─ actions.ts          # AppData → AppData の純粋な更新関数
│  │  ├─ persistence.ts      # localStorage 読み書き・タブ間同期
│  │  ├─ backup.ts           # JSON 入出力と検証
│  │  └─ *.test.ts
│  └─ ui/                    # 【B】画面・部品・スタイル・SVGアイコン
│     ├─ App.tsx             # ナビ＋hashルーティング＋打刻忘れダイアログ
│     ├─ hooks/              # useAppState, useNow, useRoute
│     ├─ screens/            # TodayScreen, SummaryScreen, TasksScreen, DataScreen
│     ├─ components/
│     ├─ icons/              # SVGアイコン（Reactコンポーネント）
│     ├─ dev/fakeStore.ts    # A完成前に使う仮実装（完成後に削除）
│     └─ styles/             # tokens.css（色・余白）, app.css
└─ docs/team-dev/
```

## 4. インターフェース契約（セッション間の境界）

> L1 でリーダーがこの内容をそのまま `src/shared/types.ts` / `src/shared/constants.ts` に書き起こす。
> 作業中の変更は「要相談」経由のみ。

### 4.1 共有する型（`src/shared/types.ts`）
```ts
export type TaskId = string;
/** ローカル日付キー "YYYY-MM-DD"（業務開始時刻のローカル日付） */
export type DateKey = string;
/** epoch ミリ秒 */
export type EpochMs = number;

export interface Task {
  id: TaskId;
  name: string;
  archived: boolean;   // true: ボタン非表示。過去の集計には出る
  order: number;       // 小さいほど先頭
}

export type SegmentKind = 'task' | 'break';

export interface Segment {
  kind: SegmentKind;
  taskId: TaskId | null;   // kind='break' のとき null
  start: EpochMs;
  end: EpochMs | null;     // 計測中は null（1日に高々1つ、最後の要素のみ）
}

export interface WorkDay {
  date: DateKey;
  clockIn: EpochMs;
  clockOut: EpochMs | null;            // null = 勤務中
  segments: Segment[];                 // start 昇順
  adjustments: Record<TaskId, number>; // 業務別の補正（分, 整数, 負も可）
}

export interface AppData {
  schemaVersion: 1;
  tasks: Task[];
  days: Record<DateKey, WorkDay>;
}

export type SwitchTarget = { kind: 'task'; taskId: TaskId } | { kind: 'break' };

export interface TaskTotal {
  taskId: TaskId;
  measuredMinutes: number;    // 実測（丸め後）
  adjustmentMinutes: number;  // 補正合計
  totalMinutes: number;       // measured + adjustment
}

export interface DaySummary {
  date: DateKey;
  workMinutes: number;        // 実労働（休憩除く）。= Σ measuredMinutes
  breakMinutes: number;
  perTask: TaskTotal[];       // totalMinutes 降順。0分かつ補正なしの業務は含めない
  current: Segment | null;    // 計測中区間
}

export interface RangeSummary {
  from: DateKey;              // 含む
  to: DateKey;                // 含む
  workMinutes: number;
  breakMinutes: number;
  perTask: TaskTotal[];       // 各日の DaySummary を業務ごとに合算
  dayCount: number;           // 記録のある日数
}

export interface FlexInfo {
  estimatedEnd: EpochMs;      // 終業目安
  remainingWorkMs: number;    // 所定まで残り（負なら超過）
  breakMs: number;            // 休憩実績
}

/** 利用者に見せるエラー。message は日本語でそのまま表示できる文にする */
export class DomainError extends Error {
  constructor(message: string) { super(message); this.name = 'DomainError'; }
}

export interface AppStore {
  getState(): AppData;
  subscribe(listener: () => void): () => void;

  // 打刻・切り替え（now 省略時は Date.now()）
  clockIn(now?: EpochMs): void;                       // 当日WorkDay作成＋庶務区間開始
  switchTo(target: SwitchTarget, now?: EpochMs): void;// 計測中と同じ対象なら何もしない
  clockOut(now?: EpochMs): void;
  resumeDay(now?: EpochMs): void;                     // 当日終業済みを勤務中に戻し庶務を開始
  closeStaleDay(date: DateKey, clockOutAt: EpochMs): void; // F14 打刻忘れの確定

  // 業務
  createTask(name: string): Task;
  createTaskAndSwitch(name: string, now?: EpochMs): Task;
  renameTask(id: TaskId, name: string): void;
  setTaskArchived(id: TaskId, archived: boolean): void;
  reorderTasks(orderedIds: TaskId[]): void;

  // 補正
  setAdjustment(date: DateKey, taskId: TaskId, minutes: number): void;

  // バックアップ
  exportJson(now?: EpochMs): string; // 呼んだ時刻を最終バックアップ日時として記録
  importJson(json: string): void;    // 検証NGなら DomainError、データは変更しない
  getLastBackupAt(): EpochMs | null;
}
```

### 4.2 Domain層の関数（`src/domain/*`、A が実装・B が利用）
```ts
// time.ts
export function toDateKey(t: EpochMs): DateKey;
export function weekRange(date: DateKey): { from: DateKey; to: DateKey };  // 月曜始まり
export function monthRange(date: DateKey): { from: DateKey; to: DateKey };
export function addDays(date: DateKey, n: number): DateKey;
export function segmentMs(seg: Segment, now: EpochMs): number;            // end null は now まで

// summary.ts
export function summarizeDay(day: WorkDay, now: EpochMs): DaySummary;
export function summarizeRange(data: AppData, from: DateKey, to: DateKey, now: EpochMs): RangeSummary;
export function getActiveDay(data: AppData): WorkDay | null;              // clockOut null の日
export function findStaleDay(data: AppData, now: EpochMs): WorkDay | null;// 勤務中のまま日付が過去

// flex.ts
export function calcFlex(day: WorkDay, now: EpochMs): FlexInfo;

// format.ts
export function formatMinutes(min: number): string;   // 137 → "2時間17分", 45 → "45分", -5 → "-5分"
export function formatClock(t: EpochMs): string;      // "09:05"
export function formatElapsed(ms: number): string;    // "1:02:09"
export function formatDateLabel(date: DateKey): string; // "10/21(火)"
```

### 4.3 振る舞いのルール（A が実装し、B はこれを前提に画面を作る）
- **分への丸め**: `workMinutes = floor(実労働ms / 60000)`。業務別は最大剰余法で配分し、`Σ measuredMinutes = workMinutes` を必ず満たす（受け入れ条件）。`breakMinutes = floor(休憩ms / 60000)`。
- **終業目安**: `estimatedEnd = clockIn + STANDARD_WORK_MS + max(breakMs, MIN_BREAK_MS)`、`remainingWorkMs = STANDARD_WORK_MS - 実労働ms`。終業後は `clockOut` を now として計算。
- **clockIn**: 勤務中の日がある／当日が終業済み／打刻忘れの日がある場合は DomainError（UIは事前に状態を見てボタンを出し分ける）。
- **switchTo / clockOut**: 勤務中でなければ DomainError。
- **closeStaleDay**: `clockOutAt` は最後の区間の start より後でなければ DomainError。計測中区間の end と clockOut に設定。
- **resumeDay**: 当日の WorkDay の clockOut を null に戻し、庶務区間を now から開く（終業〜再開の間は記録しない）。
- **業務名**: 前後空白を除去。空・50文字超・アクティブ業務との重複は DomainError。
- **庶務**: id は `GENERAL_TASK_ID` 固定。初期データに含め、改名・非表示は DomainError。
- **setAdjustment**: その業務の `measured + minutes < 0` になる値は DomainError。0 を設定したらキーを削除。
- **永続化**: 状態変更のたびに同期保存。`storage` イベントで他タブの変更を取り込み subscribe 通知。保存データが壊れていたら初期データで起動し、壊れたデータを `ashiatomemory:v1:corrupt-<時刻>` に退避。
- **importJson**: `schemaVersion` と構造を検証してから丸ごと置換。

### 4.4 共有定数（`src/shared/constants.ts`）
```ts
export const STORAGE_KEY = 'ashiatomemory:v1';
export const SCHEMA_VERSION = 1;
export const GENERAL_TASK_ID = 'general';
export const GENERAL_TASK_NAME = '庶務';
export const MS_PER_MINUTE = 60_000;
export const STANDARD_WORK_MS = (7 * 60 + 40) * MS_PER_MINUTE; // 所定 7時間40分
export const MIN_BREAK_MS = 60 * MS_PER_MINUTE;                // 休憩 1時間
export const TASK_NAME_MAX_LENGTH = 50;
export const LAST_BACKUP_KEY = 'ashiatomemory:v1:lastBackupAt'; // AppData とは別キー
export const BACKUP_WARN_DAYS = 7;                              // これ以上空いたら注意表示
```

### 4.5 UI と Store の接続
- `main.tsx` で `createAppStore()`（`src/store/createAppStore.ts` の export）を1回呼び、`<App store={store} />` に渡す。
- B は `useAppState(store)`（`useSyncExternalStore` ベース）で購読する。A 完成までは `src/ui/dev/fakeStore.ts`（AppStore を満たすメモリ実装）で開発し、A 完了後に差し替えて削除する。

## 5. タスク分割方針
- **レイヤー分割**を採用: Sonnet A = Domain＋Store（ロジック・永続化）、Sonnet B = UI（画面・スタイル・アイコン）。
- 理由: 時間計算・丸め・終業目安は正確さが最重要でテストで固めたい部分、UIは見た目と導線の作り込みが主で性質が異なる。境界が §4 の型と関数に集約でき、ファイルが一切重ならない。
- リーダーは L1 で土台（Vite・TS・ESLint・Vitest・共有型・CSP・デプロイ設定）を作り、以降はレビューと統合。
- 詳細は `03-board.md`。

## 6. 品質基準（リーダーOpusのレビュー観点）
- `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` がすべて通る
- 個人設定（関数30行目安・型注釈必須・マジックナンバー定数化・any禁止・console.log 残置禁止）
- Domain層は `Date.now()` を直接呼ばない（now を引数で受ける）。テストで時刻を固定できること
- Domain層のテストで最低限カバー: 丸めの合計一致、日またぎ、休憩60分未満/超の終業目安、補正、週（月曜始まり）・月範囲
- UI: 絵文字なし、角丸 4px 以下、群青 `#1E3A8A`・赤 `#C8102E` を基調、375px 幅で横スクロールなし、ボタンのタップ領域 44px 以上
- 本番ビルドで外部URLへの参照がない（`dist/` を grep して `http` が CSP 以外に出てこない）
- 受け入れ条件（要件定義 §7）の充足

## 7. リスクと対策
| リスク | 対策 |
|--------|------|
| ブラウザのデータ削除で記録消失 | データ画面に最終バックアップ日時を表示し、`BACKUP_WARN_DAYS` 日以上空いたら今日画面に注意を出す（B）。日時は `AppData` とは別キー `LAST_BACKUP_KEY` に保存（A） |
| 複数タブで同時に操作して上書き | `storage` イベントで再読込。操作は常に最新状態を読み直してから適用 |
| 打刻忘れで翌日にまたがる | 起動時に `findStaleDay` で検出し、App 全体のダイアログで終了時刻を入力させる。確定まで打刻不可 |
| A の完成前に B が動けない | fakeStore で並行開発。契約は L1 で型として先に固定 |
| CSP が開発サーバーを壊す | CSP は本番ビルド時のみ注入 |
| GitHub への公開作業 | リポジトリ作成・push・Pages 有効化は外部公開にあたるため、リーダーがユーザーに確認してから実施 |
