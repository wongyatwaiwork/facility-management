import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '../api/client';
import type { User } from '../api/types';
import { useSettings } from '../settings/SettingsProvider';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const { hydrate } = useSettings();

  useEffect(() => {
    void api<{ user: User }>('/auth/me')
      .then(({ user: restored }) => {
        queryClient.clear();
        setUser(restored);
        hydrate(restored.locale, restored.theme);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const result = await api<{ user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        const profile = await api<{ user: User }>('/auth/me');
        queryClient.clear();
        setUser(profile.user ?? result.user);
        hydrate(profile.user.locale, profile.user.theme);
      },
      logout: async () => {
        await api('/auth/logout', { method: 'POST' });
        queryClient.clear();
        setUser(null);
      },
    }),
    [hydrate, loading, queryClient, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
};
