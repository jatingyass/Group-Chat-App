import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, tokenStore } from '../api/axios';
import { disconnectSocket } from '../api/socket';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = 'gca_user';

const readStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) {
      setUser(null);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const persist = (u: User, token: string) => {
    tokenStore.set(token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const login: AuthContextValue['login'] = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user: u } = res.data.data;
      persist(u, token);
    } finally {
      setIsLoading(false);
    }
  };

  const signup: AuthContextValue['signup'] = async (payload) => {
    setIsLoading(true);
    try {
      await api.post('/auth/signup', payload);
      // Auto-login after signup
      await login(payload.email, payload.password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    disconnectSocket();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user && tokenStore.get()),
      login,
      signup,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
