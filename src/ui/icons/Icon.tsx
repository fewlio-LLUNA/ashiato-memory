import type { ReactElement, ReactNode } from 'react';

const ICON_VIEWBOX = '0 0 24 24';
const ICON_DEFAULT_SIZE = 24;
const ICON_STROKE_WIDTH = 2;

export interface IconProps {
  size?: number;
}

interface IconBaseProps extends IconProps {
  children: ReactNode;
}

/** 全アイコン共通の SVG ラッパー。色は currentColor に従う。装飾なので読み上げ対象外。 */
export function Icon({ size = ICON_DEFAULT_SIZE, children }: IconBaseProps): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox={ICON_VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
