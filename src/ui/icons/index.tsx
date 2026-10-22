import type { ReactElement } from 'react';
import { Icon, type IconProps } from './Icon';

/** 今日（時計） */
export function ClockIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

/** 集計（棒グラフ） */
export function ChartIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </Icon>
  );
}

/** 業務管理（リスト） */
export function ListIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M9 6h12" />
      <path d="M9 12h12" />
      <path d="M9 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </Icon>
  );
}

/** データ（ディスク） */
export function DatabaseIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </Icon>
  );
}

/** 業務開始（再生） */
export function PlayIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M7 4l13 8-13 8z" />
    </Icon>
  );
}

/** 業務終了（停止） */
export function StopIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="5" y="5" width="14" height="14" />
    </Icon>
  );
}

/** 休憩（カップ） */
export function CupIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M17 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M8 3v2" />
      <path d="M12 3v2" />
    </Icon>
  );
}

/** 追加（プラス） */
export function PlusIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

/** 書き出し（下向き矢印） */
export function DownloadIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 4v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </Icon>
  );
}

/** 読み込み（上向き矢印） */
export function UploadIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 16V5" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </Icon>
  );
}

/** 前へ */
export function ChevronLeftIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

/** 次へ */
export function ChevronRightIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M9 5l7 7-7 7" />
    </Icon>
  );
}

/** 上へ（並べ替え） */
export function ArrowUpIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </Icon>
  );
}

/** 下へ（並べ替え） */
export function ArrowDownIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </Icon>
  );
}

/** 警告 */
export function AlertIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5" />
      <path d="M12 18h.01" />
    </Icon>
  );
}

/** カレンダー */
export function CalendarIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </Icon>
  );
}

/** 編集（鉛筆） */
export function PencilIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </Icon>
  );
}
