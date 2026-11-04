export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
  marketing_opt_in: boolean;
  locale?: 'en' | 'it' | 'bn' | null;
  email_verified: boolean;
  two_factor_enabled: boolean;
  avatar_url?: string | null;
  created_at: string;
  token?: string | null;
}

export interface AuthMeta {
  captcha_required: boolean;
  site_key?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  cf_turnstile_response?: string | null;
  remember?: boolean;
  device_id?: string | null;
  device_name?: string | null;
}

export interface TwoFactorChallengeResponse {
  two_factor_required: boolean;
  challenge_token: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string | null;
  phone_country?: string | null;
  marketing_opt_in?: boolean | null;
  cf_turnstile_response?: string | null;
}

export interface GoogleAuthPayload {
  access_token: string;
  remember?: boolean;
  device_id?: string | null;
  device_name?: string | null;
}

export interface CourseCatalogItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  eyebrow?: string;
  cover_image_url: string;
  duration_minutes: number;
  lessons_count: number;
  is_enrolled: boolean;
  progress_percent?: number | null;
  created_at: string;
  is_free?: boolean;
  price_cents?: number | null;
  price?: number | null;
  currency?: string;
  price_formatted?: string;
  original_price?: number | null;
  checkout_url?: string | null;
  live_sessions?: any[];
  has_access?: boolean;
  expires_at?: string;
  access_expired?: boolean;
  error_message?: string;
}

export interface CourseDetail extends CourseCatalogItem {
  sections: CourseSection[];
  activities?: ActivitySummary[];
  attachments?: LessonAttachment[];
  live_sessions?: any[];
  live_classes?: LiveClassItem[];
  reviews: CourseReview[];
  instructor?: {
    name: string;
    avatar_url?: string;
    bio?: string;
  };
}

export interface CourseSection {
  id: number;
  title: string;
  order: number;
  lessons: LessonSummary[];
  activities: ActivitySummary[];
}

export interface LessonSummary {
  id: number;
  slug?: string;
  title: string;
  duration_minutes?: number;
  duration_seconds?: number;
  is_completed: boolean;
  order?: number;
  sort_order?: number;
  has_attachments?: boolean;
}

export interface LessonAttachment {
  id?: number | string;
  title: string;
  url?: string;
  file_url?: string;
  type?: string;
  size?: string;
}

export interface LessonDetail {
  id: number;
  slug?: string;
  title: string;
  summary?: string;
  description?: string;
  video_url?: string;
  vimeo_id?: string | number;
  youtube_id?: string;
  video_type?: 'vimeo' | 'youtube' | 'direct' | string;
  duration_minutes?: number;
  duration_seconds?: number;
  watched_seconds?: number;
  is_completed?: boolean;
  completed?: boolean;
  prev_lesson_id?: number | null;
  next_lesson_id?: number | null;
  pdf_url?: string;
  attachments?: LessonAttachment[];
  comments?: LessonComment[];
}

export interface LiveClassItem {
  id: number | string;
  course_id?: number;
  course_slug?: string;
  course_title: string;
  title: string;
  description?: string;
  instructor_name?: string;
  instructor_avatar?: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  join_url?: string;
  platform?: 'zoom' | 'google_meet' | 'teams' | 'live' | string;
  is_live_now?: boolean;
  status: 'upcoming' | 'live' | 'completed';
}

export interface SupportTicket {
  id: number | string;
  ticket_number?: string;
  subject: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  message: string;
  created_at: string;
  updated_at?: string;
  replies?: SupportTicketReply[];
}

export interface SupportTicketReply {
  id: number | string;
  user_name: string;
  is_staff: boolean;
  message: string;
  created_at: string;
}

export interface LessonComment {
  id: number;
  user_name: string;
  user_avatar?: string;
  body: string;
  created_at: string;
  replies?: LessonComment[];
}

export interface ActivitySummary {
  id: number;
  type: 'quiz' | 'exam' | 'test' | 'project';
  title: string;
  passing_score?: number;
  max_attempts?: number;
  is_completed?: boolean;
}

export interface QuizQuestion {
  index?: number;
  prompt?: string;
  question?: string;
  options: Array<string | { text?: string; label?: string; option?: string }>;
}

export interface ActivityDetail {
  id: number;
  course_id?: number;
  type: 'quiz' | 'exam' | 'test' | 'project';
  title: string;
  instructions?: string;
  description?: string;
  passing_score?: number;
  max_attempts?: number | null;
  attempt_count?: number;
  attempts_count?: number;
  can_attempt?: boolean;
  questions?: QuizQuestion[];
  is_completed?: boolean;
  score?: number;
  passed?: boolean;
}

export interface CertificateItem {
  id: number;
  course_id: number;
  course_title: string;
  certificate_number: string;
  issued_at: string;
  download_url?: string;
  verify_url?: string;
}

export interface DashboardSummary {
  enrolled_courses: CourseCatalogItem[];
  certificates: CertificateItem[];
  pending_checkpoints: ActivitySummary[];
  streak_summary: {
    streak_days: number;
    active_dates: string[];
  };
}

export interface CourseReview {
  id: number;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code_svg: string;
}

export interface TwoFactorConfirmResponse {
  message: string;
  recovery_codes: string[];
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  phone_country?: string | null;
  marketing_opt_in?: boolean;
  email?: string;
  locale?: 'en' | 'it' | 'bn' | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}
