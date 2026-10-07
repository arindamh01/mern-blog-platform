import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { onSessionChange, refreshSession, setAccessToken } from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session) => {
    setAccessToken(session?.accessToken ?? null);
    setToken(session?.accessToken ?? null);
    setUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    onSessionChange(applySession);
    refreshSession()
      .catch(() => applySession(null))
      .finally(() => setLoading(false));
  }, [applySession]);

  const login = useCallback(
    async (credentials) => {
      const { data } = await authApi.login(credentials);
      applySession(data);
      return data.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await authApi.register(payload);
      applySession(data);
      return data.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const completeOAuth = useCallback(async () => {
    const session = await refreshSession();
    return session.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken: token,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      completeOAuth,
    }),
    [user, token, loading, login, register, logout, completeOAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
