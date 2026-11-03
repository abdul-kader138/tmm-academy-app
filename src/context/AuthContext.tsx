import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Customer,
  RegisterPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
  TwoFactorSetupResponse,
  TwoFactorConfirmResponse,
} from '../api/types';
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
  updateProfile: (payload: UpdateProfilePayload) => Promise<{ success: boolean; error?: string }>;
  changePassword: (payload: ChangePasswordPayload) => Promise<{ success: boolean; message?: string; error?: string }>;
  setup2FA: () => Promise<{ success: boolean; data?: TwoFactorSetupResponse; error?: string; alreadyEnabled?: boolean }>;
  confirm2FA: (secret: string, code: string) => Promise<{ success: boolean; data?: TwoFactorConfirmResponse; error?: string }>;
  disable2FA: (password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  regenerateRecoveryCodes: (password: string) => Promise<{ success: boolean; data?: TwoFactorConfirmResponse; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<Customer>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  complete2FA: async () => ({ success: false }),
  register: async () => ({ success: false }),
  forgotPassword: async () => ({ success: false }),
  resendVerification: async () => ({ success: false }),
  updateProfile: async () => ({ success: false }),
  changePassword: async () => ({ success: false }),
  setup2FA: async () => ({ success: false }),
  confirm2FA: async () => ({ success: false }),
  disable2FA: async () => ({ success: false }),
  regenerateRecoveryCodes: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
  updateUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        await lmsApi.init();
        const token = lmsApi.getToken();
        console.log('[AuthContext] Full startup token:', token);
        if (token) {
          const profile = await lmsApi.getAccount();
          console.log('[AuthContext] Startup profile:', profile ? profile.email : 'NULL');
          setUser(profile);
        }
      } catch (e) {
        console.error('[AuthContext] Startup error:', e);
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

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const res = await lmsApi.updateProfile(payload);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.data) {
      setUser(res.data);
    }
    return { success: true };
  };

  const changePassword = async (payload: ChangePasswordPayload) => {
    const res = await lmsApi.changePassword(payload);
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, message: res.data?.message || 'Password updated' };
  };

  const setup2FA = async () => {
    const res = await lmsApi.setupTwoFactor();
    if (res.alreadyEnabled) {
      await refreshUser();
    }
    return res;
  };

  const confirm2FA = async (secret: string, code: string) => {
    const res = await lmsApi.confirmTwoFactor(secret, code);
    if (res.success) {
      await refreshUser();
    }
    return res;
  };

  const disable2FA = async (password: string) => {
    const res = await lmsApi.disableTwoFactor(password);
    if (res.success) {
      await refreshUser();
    }
    return res;
  };

  const regenerateRecoveryCodes = async (password: string) => {
    return lmsApi.regenerateTwoFactorRecoveryCodes(password);
  };

  const logout = async () => {
    await lmsApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const profile = await lmsApi.getAccount();
    if (profile) setUser(profile);
  };

  const updateUser = async (patch: Partial<Customer>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...patch };
    });
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
        updateProfile,
        changePassword,
        setup2FA,
        confirm2FA,
        disable2FA,
        regenerateRecoveryCodes,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
