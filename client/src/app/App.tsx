import { BrowserRouter } from 'react-router';
import { QueryProvider } from './providers/query-provider';
import { AppRoutes } from './routes';

export const App = () => (
  <QueryProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </QueryProvider>
);
