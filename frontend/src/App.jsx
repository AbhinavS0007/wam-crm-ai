import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import AppShell from './pages/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Spinner from './components/Spinner.jsx';
import { RealtimeProvider } from './realtime/RealtimeProvider.jsx';

const AuthenticatedApp = () => {
  const { isAuthenticated, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner label="Loading…" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <RealtimeProvider>
      <AppShell />
    </RealtimeProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AuthenticatedApp />
  </AuthProvider>
);

export default App;
