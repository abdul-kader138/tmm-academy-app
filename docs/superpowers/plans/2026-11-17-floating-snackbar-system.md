# Floating Snackbar & Toast System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace outdated blocking Android native `Alert.alert` dialogs with a modern, smooth, non-intrusive Bottom Floating Snackbar across the TMM Academy app.

**Architecture:** Create a centralized `ToastContext` and animated `FloatingSnackbar` component that manages queue-safe toast notifications with auto-dismissal, swipe-to-dismiss, color-coded themes (error, success, info, warning), and keyboard avoidance. Mount globally in `App.tsx` and integrate into user-facing screens.

**Tech Stack:** React Native (Animated, Easing, Keyboard, PanResponder), TypeScript, Expo Safe Area Context, Ionicons.

---

## Global Constraints

- Must be completely non-blocking: user can still interact with forms/inputs while the toast is visible.
- Must respect virtual keyboard: when keyboard is open, the snackbar sits above the keyboard rather than being obscured.
- Auto-dismisses in 3000ms by default, with instant swipe-down or tap-to-dismiss.
- Keep destructive confirmation dialogs (e.g. Sign Out confirmation, Account Deletion confirmation, Quiz Submit confirmation) as intentional modal dialogues.
- Zero TypeScript errors (`npx tsc --noEmit` must pass cleanly).

---

## Review Focus

1. **Virtual Keyboard Interaction:** Toast does not get hidden underneath soft keyboard when typing password/email.
2. **Safe Area Insets:** Toast does not overlap home indicator / navigation bar on diverse Android devices.
3. **Rapid Toast Triggers:** Calling `showToast` multiple times does not flicker or break animations; it smoothly updates or queues.
4. **Swipe to Dismiss:** User can flick the snackbar down to immediately dismiss it.
5. **Accessibility / Readability:** Text contrast meets WCAG standards with high legibility.

---

### Task 1: Create `FloatingSnackbar` & `ToastContext`

**Files:**
- Create: `src/components/FloatingSnackbar.tsx`
- Create: `src/context/ToastContext.tsx`

- [ ] Define `ToastType`: `'error' | 'success' | 'info' | 'warning'`.
- [ ] Implement `FloatingSnackbar` with animated slide-up, fade-in, and pan responder for swipe-down dismissal.
- [ ] Connect `Keyboard` listeners to adjust vertical offset dynamically when keyboard shows/hides.
- [ ] Implement `ToastContext`, `useToast()` hook, and global singleton `Toast.show(...)`.
- [ ] Verify TypeScript types compile cleanly.

---

### Task 2: Mount `ToastProvider` in Root `App.tsx`

**Files:**
- Modify: `App.tsx`

- [ ] Import `ToastProvider` from `./src/context/ToastContext`.
- [ ] Wrap `MainApp` inside `<ToastProvider>`.
- [ ] Verify app starts without context errors.

---

### Task 3: Migrate Auth & Account Screens

**Files:**
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/AccountSecurityScreen.tsx`
- Modify: `src/screens/EditProfileScreen.tsx`
- Modify: `src/screens/TwoFactorScreen.tsx`

- [ ] In `LoginScreen.tsx`: Replace form validation `Alert.alert` (name, email, password length, password mismatch) and API login/register errors with `showError` / `showSuccess`.
- [ ] In `AccountSecurityScreen.tsx`: Replace password validation and success/failure alerts with `showError` / `showSuccess`. Preserve account delete confirmation dialog.
- [ ] In `EditProfileScreen.tsx`: Replace photo upload errors and profile update alerts with `showError` / `showSuccess`.
- [ ] In `TwoFactorScreen.tsx`: Replace 2FA code verification and regeneration alerts with `showError` / `showSuccess`.

---

### Task 4: Migrate Course & Activity Screens

**Files:**
- Modify: `src/screens/CourseDetailScreen.tsx`
- Modify: `src/screens/SupportTicketScreen.tsx`
- Modify: `src/screens/QuizScreen.tsx`
- Modify: `src/screens/CertificatesScreen.tsx`

- [ ] In `CourseDetailScreen.tsx`: Replace live session notices and enrollment alerts with `showInfo` / `showError`.
- [ ] In `SupportTicketScreen.tsx`: Replace subject/message required and ticket submission alerts with `showError` / `showSuccess`.
- [ ] In `QuizScreen.tsx`: Replace validation alerts with `showError`. Preserve quiz submission confirmation modal.
- [ ] In `CertificatesScreen.tsx`: Replace download errors and success alerts with `showSuccess` / `showError`.

---

### Task 5: Verification & Quality Assurance

- [ ] Run `npx tsc --noEmit` to verify 0 errors.
- [ ] Test snackbar animations, color styles, and keyboard handling.
- [ ] Commit all changes to `development` branch.
