import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer } from '../api/types';
import { lmsApi } from '../api/lmsApi';

interface AuthContextType {
  user: Customer | null;
  loading: boolean;
  login: (payload: { email: string; password: string; cf_turnstile_response?: string | null }) => Promise<{ success: boolean; twoFactor?: boolean; challengeToken?: string; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        await lmsApi.init();
        if (lmsApi.getToken()) {
          const profile = await lmsApi.getAccount();
          setUser(profile);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (payload: { email: string; password: string; cf_turnstile_response?: string | null }) => {
    const res = await lmsApi.login(payload);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.data && 'two_factor_required' in res.data && res.data.two_factor_required) {
      return {
        success: false,
        twoFactor: true,
        challengeToken: (res.data as any).challenge_token,
      };
    }
    if (res.data && 'id' in res.data) {
      setUser(res.data as Customer);
      return { success: true };
    }
    return { success: false, error: 'Unexpected login response' };
  };

  const logout = async () => {
    await lmsApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const profile = await lmsApi.getAccount();
    if (profile) setUser(profile);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
