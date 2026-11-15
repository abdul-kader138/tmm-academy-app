# Enhanced Player Controls & Fullscreen Gestures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide students with a professional video player experience across Vimeo, YouTube, and direct video, including rich native player features, a unified quick-action control bar (`-10s`, `Play/Pause`, `+10s`, `Speed 0.75x-2x`, `Fullscreen`), and fullscreen swipe gestures for left-side brightness and right-side volume.

---

### Task 1: Universal Video HTML Player Bridge (`generateVideoHtml`)
- [ ] Support Vimeo, YouTube, and HTML5 video with full controls (`controls=1&speed=1&pip=1&playsinline=1`).
- [ ] Add bidirectional message bridge for `seek`, `setSpeed`, `setVolume`, `togglePlay`.
- [ ] Support web and native WebView seamlessly.

### Task 2: React Native Quick-Action Control Bar
- [ ] Add `-10s`, `Play/Pause`, `+10s`, `Speed (1x/1.25x/1.5x/2x/0.75x)`, and `Fullscreen` buttons below the player.
- [ ] Connect buttons to `webViewRef.current?.injectJavaScript` with universal command dispatch.

### Task 3: Fullscreen Mode with Left Brightness & Right Volume Gestures
- [ ] Implement Fullscreen Modal supporting landscape rotation and exit button.
- [ ] Integrate React Native `PanResponder` on video area:
  - Left half vertical drag: Brightness adjustment (0% - 100%) with dark filter overlay & HUD.
  - Right half vertical drag: Volume adjustment (0% - 100%) sending `setVolume` to player & HUD.
  - Floating HUD cards with icon and progress bars that auto-fade on gesture end.

### Task 4: Verification & Git Commit
- [ ] Verify TypeScript (`npx tsc --noEmit`).
- [ ] Push to `origin/development`.
