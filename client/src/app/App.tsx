import { BrowserRouter } from 'react-router';
import { AuthProvider } from '../features/auth/store/auth-provider';
import { QueryProvider } from './providers/query-provider';
import { AppRoutes } from './routes';

export const App = () => (
  <QueryProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </QueryProvider>
);
