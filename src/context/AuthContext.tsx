import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, RegisterPayload } from '../api/types';
import { lmsApi } from '../api/lmsApi';

interface AuthContextType {
  user: Customer | null;
  loading: boolean;
  login: (payload: {
    email: string;
    password: string;
    cf_turnstile_response?: string | null;
    remember?: boolean;
  }) => Promise<{
    success: boolean;
    twoFactor?: boolean;
    challengeToken?: string;
    error?: string;
    status?: number;
  }>;
  complete2FA: (challengeToken: string, code: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendVerification: () => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  complete2FA: async () => ({ success: false }),
  register: async () => ({ success: false }),
  forgotPassword: async () => ({ success: false }),
  resendVerification: async () => ({ success: false }),
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

  const login = async (payload: {
    email: string;
    password: string;
    cf_turnstile_response?: string | null;
    remember?: boolean;
  }) => {
    const res = await lmsApi.login(payload);
    if (res.error) {
      return { success: false, error: res.error, status: res.status };
    }
    if (res.data && 'two_factor_required' in res.data && res.data.two_factor_required) {
      return {
        success: false,
        twoFactor: true,
        challengeToken: (res.data as any).challenge_token,
        status: res.status,
      };
    }
    if (res.data && 'id' in res.data) {
      setUser(res.data as Customer);
      return { success: true, status: res.status };
    }
    return { success: false, error: 'Unexpected login response', status: res.status };
  };

  const complete2FA = async (challengeToken: string, code: string) => {
    const res = await lmsApi.completeLoginChallenge(challengeToken, code);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.data && 'id' in res.data) {
      setUser(res.data as Customer);
      return { success: true };
    }
    return { success: false, error: 'Verification code rejected' };
  };

  const register = async (payload: RegisterPayload) => {
    const res = await lmsApi.register(payload);
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, message: res.data?.message || 'Verification email sent' };
  };

  const forgotPassword = async (email: string) => {
    const res = await lmsApi.forgotPassword(email);
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, message: res.data?.message || 'Reset link sent' };
  };

  const resendVerification = async () => {
    const res = await lmsApi.resendVerificationNotification();
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, message: res.data?.message || 'Link resent' };
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        complete2FA,
        register,
        forgotPassword,
        resendVerification,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
