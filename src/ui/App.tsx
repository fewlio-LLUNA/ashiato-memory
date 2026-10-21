import type { ReactElement } from 'react';
import type { AppStore } from '../shared/types';
import { Nav } from './components/Nav';
import { useRoute, type RouteId } from './hooks/useRoute';
import './styles/tokens.css';
import './styles/app.css';

interface AppProps {
  store: AppStore;
}

const SCREEN_TITLES: Record<RouteId, string> = {
  today: '今日',
  summary: '集計',
  tasks: '業務管理',
  data: 'データ',
};

interface ScreenProps {
  route: RouteId;
  store: AppStore;
}

/** 各画面は B2〜B4 で差し替える。それまでは見出しだけの仮表示。 */
function Screen({ route }: ScreenProps): ReactElement {
  return <h1 className="screen__title">{SCREEN_TITLES[route]}</h1>;
}

export function App({ store }: AppProps): ReactElement {
  const route = useRoute();
  return (
    <div className="app">
      <Nav current={route} />
      <main className="app__main">
        <Screen route={route} store={store} />
      </main>
    </div>
  );
}
