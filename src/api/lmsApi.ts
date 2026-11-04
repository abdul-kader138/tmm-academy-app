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
  ActivitySummary,
  ActivityDetail,
  TwoFactorSetupResponse,
  TwoFactorConfirmResponse,
  UpdateProfilePayload,
  ChangePasswordPayload,
  SupportTicket,
  LiveClassItem,
} from './types';
import { getDeviceId, getDeviceName } from '../utils/deviceInfo';

export const API_BASE_URL = 'https://academy.tmminnovation.com';

export function normalizeAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  // Local file / content URI from ImagePicker
  if (trimmed.startsWith('file:') || trimmed.startsWith('content:')) {
    return trimmed;
  }

  // Force HTTPS if backend returned http for academy.tmminnovation.com
  if (trimmed.startsWith('http://academy.tmminnovation.com')) {
    return trimmed.replace('http://academy.tmminnovation.com', 'https://academy.tmminnovation.com');
  }

  // If backend returns localhost or 127.0.0.1 or 10.0.2.2
  const localhostMatch = trimmed.match(/^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?(\/.*)?$/);
  if (localhostMatch) {
    let pathname = localhostMatch[2] || '';
    if (pathname.startsWith('/avatars/')) {
      pathname = `/storage${pathname}`;
    }
    return `${API_BASE_URL}${pathname}`;
  }

  // Full HTTPS/HTTP URL
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    if (trimmed.includes('academy.tmminnovation.com/avatars/')) {
      return trimmed.replace('academy.tmminnovation.com/avatars/', 'academy.tmminnovation.com/storage/avatars/');
    }
    // Android blocks cleartext http://, force https://
    if (trimmed.startsWith('http://')) {
      return trimmed.replace('http://', 'https://');
    }
    return trimmed;
  }

  // Relative path like /storage/avatars/abc.jpg or avatars/abc.jpg
  let cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (cleanPath.startsWith('/avatars/')) {
    cleanPath = `/storage${cleanPath}`;
  }
  return `${API_BASE_URL}${cleanPath}`;
}

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
    const res = await this.request<any>('/api/v1/courses');
    console.log('[lmsApi] getCourses status:', res.status, 'hasData:', Boolean(res.data));
    if (!res.data) return [];
    let list: any[] = [];
    if (Array.isArray(res.data.courses)) list = res.data.courses;
    else if (Array.isArray(res.data.data)) list = res.data.data;
    else if (Array.isArray(res.data)) list = res.data;
    console.log('[lmsApi] getCourses items:', list.map((c: any) => ({ id: c.id, title: c.title, is_enrolled: c.is_enrolled })));
    return list;
  }

  async getCourseDetail(courseSlug: string): Promise<CourseDetail | null> {
    const res = await this.request<any>(`/api/v1/courses/${courseSlug}`);
    console.log('[lmsApi] getCourseDetail status:', res.status, 'for slug:', courseSlug, 'error:', res.error);
    if (!res.data) {
      if (res.status === 403) {
        const catalog = await this.getCourses().catch(() => []);
        const found = catalog.find((c) => c.slug === courseSlug);
        return {
          id: found?.id || 0,
          slug: courseSlug,
          title: found?.title || 'Course Details',
          description: found?.description || '',
          eyebrow: found?.eyebrow,
          cover_image_url: found?.cover_image_url || '',
          duration_minutes: found?.duration_minutes || 0,
          lessons_count: found?.lessons_count || 0,
          is_enrolled: false,
          created_at: found?.created_at || '',
          is_free: found?.is_free,
          price_cents: found?.price_cents,
          checkout_url: found?.checkout_url,
          sections: [],
          reviews: [],
          access_expired: true,
          error_message: res.error || 'Your access to this course has ended.',
        } as CourseDetail;
      }
      return null;
    }
    const courseObj = res.data.course || res.data.data || res.data;
    if (courseObj && typeof courseObj === 'object') {
      courseObj.is_enrolled = Boolean(
        courseObj.enrollment?.status === 'active' ||
        courseObj.enrollment ||
        courseObj.is_enrolled ||
        true
      );
    }
    return courseObj as CourseDetail;
  }

  async getDashboard(): Promise<DashboardSummary | null> {
    const res = await this.request<any>('/api/v1/dashboard');
    console.log('[lmsApi] getDashboard status:', res.status, 'error:', res.error);
    if (!res.data) return null;

    const raw = res.data;
    const payload = raw.data || raw.dashboard || raw;

    // Backend returns: { enrollments: [ { course: { id, title, slug, ... }, progress_percent, lessons_total, has_access, expires_at } ] }
    let enrolled_courses: CourseCatalogItem[] = [];

    if (Array.isArray(payload.enrollments)) {
      enrolled_courses = payload.enrollments.map((e: any) => {
        const c = e.course || {};
        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          description: c.description || '',
          eyebrow: c.eyebrow,
          cover_image_url: c.cover_image_url || '',
          duration_minutes: c.duration_minutes || 0,
          lessons_count: e.lessons_total || c.lessons_count || 0,
          is_enrolled: true,
          progress_percent: typeof e.progress_percent === 'number' ? e.progress_percent : 0,
          created_at: e.enrolled_at || c.created_at || '',
          has_access: typeof e.has_access === 'boolean' ? e.has_access : true,
          expires_at: e.expires_at,
        };
      });
    } else if (Array.isArray(payload.enrolled_courses)) {
      enrolled_courses = payload.enrolled_courses;
    } else if (Array.isArray(payload.courses)) {
      enrolled_courses = payload.courses;
    }

    console.log('[lmsApi] getDashboard resolved enrolled_courses count:', enrolled_courses.length);

    const certificates: CertificateItem[] =
      payload.certificates ||
      [];

    const pending_checkpoints: ActivitySummary[] =
      payload.pending_checkpoints ||
      payload.pendingCheckpoints ||
      payload.checkpoints ||
      [];

    const rawStreak = payload.learning_streak || payload.streak_summary || {};
    const streakDays = typeof rawStreak.streak === 'number'
      ? rawStreak.streak
      : (rawStreak.streak_days || 0);

    const activeDates = Array.isArray(rawStreak.days)
      ? rawStreak.days.filter((d: any) => d.count > 0).map((d: any) => d.date)
      : (rawStreak.active_dates || []);

    return {
      enrolled_courses,
      certificates,
      pending_checkpoints,
      streak_summary: {
        streak_days: streakDays,
        active_dates: activeDates,
      },
    };
  }

  async getLesson(courseSlug: string, lessonIdOrSlug: string | number): Promise<LessonDetail | null> {
    const res = await this.request<any>(`/api/v1/courses/${courseSlug}/lessons/${lessonIdOrSlug}`);
    if (!res.data) return null;
    const lesson = res.data.lesson || res.data.data || res.data;
    if (lesson && typeof lesson === 'object') {
      if (Array.isArray(res.data.comments)) {
        lesson.comments = res.data.comments;
      }
    }
    return lesson as LessonDetail;
  }

  async reportWatchProgress(courseSlug: string, lessonIdOrSlug: string | number, watched_seconds: number) {
    return this.request(`/api/v1/courses/${courseSlug}/lessons/${lessonIdOrSlug}/progress`, {
      method: 'POST',
      body: JSON.stringify({ watched_seconds }),
    });
  }

  async markLessonComplete(courseSlug: string, lessonIdOrSlug: string | number) {
    await this.ensureCsrf();
    return this.request(`/api/v1/courses/${courseSlug}/lessons/${lessonIdOrSlug}/complete`, {
      method: 'POST',
    });
  }

  async getActivity(courseSlug: string, activityId: number | string): Promise<ActivityDetail | null> {
    const res = await this.request<any>(`/api/v1/courses/${courseSlug}/activities/${activityId}`);
    if (!res.data) return null;
    return (res.data.activity || res.data.data || res.data) as ActivityDetail;
  }

  async submitQuizAnswers(
    courseSlug: string,
    activityId: number | string,
    answers: Record<string, number>
  ): Promise<{ success: boolean; score?: number; passed?: boolean; error?: string; message?: string }> {
    await this.ensureCsrf();
    const res = await this.request<any>(`/api/v1/courses/${courseSlug}/activities/${activityId}/test`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    const d = res.data || {};
    const attempt = d.attempt || d.data || d;
    return {
      success: true,
      score: typeof attempt.score === 'number' ? attempt.score : d.score,
      passed: typeof attempt.passed === 'boolean' ? attempt.passed : Boolean(d.passed),
      message: d.message || attempt.message || 'Quiz submitted successfully',
    };
  }

  async getCertificates(): Promise<CertificateItem[]> {
    const res = await this.request<any>('/api/v1/certificates');
    console.log('[lmsApi] getCertificates status:', res.status, 'hasData:', Boolean(res.data));
    if (!res.data) return [];
    let list: any[] = [];
    if (Array.isArray(res.data.certificates)) list = res.data.certificates;
    else if (Array.isArray(res.data.data)) list = res.data.data;
    else if (Array.isArray(res.data)) list = res.data;

    return list.map((item: any) => ({
      id: item.id,
      course_id: item.course?.id || item.course_id || 0,
      course_title: item.course?.title || item.course_title || 'Course Certificate',
      certificate_number: item.certificate_number,
      issued_at: item.issued_at,
      download_url: item.download_url || `${API_BASE_URL}/api/v1/certificates/${item.id}/download`,
      verify_url: item.verify_url,
    }));
  }

  getCertificateDownloadUrl(certificateId: number | string): string {
    return `${API_BASE_URL}/api/v1/certificates/${certificateId}/download`;
  }

  getAttachmentDownloadUrl(courseSlug: string, lessonId: string | number, attachmentId: string | number): string {
    return `${API_BASE_URL}/api/v1/courses/${courseSlug}/lessons/${lessonId}/attachments/${attachmentId}/download`;
  }

  async enrollCourse(courseSlug: string): Promise<{ success: boolean; message?: string; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<{ message?: string }>(`/api/v1/courses/${courseSlug}/enroll`, {
      method: 'POST',
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, message: res.data?.message || 'Enrolled successfully!' };
  }

  async joinLiveSession(courseSlug: string, sessionId: string | number): Promise<{ success: boolean; join_url?: string; error?: string }> {
    const res = await this.request<{ join_url?: string }>(`/api/v1/courses/${courseSlug}/live-sessions/${sessionId}/join`);
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, join_url: res.data?.join_url };
  }

  async getSupportTickets(): Promise<SupportTicket[]> {
    const res = await this.request<any>('/api/v1/support/tickets');
    if (!res.data) return [];
    if (Array.isArray(res.data.tickets)) return res.data.tickets;
    if (Array.isArray(res.data.data)) return res.data.data;
    if (Array.isArray(res.data)) return res.data;
    return [];
  }

  async getSupportTicket(ticketId: string | number): Promise<SupportTicket | null> {
    const res = await this.request<any>(`/api/v1/support/tickets/${ticketId}`);
    if (!res.data) return null;
    return (res.data.ticket || res.data.data || res.data) as SupportTicket;
  }

  async createSupportTicket(payload: {
    subject: string;
    message: string;
    priority?: 'low' | 'normal' | 'high';
    course_id?: number | null;
  }): Promise<{ success: boolean; data?: SupportTicket; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<any>('/api/v1/support/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, data: res.data?.ticket || res.data };
  }

  async replySupportTicket(
    ticketId: string | number,
    body: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    await this.ensureCsrf();
    const res = await this.request<any>(`/api/v1/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    if (res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, message: res.data?.message || 'Reply posted' };
  }

  // ==========================================
  // ACCOUNT & 2FA APIS
  // ==========================================
  async getAccount(): Promise<Customer | null> {
    const res = await this.request<Customer>('/api/v1/account');
    if (res.data) {
      if (res.data.avatar_url) {
        res.data.avatar_url = normalizeAvatarUrl(res.data.avatar_url);
      }
      return res.data;
    }
    return null;
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

      if (data) {
        const rawUrl = data.avatar_url || data.user?.avatar_url || data.customer?.avatar_url;
        if (rawUrl) {
          data.avatar_url = normalizeAvatarUrl(rawUrl);
        }
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
