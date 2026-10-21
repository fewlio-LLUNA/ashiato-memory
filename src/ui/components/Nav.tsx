import type { ReactElement } from 'react';
import { ChartIcon, ClockIcon, DatabaseIcon, ListIcon } from '../icons';
import type { IconProps } from '../icons/Icon';
import { routeHref, type RouteId } from '../hooks/useRoute';

interface NavItem {
  route: RouteId;
  label: string;
  Icon: (props: IconProps) => ReactElement;
}

const NAV_ITEMS: readonly NavItem[] = [
  { route: 'today', label: '今日', Icon: ClockIcon },
  { route: 'summary', label: '集計', Icon: ChartIcon },
  { route: 'tasks', label: '業務管理', Icon: ListIcon },
  { route: 'data', label: 'データ', Icon: DatabaseIcon },
];

interface NavProps {
  current: RouteId;
}

/** 画面切り替えナビ。PC は上部、スマホは下部（CSS で切り替え）。 */
export function Nav({ current }: NavProps): ReactElement {
  return (
    <nav className="nav" aria-label="メインメニュー">
      <div className="nav__inner">
        {NAV_ITEMS.map(({ route, label, Icon }) => (
          <a
            key={route}
            className="nav__link"
            href={routeHref(route)}
            aria-current={route === current ? 'page' : undefined}
          >
            <Icon />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
