import { useEffect, useState } from 'react';

export type RouteId = 'today' | 'summary' | 'tasks' | 'data';

export const DEFAULT_ROUTE: RouteId = 'today';

const ROUTE_IDS: readonly RouteId[] = ['today', 'summary', 'tasks', 'data'];
const HASH_PREFIX = '#/';

function isRouteId(value: string): value is RouteId {
  return (ROUTE_IDS as readonly string[]).includes(value);
}

/** "#/summary" → 'summary'。未知・空のハッシュは今日画面に倒す。 */
export function parseRoute(hash: string): RouteId {
  const id = hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : '';
  return isRouteId(id) ? id : DEFAULT_ROUTE;
}

export function routeHref(route: RouteId): string {
  return `${HASH_PREFIX}${route}`;
}

/** location.hash を購読して現在の画面IDを返す。 */
export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHashChange = (): void => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
