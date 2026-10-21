import type { ReactElement } from 'react';
import { findStaleDay } from '../domain/summary';
import type { AppStore } from '../shared/types';
import { Nav } from './components/Nav';
import { StaleDayDialog } from './components/StaleDayDialog';
import { useAppState } from './hooks/useAppState';
import { useNow } from './hooks/useNow';
import { useRoute, type RouteId } from './hooks/useRoute';
import { DataScreen } from './screens/DataScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { TasksScreen } from './screens/TasksScreen';
import { TodayScreen } from './screens/TodayScreen';
import './styles/tokens.css';
import './styles/app.css';

interface AppProps {
  store: AppStore;
}

interface ScreenProps {
  route: RouteId;
  store: AppStore;
}

function Screen({ route, store }: ScreenProps): ReactElement {
  switch (route) {
    case 'today':
      return <TodayScreen store={store} />;
    case 'summary':
      return <SummaryScreen store={store} />;
    case 'tasks':
      return <TasksScreen store={store} />;
    case 'data':
      return <DataScreen store={store} />;
  }
}

export function App({ store }: AppProps): ReactElement {
  const route = useRoute();
  const data = useAppState(store);
  const staleDay = findStaleDay(data, useNow());
  return (
    <div className="app">
      <Nav current={route} />
      <main className="app__main">
        <Screen route={route} store={store} />
      </main>
      {staleDay && <StaleDayDialog key={staleDay.date} store={store} day={staleDay} />}
    </div>
  );
}
