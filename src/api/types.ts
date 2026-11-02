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
}

export interface CourseDetail extends CourseCatalogItem {
  sections: CourseSection[];
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
  slug: string;
  title: string;
  duration_seconds: number;
  is_completed: boolean;
  order: number;
}

export interface LessonDetail {
  id: number;
  slug: string;
  title: string;
  video_url: string;
  duration_seconds: number;
  watched_seconds: number;
  completed: boolean;
  description?: string;
  comments: LessonComment[];
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

export interface CertificateItem {
  id: number;
  course_id: number;
  course_title: string;
  certificate_number: string;
  issued_at: string;
  download_url?: string;
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
