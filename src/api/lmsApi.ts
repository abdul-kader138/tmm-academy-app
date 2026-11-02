import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Customer,
  AuthMeta,
  CourseCatalogItem,
  CourseDetail,
  LessonDetail,
  DashboardSummary,
  CertificateItem
} from './types';

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
  ): Promise<{ data?: T; error?: string; status: number }> {
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
        const errorMsg =
          json?.message ||
          (json?.errors && Object.values(json.errors).flat().join(', ')) ||
          `Request failed with status ${status}`;
        return { error: errorMsg, status };
      }

      return { data: json as T, status };
    } catch (err: any) {
      return { error: err.message || 'Network error occurred', status: 0 };
    }
  }

  // --- Auth APIs ---
  async getAuthMeta(): Promise<AuthMeta> {
    const res = await this.request<AuthMeta>('/api/v1/auth/meta');
    return res.data || { captcha_required: false, site_key: null };
  }

  async login(payload: {
    email: string;
    password: string;
    cf_turnstile_response?: string | null;
    remember?: boolean;
    device_id?: string | null;
    device_name?: string | null;
  }) {
    const res = await this.request<Customer | { two_factor_required: boolean; challenge_token: string }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (res.data && 'token' in res.data && res.data.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

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

  async logout() {
    try {
      await this.request('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      await this.setToken(null);
    }
  }

  // --- Learner & Courses APIs ---
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

  // --- Account APIs ---
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
