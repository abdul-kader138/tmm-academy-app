# TMM Academy LMS API — Complete & Exhaustive Analysis

**API Base URL:** `https://academy.tmminnovation.com`  
**API Specification Source:** `https://academy.tmminnovation.com/api/documentation` (`/docs?api-docs.json`)  
**API Version:** `1.0.0` (OpenAPI 3.0.0)  
**Total Endpoints:** **34 Endpoints** across 3 core modules:
1. **Auth (10 endpoints)**
2. **Learner (13 endpoints)**
3. **Account & Profile (11 endpoints)**

---

## 1. Authentication & Security Architecture

The TMM Academy LMS backend uses Laravel Sanctum with flexible multi-platform security:

### A. Authentication Schemes
1. **`sanctumToken` (Bearer Token):**
   * Primary method for Mobile apps (React Native / iOS / Android).
   * After `POST /api/v1/auth/login` or `POST /api/v1/auth/google`, the response returns a `token`.
   * Stored securely and sent in every subsequent request header:
     ```http
     Authorization: Bearer <sanctum_token>
     ```
   * **No CSRF token required** when using Bearer token authentication.

2. **`sanctumSession` (Cookie-based session):**
   * Primary method for Web SPAs.
   * Calls `GET /sanctum/csrf-cookie` first, then sends `POST /api/v1/auth/login`.
   * Browser stores `laravel_session` cookie automatically.
   * Accompanied by `X-XSRF-TOKEN` header on all non-GET requests (`POST`, `PUT`, `DELETE`).

### B. Cloudflare Turnstile Captcha Integration
* **`GET /api/v1/auth/meta`** returns:
  ```json
  {
    "captcha_required": true,
    "site_key": "0x4AAAAAAFvtXYK6t3ioqq0r"
  }
  ```
* Before login or registration, the client queries `/auth/meta`. If `captcha_required: true`, the client must solve the Turnstile challenge and pass `cf_turnstile_response`.
* **Native App Support:** `GET /api/v1/auth/challenge-view` provides an HTML page designed for a React Native `<WebView />`. It posts `{ "token": "..." }` to `window.ReactNativeWebView`.

### C. Single Device Locking (`device_id` / `device_name`)
* In `POST /api/v1/auth/login` and `POST /api/v1/auth/google`, native mobile apps send `device_id` (e.g. `ANDROID_ID` or iOS `identifierForVendor`) and `device_name` (e.g. "iPhone 15 Pro", "Samsung S24").
* An account can be locked to one physical device. If another device attempts to log in, the API returns `422 Unprocessable Entity` ("account is locked to a different device"). Logging out (`POST /auth/logout`) or an admin reset clears this lock.

---

## 2. All 34 Endpoints Exhaustive Breakdown

### Module 1: Auth (10 Endpoints)

| # | Method | Path | Auth Required | Description & Details |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/auth/meta` | **Public** | Returns `{ captcha_required: boolean, site_key: string \| null }`. Must be checked before Login & Register. |
| 2 | `GET` | `/api/v1/auth/challenge-view` | **Public** | Hosted Turnstile challenge HTML page for Native App WebViews. Communicates via postMessage. |
| 3 | `POST` | `/api/v1/auth/register` | **Public** (CSRF if web) | Registers a new learner account. Sends an email verification link. Does **not** auto-login (unverified accounts cannot hold a session).<br>**Body:** `first_name`, `last_name`, `email`, `phone` (optional), `phone_country` (optional ISO, e.g. "IT"), `password`, `password_confirmation`, `marketing_opt_in` (boolean), `cf_turnstile_response` (optional/required if meta says so). |
| 4 | `POST` | `/api/v1/auth/login` | **Public** (CSRF if web) | Authenticates customer with email & password.<br>**Body:** `email`, `password`, `cf_turnstile_response`, `remember` (boolean), `device_id`, `device_name`.<br>**Responses:**<br>• `200 OK`: Full `Customer` object with `token` **OR** `{ two_factor_required: true, challenge_token: "..." }`<br>• `403 Forbidden`: Email not verified yet.<br>• `422`: Invalid credentials or account locked to a different device. |
| 5 | `POST` | `/api/v1/auth/login/challenge` | **Public** (CSRF if web) | 2nd step when login returns `two_factor_required: true`.<br>**Body:** `challenge_token` (string), `code` (string - 6-digit TOTP or backup recovery code).<br>**Response:** `200 OK` with full `Customer` object + `token`. |
| 6 | `POST` | `/api/v1/auth/google` | **Public** (CSRF if web) | Native Google Sign-In.<br>**Body:** `access_token` (from Google Sign-In SDK, NOT id_token), `remember`, `device_id`, `device_name`.<br>**Response:** `200 OK` with full `Customer` object + `token`. |
| 7 | `POST` | `/api/v1/auth/logout` | **Auth (Sanctum)** | Ends session, revokes bearer token, and clears the bound device lock. |
| 8 | `POST` | `/api/v1/auth/email/verification-notification` | **Auth (Sanctum)** | Resends email verification link to customer's email. |
| 9 | `POST` | `/api/v1/auth/forgot-password` | **Public** | Requests a password reset link email.<br>**Body:** `email` (string). |
| 10 | `POST` | `/api/v1/auth/reset-password` | **Public** | Resets password with token received via email.<br>**Body:** `token`, `email`, `password`, `password_confirmation`. |

---

### Module 2: Learner & Courses (13 Endpoints)

| # | Method | Path | Auth Required | Description & Details |
|---|---|---|---|---|
| 11 | `GET` | `/api/v1/dashboard` | **Auth (Sanctum)** | Main learner hub: Enrolled courses with progress percentage, earned certificates, pending checkpoints (quizzes/exams/projects outstanding), and 7-day learning-streak summary. |
| 12 | `GET` | `/api/v1/courses` | **Public** | Published course catalog. Works unauthenticated (when not logged in, `is_enrolled: false`, `progress_percent: null`).<br>**Returns:** Array of courses with `id`, `slug`, `title`, `description`, `eyebrow`, `cover_image_url`, `duration_minutes`, `lessons_count`, `is_enrolled`, `progress_percent`. |
| 13 | `GET` | `/api/v1/courses/{course}` | **Auth (Sanctum)** | Full course syllabus & content. Matched by course `{course}` slug (e.g. `boc-12-bijnes-oprcuniti-kors`). Guarded by active enrollment.<br>**Returns:** Sections, lessons, activities, reviews, instructor information. |
| 14 | `GET` | `/api/v1/courses/{course}/lessons/{lesson}` | **Auth (Sanctum)** | Individual lesson player view: video stream/URL, transcript/content, watch progress, and lesson discussion comments. |
| 15 | `POST` | `/api/v1/courses/{course}/lessons/{lesson}/progress` | **Auth (Sanctum)** | Heartbeat tracking sent periodically while the player plays.<br>**Body:** `{ "watched_seconds": number }`.<br>**Rule:** Automatically marks lesson complete once 90% runtime is watched. |
| 16 | `POST` | `/api/v1/courses/{course}/lessons/{lesson}/complete` | **Auth (Sanctum)** | Manually mark lesson complete. Issues course certificate if this is the final requirement. |
| 17 | `POST` | `/api/v1/courses/{course}/lessons/{lesson}/comments` | **Auth (Sanctum)** | Post comment or reply on lesson discussion.<br>**Body:** `body` (string), `parent_id` (optional integer for nested reply). |
| 18 | `GET` | `/api/v1/courses/{course}/activities/{activity}` | **Auth (Sanctum)** | Fetch checkpoint: Quiz, Exam, Test, or Project. Note: questions do not expose correct answers. |
| 19 | `POST` | `/api/v1/courses/{course}/activities/{activity}/test` | **Auth (Sanctum)** | Submit answers for quiz/exam/test.<br>**Body:** `{ "answers": { "0": 1, "1": 3, ... } }` (zero-based question index => zero-based chosen option index).<br>**Rule:** Auto-grades immediately against `passing_score`. Admin approval can follow for certificate granting. |
| 20 | `POST` | `/api/v1/courses/{course}/activities/{activity}/project` | **Auth (Sanctum)** | Submit / resubmit a project deliverable (`multipart/form-data`).<br>**Fields:** `file` (binary: PDF, Word `.doc`/`.docx`, or ZIP - max 10MB), `note` (optional string). |
| 21 | `POST` | `/api/v1/courses/{course}/review` | **Auth (Sanctum)** | Submit or edit course rating & review.<br>**Body:** `{ "rating": number (1-5), "comment": string \| null }`. |
| 22 | `GET` | `/api/v1/certificates` | **Auth (Sanctum)** | Lists all certificates earned by the current learner across completed courses. |
| 23 | `GET` | `/api/v1/certificates/{certificate}/download` | **Auth (Sanctum)** | Downloads certificate PDF file for the authenticated learner. |

---

### Module 3: Account & Security (11 Endpoints)

| # | Method | Path | Auth Required | Description & Details |
|---|---|---|---|---|
| 24 | `GET` | `/api/v1/account` | **Auth (Sanctum)** | Get authenticated customer profile (`Customer` schema). |
| 25 | `PUT` | `/api/v1/account` | **Auth (Sanctum)** | Update profile.<br>**Body:** `first_name`, `last_name`, `phone`, `phone_country` (ISO, e.g. "IT"), `marketing_opt_in`, `email`, `locale` (enum: `en`, `it`, `bn`).<br>*Note: Changing email resets verification status.* |
| 26 | `POST` | `/api/v1/account/avatar` | **Auth (Sanctum)** | Upload/replace profile photo (`multipart/form-data`).<br>**Field:** `avatar` (JPG, PNG, WEBP up to 5MB). Old file is deleted automatically. |
| 27 | `DELETE` | `/api/v1/account/avatar` | **Auth (Sanctum)** | Delete custom avatar, reverting to initial placeholder. |
| 28 | `PUT` | `/api/v1/account/password` | **Auth (Sanctum)** | Change password.<br>**Body:** `current_password`, `password`, `password_confirmation`. |
| 29 | `POST` | `/api/v1/account/two-factor/setup` | **Auth (Sanctum)** | Initiate 2FA: generates secret key and QR code (not yet activated until confirmed). |
| 30 | `POST` | `/api/v1/account/two-factor/confirm` | **Auth (Sanctum)** | Confirm 2FA activation.<br>**Body:** `secret` (string), `code` (string - 6 digits).<br>**Response:** Activates 2FA and returns one-time backup recovery codes. |
| 31 | `POST` | `/api/v1/account/two-factor/recovery-codes` | **Auth (Sanctum)** | Regenerate 2FA recovery codes.<br>**Body:** `password` (string). Invalidates all previous codes. |
| 32 | `DELETE` | `/api/v1/account/two-factor` | **Auth (Sanctum)** | Disable 2FA on account.<br>**Body:** `password` (string). |
| 33 | `GET` | `/api/v1/account/export` | **Auth (Sanctum)** | GDPR compliance: Exports all personal data and LMS course history as downloadable JSON/archive. |
| 34 | `DELETE` | `/api/v1/account` | **Auth (Sanctum)** | Delete/anonymize user account.<br>**Body:** `password` (string). Anonymizes record and ends session. |

---

## 3. Core Data Schemas & Types

### 1. `Customer` Object (User Profile)
```typescript
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
  token?: string | null; // Sanctum bearer token returned on login
}
```

### 2. `CourseCatalogItem`
```typescript
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
```

### 3. `DashboardSummary`
```typescript
export interface DashboardSummary {
  enrolled_courses: CourseCatalogItem[];
  certificates: CertificateItem[];
  pending_checkpoints: ActivityCheckpoint[];
  streak_summary: {
    streak_days: number;
    active_dates: string[];
  };
}
```

### 4. `LessonDetail`
```typescript
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
```

### 5. `ActivityTestSubmission`
```typescript
export interface ActivityTestSubmission {
  // Zero-based question index => Zero-based chosen option index
  answers: Record<string, number>;
}
```

---

## 4. Architectural Highlights & Key Implementation Rules

1. **Locale Support (`locale: 'en' | 'it' | 'bn'`):**
   * The API explicitly defines 3 supported locales: **English (`en`)**, **Italian (`it`)**, and **Bengali (`bn`)**!
   * This matches TMM's target audience (Italo-Bangla community).

2. **Progress Auto-Completion:**
   * Video progress sends `POST .../lessons/{lesson}/progress` with `{ watched_seconds }`.
   * When `watched_seconds / total_duration >= 0.90`, the backend automatically marks the lesson as complete!

3. **Auto-Certificate Issuance:**
   * Marking the last lesson or activity complete automatically triggers certificate generation, which can then be listed at `GET /api/v1/certificates` and downloaded as a PDF via `GET /api/v1/certificates/{id}/download`.

4. **Multi-Step 2FA & Turnstile Workflow:**
   * Both Login and Register integrate seamlessly with Cloudflare Turnstile (`cf_turnstile_response`).
   * When 2FA is active, login returns `challenge_token`, followed by verification at `POST /auth/login/challenge`.
