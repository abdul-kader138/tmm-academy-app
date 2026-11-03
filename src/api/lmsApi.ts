import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Customer,
  AuthMeta,
  LoginPayload,
  TwoFactorChallengeResponse,
  RegisterPayload,
  GoogleAuthPayload,
  CourseCatalogItem,
  CourseDetail,
  LessonDetail,
  DashboardSummary,
  CertificateItem,
} from './types';
import { getDeviceId, getDeviceName } from '../utils/deviceInfo';

export const API_BASE_URL = 'https://academy.tmminnovation.com';

const TOKEN_KEY = '@tmm_academy_auth_token';

class LmsApiClient {
  private token: string | null = null;

  async init() {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      this.token = null;
    }
  }

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number; errors?: Record<string, string[]> }> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const status = response.status;
      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      if (!response.ok) {
        let errorMsg = json?.message || `Request failed with status ${status}`;
        if (json?.errors && typeof json.errors === 'object') {
          const fieldErrors = Object.values(json.errors)
            .flat()
            .filter(Boolean)
            .join('\n• ');
          if (fieldErrors) {
            errorMsg = `• ${fieldErrors}`;
          }
        }
        return { error: errorMsg, status, errors: json?.errors };
      }

      return { data: json as T, status };
    } catch (err: any) {
      return { error: err.message || 'Network connection failed', status: 0 };
    }
  }

  // ==========================================
  // FULL 10-ENDPOINT AUTH SECTION IMPLEMENTATION
  // ==========================================

  /**
   * 1. GET /api/v1/auth/meta
   * Checks whether Turnstile captcha is enforced & retrieves site key.
   */
  async getAuthMeta(): Promise<AuthMeta> {
    const res = await this.request<AuthMeta>('/api/v1/auth/meta');
    return res.data || { captcha_required: false, site_key: null };
  }

  /**
   * 2. GET /api/v1/auth/challenge-view
   * Returns hosted Turnstile challenge URL for native WebView.
   */
  getChallengeViewUrl(): string {
    return `${API_BASE_URL}/api/v1/auth/challenge-view`;
  }

  /**
   * 3. POST /api/v1/auth/login
   * Authenticates user with email, password, optional captcha token, and auto device locking.
   */
  async login(payload: {
    email: string;
    password: string;
    cf_turnstile_response?: string | null;
    remember?: boolean;
  }) {
    const deviceId = await getDeviceId();
    const deviceName = getDeviceName();

    const fullPayload: LoginPayload = {
      ...payload,
      device_id: deviceId,
      device_name: deviceName,
      remember: payload.remember ?? true,
    };

    const res = await this.request<Customer | TwoFactorChallengeResponse>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(fullPayload),
      }
    );

    if (res.data && 'token' in res.data && res.data.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

  /**
   * 4. POST /api/v1/auth/login/challenge
   * Completes 2FA login with 6-digit TOTP code or backup recovery code.
   */
  async completeLoginChallenge(challenge_token: string, code: string) {
    const res = await this.request<Customer>('/api/v1/auth/login/challenge', {
      method: 'POST',
      body: JSON.stringify({ challenge_token, code }),
    });
    if (res.data?.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

  /**
   * 5. POST /api/v1/auth/register
   * Registers a new customer account and sends email verification.
   */
  async register(payload: RegisterPayload) {
    return this.request<{ message: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 6. POST /api/v1/auth/google
   * Authenticates native app with Google OAuth access token.
   */
  async googleSignIn(accessToken: string, remember: boolean = true) {
    const deviceId = await getDeviceId();
    const deviceName = getDeviceName();

    const payload: GoogleAuthPayload = {
      access_token: accessToken,
      remember,
      device_id: deviceId,
      device_name: deviceName,
    };

    const res = await this.request<Customer>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.data?.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

  /**
   * 7. POST /api/v1/auth/logout
   * Ends session, revokes Sanctum bearer token, and clears device lock.
   */
  async logout() {
    try {
      await this.request('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      await this.setToken(null);
    }
  }

  /**
   * 8. POST /api/v1/auth/forgot-password
   * Sends password reset link to user's registered email.
   */
  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * 9. POST /api/v1/auth/reset-password
   * Resets forgotten password with token from email.
   */
  async resetPassword(payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) {
    return this.request<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 10. POST /api/v1/auth/email/verification-notification
   * Resends email verification link.
   */
  async resendVerificationNotification() {
    return this.request<{ message: string }>('/api/v1/auth/email/verification-notification', {
      method: 'POST',
    });
  }

  // ==========================================
  // LEARNER & COURSES APIS
  // ==========================================
  async getCourses(): Promise<CourseCatalogItem[]> {
    const res = await this.request<{ courses: CourseCatalogItem[] }>('/api/v1/courses');
    return res.data?.courses || [];
  }

  async getCourseDetail(courseSlug: string): Promise<CourseDetail | null> {
    const res = await this.request<CourseDetail>(`/api/v1/courses/${courseSlug}`);
    return res.data || null;
  }

  async getDashboard(): Promise<DashboardSummary | null> {
    const res = await this.request<DashboardSummary>('/api/v1/dashboard');
    return res.data || null;
  }

  async getLesson(courseSlug: string, lessonSlug: string): Promise<LessonDetail | null> {
    const res = await this.request<LessonDetail>(`/api/v1/courses/${courseSlug}/lessons/${lessonSlug}`);
    return res.data || null;
  }

  async reportWatchProgress(courseSlug: string, lessonSlug: string, watched_seconds: number) {
    return this.request(`/api/v1/courses/${courseSlug}/lessons/${lessonSlug}/progress`, {
      method: 'POST',
      body: JSON.stringify({ watched_seconds }),
    });
  }

  async markLessonComplete(courseSlug: string, lessonSlug: string) {
    return this.request(`/api/v1/courses/${courseSlug}/lessons/${lessonSlug}/complete`, {
      method: 'POST',
    });
  }

  async getCertificates(): Promise<CertificateItem[]> {
    const res = await this.request<{ certificates: CertificateItem[] }>('/api/v1/certificates');
    return res.data?.certificates || [];
  }

  // ==========================================
  // ACCOUNT APIS
  // ==========================================
  async getAccount(): Promise<Customer | null> {
    const res = await this.request<Customer>('/api/v1/account');
    return res.data || null;
  }

  async updateAccount(payload: Partial<Customer>) {
    return this.request<Customer>('/api/v1/account', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
}

export const lmsApi = new LmsApiClient();
