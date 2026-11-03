import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
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
  TwoFactorSetupResponse,
  TwoFactorConfirmResponse,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from './types';
import { getDeviceId, getDeviceName } from '../utils/deviceInfo';

export const API_BASE_URL = 'https://academy.tmminnovation.com';

const TOKEN_KEY = '@tmm_academy_auth_token';
const COOKIES_KEY = '@tmm_academy_cookies';
const XSRF_KEY = '@tmm_academy_xsrf';

class LmsApiClient {
  private token: string | null = null;
  private cookies: Map<string, string> = new Map();
  private xsrfToken: string | null = null;
  private csrfInitialized: boolean = false;

  async init() {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
      const savedCookies = await AsyncStorage.getItem(COOKIES_KEY);
      if (savedCookies) {
        const parsed = JSON.parse(savedCookies);
        this.cookies = new Map(Object.entries(parsed));
      }
      this.xsrfToken = await AsyncStorage.getItem(XSRF_KEY);
    } catch {
      this.token = null;
    }
  }

  private async persistCookies() {
    try {
      const obj = Object.fromEntries(this.cookies.entries());
      await AsyncStorage.setItem(COOKIES_KEY, JSON.stringify(obj));
      if (this.xsrfToken) {
        await AsyncStorage.setItem(XSRF_KEY, this.xsrfToken);
      } else {
        await AsyncStorage.removeItem(XSRF_KEY);
      }
    } catch {}
  }

  private parseAndStoreCookies(response: Response) {
    try {
      let setCookieList: string[] = [];
      if (typeof (response.headers as any).getSetCookie === 'function') {
        setCookieList = (response.headers as any).getSetCookie();
      } else if (typeof (response.headers as any).raw === 'function') {
        const raw = (response.headers as any).raw()['set-cookie'];
        if (Array.isArray(raw)) setCookieList = raw;
      }

      if (setCookieList.length === 0) {
        const raw = response.headers.get('set-cookie');
        if (raw) {
          setCookieList = raw.split(/,(?=\s*[a-zA-Z0-9_\-]+=)/g);
        }
      }

      let changed = false;
      for (const cookieStr of setCookieList) {
        const clean = cookieStr.trim();
        if (!clean) continue;
        const [cookiePart] = clean.split(';');
        const eqIdx = cookiePart.indexOf('=');
        if (eqIdx > 0) {
          const name = cookiePart.slice(0, eqIdx).trim();
          const val = cookiePart.slice(eqIdx + 1).trim();
          this.cookies.set(name, val);
          changed = true;
          if (name === 'XSRF-TOKEN') {
            try {
              this.xsrfToken = decodeURIComponent(val);
            } catch {
              this.xsrfToken = val;
            }
          }
        }
      }

      if (changed) {
        void this.persistCookies();
      }
    } catch (e) {
      console.warn('Error parsing cookies:', e);
    }
  }

  private getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  /**
   * Initializes or refreshes Laravel Sanctum session and CSRF cookie.
   * Required for stateful operations like login/register to prevent
   * 'Session store not set on request' errors in Laravel.
   */
  async ensureCsrf(forceRefresh = false): Promise<void> {
    if (this.csrfInitialized && !forceRefresh && this.cookies.has('tmm-academy-session')) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Referer: `${API_BASE_URL}/`,
        Origin: API_BASE_URL,
      };

      const existingCookies = this.getCookieHeader();
      if (existingCookies) {
        headers.Cookie = existingCookies;
      }

      const res = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
        method: 'GET',
        headers,
      });

      this.parseAndStoreCookies(res);
      this.csrfInitialized = true;
    } catch (e) {
      console.warn('Failed to fetch CSRF cookie:', e);
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
    options: RequestInit & { _isRetry?: boolean } = {}
  ): Promise<{ data?: T; error?: string; status: number; errors?: Record<string, string[]> }> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Referer: `${API_BASE_URL}/`,
      Origin: API_BASE_URL,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    if (this.xsrfToken) {
      headers['X-XSRF-TOKEN'] = this.xsrfToken;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Capture any new cookies from server (e.g. login sets session cookie)
      this.parseAndStoreCookies(response);

      const status = response.status;
      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      // If session expired or CSRF mismatch (419), refresh CSRF and retry once
      if (status === 419 && !options._isRetry) {
        await this.ensureCsrf(true);
        return this.request(endpoint, { ...options, _isRetry: true });
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
    // Ensure active Sanctum session and CSRF cookie before posting
    await this.ensureCsrf();

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
    await this.ensureCsrf();
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
    await this.ensureCsrf();
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
    await this.ensureCsrf();
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
      this.cookies.clear();
      this.xsrfToken = null;
      this.csrfInitialized = false;
      await AsyncStorage.multiRemove([TOKEN_KEY, COOKIES_KEY, XSRF_KEY]);
    }
  }

  /**
   * 8. POST /api/v1/auth/forgot-password
   * Sends password reset link to user's registered email.
   */
  async forgotPassword(email: string) {
    await this.ensureCsrf();
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
    await this.ensureCsrf();
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

  getCertificateDownloadUrl(certificateId: number | string): string {
    return `${API_BASE_URL}/api/v1/certificates/${certificateId}/download`;
  }

  // ==========================================
  // ACCOUNT & 2FA APIS
  // ==========================================
  async getAccount(): Promise<Customer | null> {
    const res = await this.request<Customer>('/api/v1/account');
    return res.data || null;
  }

  async updateProfile(payload: UpdateProfilePayload) {
    await this.ensureCsrf();
    return this.request<Customer>('/api/v1/account', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async uploadAvatar(imageUri: string): Promise<{ success: boolean; data?: Customer; error?: string }> {
    await this.ensureCsrf();

    const rawFilename = imageUri.split('/').pop()?.split('?')[0] || `avatar_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(rawFilename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const filename = rawFilename.includes('.') ? rawFilename : `avatar_${Date.now()}.${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg'}`;

    const normalizedUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;

    let filePart: any = null;
    try {
      filePart = new ExpoFile(imageUri);
    } catch (_) {}

    if (!filePart) {
      try {
        const localRes = await fetch(imageUri);
        filePart = await localRes.blob();
      } catch (_) {}
    }

    const formData = new FormData();
    if (filePart) {
      formData.append('avatar', filePart, filename);
    } else {
      formData.append('avatar', {
        uri: Platform.OS === 'ios' ? normalizedUri : imageUri,
        name: filename,
        type,
      } as any);
    }

    const buildHeaders = (): Record<string, string> => {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Referer: `${API_BASE_URL}/`,
        Origin: API_BASE_URL,
      };

      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const cookieHeader = this.getCookieHeader();
      if (cookieHeader) {
        headers.Cookie = cookieHeader;
      }

      if (this.xsrfToken) {
        headers['X-XSRF-TOKEN'] = this.xsrfToken;
      }
      return headers;
    };

    try {
      let response = await fetch(`${API_BASE_URL}/api/v1/account/avatar`, {
        method: 'POST',
        headers: buildHeaders(),
        body: formData,
      });

      this.parseAndStoreCookies(response);

      // Handle 419 CSRF expiration retry
      if (response.status === 419) {
        await this.ensureCsrf();
        response = await fetch(`${API_BASE_URL}/api/v1/account/avatar`, {
          method: 'POST',
          headers: buildHeaders(),
          body: formData,
        });
        this.parseAndStoreCookies(response);
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errMsg =
          data?.errors?.avatar?.[0] ||
          data?.message ||
          (response.status === 413 ? 'Image is too large (max 5MB).' : `Upload failed (${response.status})`);
        return { success: false, error: errMsg };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  }

  async removeAvatar(): Promise<{ success: boolean; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<{ message: string }>('/api/v1/account/avatar', {
      method: 'DELETE',
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true };
  }

  async changePassword(payload: ChangePasswordPayload) {
    await this.ensureCsrf();
    return this.request<{ message: string }>('/api/v1/account/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 2FA Step 1: Generate candidate secret and QR code SVG
   */
  async setupTwoFactor(): Promise<{
    success: boolean;
    data?: TwoFactorSetupResponse;
    error?: string;
    alreadyEnabled?: boolean;
  }> {
    await this.ensureCsrf();
    const res = await this.request<TwoFactorSetupResponse>('/api/v1/account/two-factor/setup', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (res.error) {
      const msg = (res.error || '').toLowerCase();
      if (res.status === 422 || msg.includes('already enabled') || msg.includes('active') || msg.includes('enabled')) {
        return { success: true, alreadyEnabled: true, error: res.error };
      }
      return { success: false, error: res.error };
    }
    return { success: true, data: res.data };
  }

  /**
   * 2FA Step 2: Confirm candidate secret with 6-digit TOTP code, returns recovery codes
   */
  async confirmTwoFactor(
    secret: string,
    code: string
  ): Promise<{ success: boolean; data?: TwoFactorConfirmResponse; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<TwoFactorConfirmResponse>('/api/v1/account/two-factor/confirm', {
      method: 'POST',
      body: JSON.stringify({ secret, code }),
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, data: res.data };
  }

  /**
   * 2FA: Regenerate backup recovery codes (password-gated)
   */
  async regenerateTwoFactorRecoveryCodes(
    password: string
  ): Promise<{ success: boolean; data?: TwoFactorConfirmResponse; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<TwoFactorConfirmResponse>('/api/v1/account/two-factor/recovery-codes', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, data: res.data };
  }

  /**
   * 2FA: Disable Two-Factor Authentication (password-gated)
   */
  async disableTwoFactor(
    password: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<{ message: string }>('/api/v1/account/two-factor', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, message: res.data?.message };
  }

  async exportAccountData(): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await this.request('/api/v1/account/export');
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, data: res.data };
  }

  async deleteAccount(password: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<{ message: string }>('/api/v1/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    await this.logout();
    return { success: true };
  }
}

export const lmsApi = new LmsApiClient();
