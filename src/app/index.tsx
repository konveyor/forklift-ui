import * as React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import { QueryClientProvider, QueryClient, QueryCache } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppLayout } from '@app/AppLayout/AppLayout';
import { AppRoutes } from '@app/routes';
import '@app/app.css';
import {
  PollingContextProvider,
  LocalStorageContextProvider,
  NetworkContextProvider,
} from '@app/common/context';
import { noop } from '@app/common/constants';

const queryCache = new QueryCache();
const queryClient = new QueryClient({ queryCache });

const App: React.FunctionComponent = () => (
  <QueryClientProvider client={queryClient}>
    <PollingContextProvider>
      <LocalStorageContextProvider>
        <NetworkContextProvider>
          <Router getUserConfirmation={noop}>
            <AppLayout>
              <AppRoutes />
            </AppLayout>
          </Router>
        </NetworkContextProvider>
      </LocalStorageContextProvider>
    </PollingContextProvider>
    {process.env.NODE_ENV !== 'test' ? <ReactQueryDevtools /> : null}
  </QueryClientProvider>
);

export { App };
