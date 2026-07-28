import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiError } from '../api/client.js';
import {
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
} from '../api/endpoints.js';

const AuthContext = createContext(null);

const readAuthPayload = (payload) => {
  const data = payload?.data ?? {};

  return {
    token: data.accessToken ?? null,
    user: data.user ?? null,
    organization: data.organization ?? null,
    permissions: data.permissions ?? [],
  };
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    token: null,
    user: null,
    organization: null,
    permissions: [],
  });
  const [bootstrapping, setBootstrapping] = useState(true);
  const tokenRef = useRef(null);

  const applyAuth = useCallback((next) => {
    tokenRef.current = next.token;
    setAuth(next);
  }, []);

  const clearAuth = useCallback(() => {
    tokenRef.current = null;
    setAuth({ token: null, user: null, organization: null, permissions: [] });
  }, []);

  const login = useCallback(
    async ({ organizationSlug, email, password }) => {
      const payload = await loginRequest({ organizationSlug, email, password });
      applyAuth(readAuthPayload(payload));
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore network/logout errors; the session is cleared locally regardless.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  // Try to restore a session from the refresh cookie on first load.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const payload = await refreshRequest();
        if (active) {
          applyAuth(readAuthPayload(payload));
        }
      } catch {
        if (active) {
          clearAuth();
        }
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [applyAuth, clearAuth]);

  /**
   * Runs an authenticated request builder with the current token. On a 401 it refreshes
   * once and retries; if the refresh fails the session is cleared and the error rethrown.
   */
  const authedRequest = useCallback(
    async (makeRequest) => {
      try {
        return await makeRequest(tokenRef.current);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        try {
          const payload = await refreshRequest();
          applyAuth(readAuthPayload(payload));
        } catch (refreshError) {
          clearAuth();
          throw refreshError;
        }

        return makeRequest(tokenRef.current);
      }
    },
    [applyAuth, clearAuth],
  );

  /**
   * Replaces the cached profile without a round trip — used after the user changes their own
   * password, so the refreshed `mustChangePassword: false` clears the forced-change gate.
   */
  const applyUser = useCallback((nextUser) => {
    setAuth((current) => ({ ...current, user: nextUser ?? current.user }));
  }, []);

  const value = useMemo(
    () => ({
      ...auth,
      isAuthenticated: Boolean(auth.token),
      bootstrapping,
      login,
      logout,
      authedRequest,
      applyUser,
    }),
    [auth, bootstrapping, login, logout, authedRequest, applyUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
};
