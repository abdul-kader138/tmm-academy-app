import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Linking,
  PanResponder,
  Dimensions,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import * as Brightness from 'expo-brightness';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi, API_BASE_URL } from '../api/lmsApi';
import { LessonDetail, CourseDetail, LessonAttachment } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { cleanHtml } from '../utils/text';

// Safe volume manager resolver for standalone Android APK & graceful fallback in Expo Go
let VolumeManager: any = null;
try {
  VolumeManager = require('react-native-volume-manager')?.VolumeManager;
} catch {
  VolumeManager = null;
}

interface ParsedVideo {
  type: 'youtube' | 'vimeo' | 'direct' | 'embed' | 'none';
  embedUrl: string | null;
  externalUrl: string | null;
  youtubeId?: string;
  vimeoId?: string;
  vimeoHash?: string;
  isIframeCode?: boolean;
}

function parseVideo(
  videoUrl?: string | null,
  youtubeIdProp?: string | null,
  vimeoIdProp?: string | number | null
): ParsedVideo {
  // 1. Explicit YouTube ID prop
  const ytProp = (youtubeIdProp || '').trim();
  if (ytProp && /^[a-zA-Z0-9_-]{11}$/.test(ytProp)) {
    return {
      type: 'youtube',
      youtubeId: ytProp,
      embedUrl: `https://www.youtube.com/embed/${ytProp}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=https://academy.tmminnovation.com`,
      externalUrl: `https://www.youtube.com/watch?v=${ytProp}`,
    };
  }

  // 2. Explicit Vimeo ID prop
  const vmProp = String(vimeoIdProp || '').trim();
  if (vmProp && /^\d+$/.test(vmProp)) {
    const embedUrl =
      videoUrl && videoUrl.includes('player.vimeo.com')
        ? videoUrl
        : `https://player.vimeo.com/video/${vmProp}?autoplay=1&title=0&byline=0&portrait=0&transparent=0`;
    return {
      type: 'vimeo',
      vimeoId: vmProp,
      embedUrl,
      externalUrl: `https://vimeo.com/${vmProp}`,
    };
  }

  if (!videoUrl || typeof videoUrl !== 'string') {
    return { type: 'none', embedUrl: null, externalUrl: null };
  }

  const trimmed = videoUrl.trim();
  if (!trimmed) {
    return { type: 'none', embedUrl: null, externalUrl: null };
  }

  // If input is an iframe code
  if (trimmed.startsWith('<iframe') && trimmed.includes('src=')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return parseVideo(srcMatch[1]);
    }
    return {
      type: 'embed',
      embedUrl: null,
      externalUrl: null,
      isIframeCode: true,
    };
  }

  // Check YouTube patterns:
  // - youtube.com/watch?v=ID
  // - youtu.be/ID
  // - youtube.com/embed/ID
  // - youtube-nocookie.com/embed/ID
  // - youtube.com/shorts/ID
  const ytMatch = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([^"&?\/\s]{11})/i.exec(trimmed);
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      youtubeId: id,
      embedUrl: `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=https://academy.tmminnovation.com`,
      externalUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      type: 'youtube',
      youtubeId: trimmed,
      embedUrl: `https://www.youtube.com/embed/${trimmed}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=https://academy.tmminnovation.com`,
      externalUrl: `https://www.youtube.com/watch?v=${trimmed}`,
    };
  }

  // Check Vimeo patterns:
  // - vimeo.com/123456789
  // - vimeo.com/123456789/abcdef123 (unlisted)
  // - vimeo.com/manage/videos/123456789
  // - player.vimeo.com/video/123456789?h=abcdef123
  const vimeoMatch = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+)\/video\/|video\/|manage\/videos\/)?|player\.vimeo\.com\/video\/)(\d+)(?:\/([a-zA-Z0-9]+))?(?:\?.*h=([a-zA-Z0-9]+))?/i.exec(trimmed);
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    const hash = vimeoMatch[2] || vimeoMatch[3] || null;
    const hashQuery = hash ? `h=${hash}&` : '';
    return {
      type: 'vimeo',
      vimeoId: id,
      vimeoHash: hash || undefined,
      embedUrl: `https://player.vimeo.com/video/${id}?${hashQuery}autoplay=1&title=0&byline=0&portrait=0&transparent=0`,
      externalUrl: hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`,
    };
  }
  if (/^\d+$/.test(trimmed)) {
    return {
      type: 'vimeo',
      vimeoId: trimmed,
      embedUrl: `https://player.vimeo.com/video/${trimmed}?autoplay=1&title=0&byline=0&portrait=0&transparent=0`,
      externalUrl: `https://vimeo.com/${trimmed}`,
    };
  }

  // Check Direct Video file or relative URL:
  const isDirectFile = /\.(mp4|m3u8|webm|mov|ogg)(\?.*)?$/i.test(trimmed);
  const isRelative = trimmed.startsWith('/') || trimmed.startsWith('storage/');

  if (isDirectFile || isRelative) {
    let fullUrl = trimmed;
    if (isRelative) {
      fullUrl = `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    }
    return {
      type: 'direct',
      embedUrl: fullUrl,
      externalUrl: fullUrl,
    };
  }

  // Generic embed URL (Bunny, Wistia, Drive, or HTTPS iframe URL)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      type: 'embed',
      embedUrl: trimmed,
      externalUrl: trimmed,
    };
  }

  return { type: 'none', embedUrl: null, externalUrl: null };
}

function generateVideoHtml(parsed: ParsedVideo, rawCode?: string | null): string | null {
  if (parsed.type === 'youtube' && parsed.embedUrl) {
    const embedUrl = parsed.embedUrl.includes('enablejsapi=1')
      ? parsed.embedUrl
      : `${parsed.embedUrl}${parsed.embedUrl.includes('?') ? '&' : '?'}enablejsapi=1&playsinline=1&controls=1&modestbranding=1`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="referrer" content="always">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-tap-highlight-color: transparent !important;
            }
            body, html { width: 100vw; height: 100vh; min-height: 100vh; background: #000000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .player-wrap { position: relative; width: 100vw; height: 100vh; }
            iframe { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; border: 0; }
          </style>
          <script src="https://www.youtube.com/iframe_api"></script>
        </head>
        <body oncontextmenu="return false;">
          <div class="player-wrap">
            <iframe
              id="player_yt"
              src="${embedUrl}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowfullscreen
            ></iframe>
          </div>
          <script>
            window.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);

            var ytPlayer;
            function onYouTubeIframeAPIReady() {
              ytPlayer = new YT.Player('player_yt', {
                events: {
                  'onReady': function() {}
                }
              });
            }

            window.handlePlayerCommand = function(cmd) {
              if (!ytPlayer) return;
              try {
                if (cmd.action === 'seek') {
                  var cur = (ytPlayer.getCurrentTime && typeof ytPlayer.getCurrentTime === 'function') ? ytPlayer.getCurrentTime() : 0;
                  ytPlayer.seekTo(Math.max(0, cur + cmd.offset), true);
                } else if (cmd.action === 'setSpeed') {
                  if (ytPlayer.setPlaybackRate) ytPlayer.setPlaybackRate(cmd.speed);
                } else if (cmd.action === 'setVolume') {
                  if (ytPlayer.setVolume) ytPlayer.setVolume(Math.round(cmd.volume * 100));
                  if (cmd.volume === 0) { if (ytPlayer.mute) ytPlayer.mute(); }
                  else { if (ytPlayer.unMute) ytPlayer.unMute(); }
                } else if (cmd.action === 'play') {
                  if (ytPlayer.playVideo) ytPlayer.playVideo();
                } else if (cmd.action === 'pause') {
                  if (ytPlayer.pauseVideo) ytPlayer.pauseVideo();
                } else if (cmd.action === 'togglePlay') {
                  var state = (ytPlayer.getPlayerState && typeof ytPlayer.getPlayerState === 'function') ? ytPlayer.getPlayerState() : 1;
                  if (state === 1) ytPlayer.pauseVideo();
                  else ytPlayer.playVideo();
                }
              } catch(e) {}
            };
            document.addEventListener('message', function(e) {
              try { window.handlePlayerCommand(JSON.parse(e.data)); } catch(err){}
            });
            window.addEventListener('message', function(e) {
              try { window.handlePlayerCommand(JSON.parse(e.data)); } catch(err){}
            });
          </script>
        </body>
      </html>
    `;
  }

  if (parsed.type === 'vimeo' && parsed.embedUrl) {
    const embedUrl = parsed.embedUrl.includes('controls=')
      ? parsed.embedUrl.replace(/controls=0/, 'controls=1')
      : `${parsed.embedUrl}${parsed.embedUrl.includes('?') ? '&' : '?'}controls=1&speed=1&pip=1&playsinline=1&transparent=0&dnt=1`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="referrer" content="always">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-tap-highlight-color: transparent !important;
            }
            body, html { width: 100vw; height: 100vh; min-height: 100vh; background: #0F172A; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .player-wrap { position: relative; width: 100vw; height: 100vh; }
            iframe { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; border: 0; }
          </style>
          <script src="https://player.vimeo.com/api/player.js"></script>
        </head>
        <body oncontextmenu="return false;">
          <div class="player-wrap">
            <iframe
              id="player_vimeo"
              src="${embedUrl}"
              frameborder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          <script>
            window.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);

            var vimeoPlayer;
            try {
              vimeoPlayer = new Vimeo.Player('player_vimeo');
            } catch(e) {}

            window.handlePlayerCommand = function(cmd) {
              if (!vimeoPlayer) return;
              try {
                if (cmd.action === 'seek') {
                  vimeoPlayer.getCurrentTime().then(function(t) {
                    vimeoPlayer.setCurrentTime(Math.max(0, t + cmd.offset));
                  });
                } else if (cmd.action === 'setSpeed') {
                  vimeoPlayer.setPlaybackRate(cmd.speed);
                } else if (cmd.action === 'setVolume') {
                  var vol = Math.max(0, Math.min(1, cmd.volume));
                  vimeoPlayer.setVolume(vol).catch(function(){});
                  if (vol === 0) {
                    vimeoPlayer.setMuted(true).catch(function(){});
                  } else {
                    vimeoPlayer.setMuted(false).catch(function(){});
                  }
                } else if (cmd.action === 'play') {
                  vimeoPlayer.play();
                } else if (cmd.action === 'pause') {
                  vimeoPlayer.pause();
                } else if (cmd.action === 'togglePlay') {
                  vimeoPlayer.getPaused().then(function(paused) {
                    if (paused) vimeoPlayer.play();
                    else vimeoPlayer.pause();
                  });
                }
              } catch(e) {}
            };
            document.addEventListener('message', function(e) {
              try { window.handlePlayerCommand(JSON.parse(e.data)); } catch(err){}
            });
            window.addEventListener('message', function(e) {
              try { window.handlePlayerCommand(JSON.parse(e.data)); } catch(err){}
            });
          </script>
        </body>
      </html>
    `;
  }

  if (parsed.type === 'direct' && parsed.embedUrl) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-tap-highlight-color: transparent !important;
            }
            body, html { width: 100vw; height: 100vh; min-height: 100vh; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            video { width: 100vw; height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body oncontextmenu="return false;">
          <video
            id="player_direct"
            src="${parsed.embedUrl}"
            controls
            autoplay
            playsinline
            webkit-playsinline
            preload="auto"
            oncontextmenu="return false;"
          ></video>
          <script>
            window.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);

            var videoEl = document.getElementById('player_direct');
            window.handlePlayerCommand = function(cmd) {
              if (!videoEl) return;
              try {
                if (cmd.action === 'seek') {
                  videoEl.currentTime = Math.max(0, videoEl.currentTime + cmd.offset);
                } else if (cmd.action === 'setSpeed') {
                  videoEl.playbackRate = cmd.speed;
                } else if (cmd.action === 'setVolume') {
                  var vol = Math.max(0, Math.min(1, cmd.volume));
                  videoEl.volume = vol;
                  videoEl.muted = (vol === 0);
                } else if (cmd.action === 'play') {
                  videoEl.play();
                } else if (cmd.action === 'pause') {
                  videoEl.pause();
                } else if (cmd.action === 'togglePlay') {
                  if (videoEl.paused) videoEl.play();
                  else videoEl.pause();
                }
              } catch(e) {}
            };
            document.addEventListener('message', function(e) {
              try { window.handlePlayerCommand(JSON.parse(e.data)); } catch(err){}
            });
            window.addEventListener('message', function(e) {
              try { window.handlePlayerCommand(JSON.parse(e.data)); } catch(err){}
            });
          </script>
        </body>
      </html>
    `;
  }

  if (parsed.type === 'embed') {
    const content = parsed.isIframeCode && rawCode ? rawCode : `<iframe src="${parsed.embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="referrer" content="always">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-touch-callout: none !important;
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-tap-highlight-color: transparent !important;
            }
            body, html { width: 100vw; height: 100vh; min-height: 100vh; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            iframe { width: 100vw; height: 100vh; border: 0; }
          </style>
        </head>
        <body oncontextmenu="return false;">
          ${content}
          <script>
            window.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);
          </script>
        </body>
      </html>
    `;
  }

  return null;
}

export const LessonPlayerScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { courseSlug, lessonId: initialLessonId, courseTitle: initialTitle } = route.params || {};

  const [currentLessonId, setCurrentLessonId] = useState<number | string>(initialLessonId);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // --- Universal Player State & Gestures ---
  const webViewRef = useRef<any>(null);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gesture Brightness (0.05 to 1.0) & Volume (0.0 to 1.0)
  const [brightness, setBrightness] = useState(0.7);
  const [volume, setVolume] = useState(0.7);
  const [hudState, setHudState] = useState<{ type: 'brightness' | 'volume' | null; value: number }>({
    type: null,
    value: 0.7,
  });
  const hudTimerRef = useRef<any>(null);

  const dragStartBrightnessRef = useRef(0.7);
  const dragStartVolumeRef = useRef(0.7);
  const dragSideRef = useRef<'left' | 'right'>('left');
  const containerDimensionsRef = useRef({
    width: Dimensions.get('window').width,
    height: 240,
  });

  const sendPlayerCommand = useCallback((cmd: { action: string; [key: string]: any }) => {
    const code = `if (window.handlePlayerCommand) { window.handlePlayerCommand(${JSON.stringify(cmd)}); } true;`;
    webViewRef.current?.injectJavaScript(code);
  }, []);

  const handleSeek = useCallback(
    (offset: number) => {
      sendPlayerCommand({ action: 'seek', offset });
    },
    [sendPlayerCommand]
  );

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    sendPlayerCommand({ action: 'togglePlay' });
  }, [sendPlayerCommand]);

  const speedCycle = [1.0, 1.25, 1.5, 2.0, 0.75];
  const handleCycleSpeed = useCallback(() => {
    const nextIndex = (speedCycle.indexOf(currentSpeed) + 1) % speedCycle.length;
    const nextSpeed = speedCycle[nextIndex];
    setCurrentSpeed(nextSpeed);
    sendPlayerCommand({ action: 'setSpeed', speed: nextSpeed });
  }, [currentSpeed, sendPlayerCommand]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => isFullscreen && Math.abs(gestureState.dy) > 8,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => isFullscreen && Math.abs(gestureState.dy) > 8,
      onPanResponderGrant: (evt) => {
        const { locationX } = evt.nativeEvent;
        const width = containerDimensionsRef.current.width || Dimensions.get('window').width;
        dragSideRef.current = locationX < width / 2 ? 'left' : 'right';
        dragStartBrightnessRef.current = brightness;
        dragStartVolumeRef.current = volume;

        if (hudTimerRef.current) {
          clearTimeout(hudTimerRef.current);
          hudTimerRef.current = null;
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const delta = -gestureState.dy / 180;
        if (dragSideRef.current === 'left') {
          const next = Math.min(1.0, Math.max(0.05, dragStartBrightnessRef.current + delta));
          setBrightness(next);
          setHudState({ type: 'brightness', value: next });
          Brightness.setBrightnessAsync(next).catch(() => {});
        } else {
          const next = Math.min(1.0, Math.max(0.0, dragStartVolumeRef.current + delta));
          setVolume(next);
          setHudState({ type: 'volume', value: next });
          if (VolumeManager?.setVolume) {
            VolumeManager.setVolume(next, { showUI: false }).catch(() => {});
          }
          sendPlayerCommand({ action: 'setVolume', volume: next });
        }
      },
      onPanResponderRelease: () => {
        if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        hudTimerRef.current = setTimeout(() => {
          setHudState({ type: null, value: 0 });
        }, 1200);
      },
    })
  ).current;

  // Screen Brightness & Volume Hardware Sync
  useEffect(() => {
    if (isFullscreen) {
      Brightness.getBrightnessAsync()
        .then((val) => {
          if (typeof val === 'number' && !isNaN(val)) {
            const safeB = Math.min(1.0, Math.max(0.05, val));
            setBrightness(safeB);
            dragStartBrightnessRef.current = safeB;
          }
        })
        .catch(() => {});

      if (VolumeManager?.getVolume) {
        VolumeManager.getVolume()
          .then((res: any) => {
            const v = typeof res === 'number' ? res : res?.volume;
            if (typeof v === 'number' && !isNaN(v)) {
              const safeV = Math.min(1.0, Math.max(0.0, v));
              setVolume(safeV);
              dragStartVolumeRef.current = safeV;
            }
          })
          .catch(() => {});
      }
    } else {
      Brightness.restoreSystemBrightnessAsync().catch(() => {});
    }
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      Brightness.restoreSystemBrightnessAsync().catch(() => {});
    };
  }, []);

  // Fullscreen header auto-hide (shows for 3.5s on entry or single tap, then hides)
  const [showFullscreenHeader, setShowFullscreenHeader] = useState(false);
  const headerTimerRef = useRef<any>(null);

  const triggerHeaderAutoHide = useCallback(() => {
    if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    headerTimerRef.current = setTimeout(() => {
      setShowFullscreenHeader(false);
    }, 3500);
  }, []);

  const handleToggleFullscreenHeader = useCallback(() => {
    setShowFullscreenHeader((prev) => {
      const next = !prev;
      if (next) {
        triggerHeaderAutoHide();
      } else if (headerTimerRef.current) {
        clearTimeout(headerTimerRef.current);
      }
      return next;
    });
  }, [triggerHeaderAutoHide]);

  useEffect(() => {
    if (isFullscreen) {
      setShowFullscreenHeader(true);
      triggerHeaderAutoHide();
    } else {
      setShowFullscreenHeader(false);
      if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    }
  }, [isFullscreen, triggerHeaderAutoHide]);

  // Android System Navigation Bar (immersive auto-hide in fullscreen, restore on exit/unmount)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync(isFullscreen ? 'hidden' : 'visible').catch(() => {});
    }
    return () => {
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    };
  }, [isFullscreen]);

  // Toggle fullscreen mode with screen orientation lock/unlock & Android nav bar sync
  const toggleFullscreen = useCallback(
    async (targetState?: boolean) => {
      const next = typeof targetState === 'boolean' ? targetState : !isFullscreen;
      setIsFullscreen(next);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync(next ? 'hidden' : 'visible').catch(() => {});
      }
      try {
        if (next) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          setTimeout(() => {
            ScreenOrientation.unlockAsync().catch(() => {});
          }, 600);
        }
      } catch (e) {
        console.warn('[ScreenOrientation toggle error]', e);
      }
    },
    [isFullscreen]
  );

  // Auto-rotate on phone tilt when device auto-rotate is ON
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});

    const orientationSub = ScreenOrientation.addOrientationChangeListener((evt) => {
      const o = evt.orientationInfo.orientation;
      if (
        o === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
      ) {
        setIsFullscreen(true);
      } else if (
        o === ScreenOrientation.Orientation.PORTRAIT_UP ||
        o === ScreenOrientation.Orientation.PORTRAIT_DOWN
      ) {
        setIsFullscreen(false);
      }
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(orientationSub);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    };
  }, []);

  // Hardware back button on Android: exit fullscreen first if active
  useEffect(() => {
    if (!isFullscreen) return;
    const backAction = () => {
      void toggleFullscreen(false);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isFullscreen, toggleFullscreen]);

  // Load course details
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (courseSlug) {
        const detail = await lmsApi.getCourseDetail(courseSlug);
        if (isMounted && detail) {
          setCourseDetail(detail);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [courseSlug]);

  // Load specific lesson
  const fetchLesson = useCallback(async (id: number | string) => {
    setLoadingLesson(true);
    setFetchError(null);
    setPlaybackError(null);
    try {
      const data = await lmsApi.getLesson(courseSlug, id);
	  console.log('LESSON RAW:', JSON.stringify(data, null, 2));
      if (!data) {
        if (!user) {
          setFetchError('Please sign in to access your course video lessons.');
        } else {
          setFetchError('Lesson content could not be loaded from the LMS server.');
        }
        setLesson(null);
        setComments([]);
      } else {
        setLesson(data);
        setIsCompleted(Boolean(data?.is_completed || data?.completed));
        setComments(Array.isArray((data as any)?.comments) ? (data as any).comments : []);
      }
    } catch (err: any) {
      setLesson(null);
      setComments([]);
      setFetchError(err.message || 'Could not load lesson.');
    } finally {
      setLoadingLesson(false);
    }
  }, [courseSlug, user]);

  const handlePostComment = async () => {
    const trimmed = newCommentText.trim();
    if (!trimmed || !courseSlug || !currentLessonId) return;

    setPostingComment(true);
    try {
      const res = await lmsApi.postLessonComment(courseSlug, currentLessonId, trimmed);
      if (res.success && res.data) {
        setComments((prev) => [res.data, ...prev]);
        setNewCommentText('');
      } else {
        Alert.alert('Notice', res.error || 'Could not post comment.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while posting your comment.');
    } finally {
      setPostingComment(false);
    }
  };

  useEffect(() => {
    if (currentLessonId) {
      void fetchLesson(currentLessonId);
    }
  }, [currentLessonId, fetchLesson]);

  // Handle Mark Complete
  const handleMarkComplete = async () => {
    if (!lesson?.id || isCompleted) return;
    setCompleting(true);
    try {
      const res = await lmsApi.markLessonComplete(courseSlug, lesson.id);
      if (res.error) {
        Alert.alert('Notice', res.error);
      } else {
        setIsCompleted(true);
        Alert.alert('Lesson Completed!', 'Great job making progress in this course.');
        if (courseSlug) {
          const updated = await lmsApi.getCourseDetail(courseSlug);
          if (updated) setCourseDetail(updated);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not mark lesson as complete.');
    } finally {
      setCompleting(false);
    }
  };

  // Handle downloading resource / PDF
  const handleDownloadAttachment = async (attachment: LessonAttachment, index: number) => {
    const attachId = attachment.id || `att_${index}`;
    setDownloadingAttachmentId(attachId);

    try {
      const token = user?.token || (await AsyncStorage.getItem('@tmm_academy_auth_token')) || '';
      const safeName = (attachment.title || `Resource_${index + 1}`)
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .toLowerCase();
      const hasExtension = safeName.includes('.');
      const filename = hasExtension ? safeName : `${safeName}.pdf`;
      const targetUri = `${FileSystem.documentDirectory}${filename}`;

      // Build target download URL
      let downloadUrl = attachment.url || attachment.file_url || '';
      if (!downloadUrl && attachment.id && lesson?.id && courseSlug) {
        downloadUrl = lmsApi.getAttachmentDownloadUrl(courseSlug, lesson.id, attachment.id);
      }

      if (!downloadUrl) {
        Alert.alert('Download Unavailable', 'No valid download link found for this resource.');
        return;
      }

      // Prepend base URL if relative
      if (downloadUrl.startsWith('/')) {
        downloadUrl = `${API_BASE_URL}${downloadUrl}`;
      }

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, targetUri, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf,application/octet-stream,*/*',
        },
      });

      if (downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            dialogTitle: `Open ${attachment.title || 'Course Resource'}`,
            UTI: filename.endsWith('.pdf') ? 'com.adobe.pdf' : undefined,
          });
        } else {
          Alert.alert('Downloaded', `Saved successfully to: ${downloadResult.uri}`);
        }
      } else {
        Alert.alert('Download Failed', `Server responded with status: ${downloadResult.status}`);
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Could not download course resource.');
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  // Find all lessons in order
  const allLessons: Array<{ id: number; title: string; duration_minutes?: number; is_completed?: boolean }> = [];
  courseDetail?.sections?.forEach((sec) => {
    sec.lessons?.forEach((l) => {
      allLessons.push(l);
    });
  });

  const currentIndex = allLessons.findIndex((l) => String(l.id) === String(currentLessonId));
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Video source detection: YouTube vs Vimeo vs Direct Video vs Cloud Embed
  const l = lesson as any;

  const provider = String(l?.video_provider || '').toLowerCase();
  const providerId = l?.video_id ? String(l.video_id) : null;

  const youtubeIdFromApi =
    l?.youtube_id || (provider === 'youtube' ? providerId : null);
  const vimeoIdFromApi =
    l?.vimeo_id || (provider === 'vimeo' ? providerId : null);

  const rawVideoUrl =
    l?.video_embed_url ||
    l?.video_url ||
    l?.video_link ||
    l?.video ||
    l?.embed_url ||
    l?.embed_code ||
    l?.stream_url ||
    null;

  const parsedVideo = parseVideo(rawVideoUrl, youtubeIdFromApi, vimeoIdFromApi);
  const videoEmbedHtml = generateVideoHtml(parsedVideo, rawVideoUrl);
  const videoSourceType = parsedVideo.type;

  // Collect resources & PDF attachments
  const attachmentsList: LessonAttachment[] = [];
  if (Array.isArray(lesson?.attachments) && lesson.attachments.length > 0) {
    attachmentsList.push(...lesson.attachments);
  }
  if (lesson?.pdf_url) {
    const exists = attachmentsList.some((a) => a.url === lesson.pdf_url || a.file_url === lesson.pdf_url);
    if (!exists) {
      attachmentsList.push({
        title: 'Lesson Guide & Reference PDF',
        url: lesson.pdf_url,
        type: 'pdf',
      });
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" animated hidden={isFullscreen} />
      {Platform.OS === 'android' && (
        <NavigationBar.NavigationBar hidden={isFullscreen} style={isFullscreen ? 'light' : 'dark'} />
      )}

      {/* Top Navbar */}
      {!isFullscreen && (
        <View
          style={[
            styles.navBar,
            {
              paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.navTitleContainer}>
            <Text style={styles.navCourseTitle} numberOfLines={1}>
              {courseDetail?.title || initialTitle || 'Classroom'}
            </Text>
            <Text style={styles.navLessonCounter}>
              {currentIndex >= 0 ? `Lesson ${currentIndex + 1} of ${allLessons.length}` : 'Lesson Player'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Video Container (Fixed 16:9 or Fullscreen) */}
      <View
        style={[
          styles.videoPlayerContainer,
          isFullscreen ? styles.fullscreenContainer : styles.portraitVideoRatio,
        ]}
        onLayout={(e) => {
          containerDimensionsRef.current = e.nativeEvent.layout;
        }}
        onTouchEnd={() => {
          if (isFullscreen && !hudState.type) {
            handleToggleFullscreenHeader();
          }
        }}
        {...panResponder.panHandlers}
      >
        {/* Fullscreen Top Header (Auto-hides after 3.5s or single tap) */}
        {isFullscreen && showFullscreenHeader && (
          <View style={styles.fullscreenHeaderRow}>
            <TouchableOpacity
              style={styles.fullscreenBackBtn}
              onPress={() => void toggleFullscreen(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.fullscreenLessonTitle} numberOfLines={1}>
              {lesson?.title || 'Lesson Video'}
            </Text>
            <View style={{ width: 38 }} />
          </View>
        )}

        {loadingLesson ? (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="large" color={Colors.signal} />
            <Text style={styles.loadingText}>Loading lesson video...</Text>
          </View>
        ) : playbackError ? (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle-outline" size={38} color="#F87171" />
            <Text style={styles.errorOverlayTitle}>Video Playback Notice</Text>
            <Text style={styles.errorOverlaySub}>
              {playbackError}. Tap Retry or watch directly via the external app link.
            </Text>
            <View style={styles.errorActionsRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setPlaybackError(null);
                  setRetryKey((k) => k + 1);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={14} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Retry Player</Text>
              </TouchableOpacity>
              {parsedVideo.externalUrl ? (
                <TouchableOpacity
                  style={styles.openExternalBtn}
                  onPress={() => void Linking.openURL(parsedVideo.externalUrl!)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={14} color={Colors.signal} />
                  <Text style={styles.openExternalBtnText}>
                    {parsedVideo.type === 'youtube'
                      ? 'Open in YouTube'
                      : parsedVideo.type === 'vimeo'
                      ? 'Open in Vimeo'
                      : 'Open Video'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : videoEmbedHtml ? (
          Platform.OS === 'web' ? (
            parsedVideo.type === 'direct' ? (
              <video
                src={parsedVideo.embedUrl || ''}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000000' } as any}
              />
            ) : (
              <iframe
                src={parsedVideo.embedUrl || rawVideoUrl || ''}
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000000' } as any}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            )
          ) : (
            <WebView
              ref={webViewRef}
              key={`video_${currentLessonId}_${retryKey}`}
              originWhitelist={['*']}
              source={{
                html: videoEmbedHtml,
                baseUrl: 'https://academy.tmminnovation.com',
              }}
              style={styles.webview}
              menuItems={[]}
              allowsFullscreenVideo
              javaScriptEnabled
              domStorageEnabled
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback
              mixedContentMode="always"
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
              javaScriptCanOpenWindowsAutomatically={false}
              userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
              onError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('[WebView Error]', nativeEvent);
                setPlaybackError(nativeEvent.description || 'Playback failed to load');
              }}
              onHttpError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                if (nativeEvent.statusCode >= 400) {
                  console.warn('[WebView HttpError]', nativeEvent.statusCode);
                  setPlaybackError(`HTTP Error (${nativeEvent.statusCode})`);
                }
              }}
            />
          )
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-off-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.noVideoTitle}>
              {fetchError || 'No Video Attached to this Lesson'}
            </Text>
            <Text style={styles.noVideoSubtitle}>
              {fetchError
                ? 'Please check your connection or sign in with your active student account.'
                : 'The instructor has not uploaded a video for this module yet.'}
            </Text>
            <View style={styles.noVideoActionsRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => void fetchLesson(currentLessonId)}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={14} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Reload Lesson</Text>
              </TouchableOpacity>
              {!user && (
                <TouchableOpacity
                  style={styles.signInBtn}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* In-Player Brightness Dimming Overlay */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: Math.max(0, Math.min(0.85, (1 - brightness) * 0.7)),
              zIndex: 10,
            },
          ]}
        />

        {/* Floating HUD Indicator (Brightness & Volume) */}
        {hudState.type && (
          <View pointerEvents="none" style={styles.hudOverlay}>
            <View style={styles.hudCard}>
              <Ionicons
                name={
                  hudState.type === 'brightness'
                    ? hudState.value > 0.5
                      ? 'sunny'
                      : 'sunny-outline'
                    : hudState.value === 0
                    ? 'volume-mute'
                    : hudState.value < 0.35
                    ? 'volume-low'
                    : hudState.value < 0.7
                    ? 'volume-medium'
                    : 'volume-high'
                }
                size={34}
                color={hudState.type === 'brightness' ? '#F59E0B' : '#38BDF8'}
              />
              <Text style={styles.hudText}>
                {hudState.type === 'brightness' ? 'Brightness' : 'Volume'}
              </Text>
              <View style={styles.hudProgressBarTrack}>
                <View
                  style={[
                    styles.hudProgressBarFill,
                    {
                      width: `${Math.round(hudState.value * 100)}%`,
                      backgroundColor: hudState.type === 'brightness' ? '#F59E0B' : '#38BDF8',
                    },
                  ]}
                />
              </View>
              <Text style={styles.hudPercentText}>{Math.round(hudState.value * 100)}%</Text>
            </View>
          </View>
        )}

        {/* Fullscreen Bottom Exit Button (Auto-hides along with header) */}
        {isFullscreen && showFullscreenHeader && (
          <View
            style={styles.fullscreenBottomExitRow}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.fullscreenExitBtn}
              onPress={() => void toggleFullscreen(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="contract" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Normal Mode Quick Controls Bar (Directly below video) */}
      {!isFullscreen && videoEmbedHtml && (
        <View style={styles.quickControlsBar}>
          <TouchableOpacity
            style={styles.quickCtrlBtn}
            onPress={() => handleSeek(-10)}
            activeOpacity={0.7}
          >
            <Ionicons name="play-back" size={16} color="#FFFFFF" />
            <Text style={styles.quickCtrlBtnText}>10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCtrlBtn, styles.quickPlayBtn]}
            onPress={handleTogglePlay}
            activeOpacity={0.8}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCtrlBtn}
            onPress={() => handleSeek(10)}
            activeOpacity={0.7}
          >
            <Ionicons name="play-forward" size={16} color="#FFFFFF" />
            <Text style={styles.quickCtrlBtnText}>10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCtrlBtn, styles.quickSpeedBtn]}
            onPress={handleCycleSpeed}
            activeOpacity={0.7}
          >
            <Ionicons name="speedometer-outline" size={15} color="#FFFFFF" />
            <Text style={styles.quickSpeedBtnText}>{currentSpeed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCtrlBtn, styles.quickFsBtn]}
            onPress={() => void toggleFullscreen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="expand" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Content Scroll View */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson Title & Provider Badge */}
        <View style={[styles.card, cardShadow(2)]}>
          <View style={styles.titleRow}>
            <Text style={styles.lessonTitle}>{lesson?.title || 'Lesson Overview'}</Text>
          </View>

          <View style={styles.metaRow}>
            {/* Video Provider Badge */}
            {videoSourceType === 'youtube' && (
              <View style={[styles.providerBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="logo-youtube" size={13} color="#EF4444" />
                <Text style={[styles.providerBadgeText, { color: '#DC2626' }]}>YouTube</Text>
              </View>
            )}
            {videoSourceType === 'vimeo' && (
              <View style={[styles.providerBadge, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Ionicons name="videocam" size={13} color="#0284C7" />
                <Text style={[styles.providerBadgeText, { color: '#0369A1' }]}>Vimeo</Text>
              </View>
            )}
            {videoSourceType === 'direct' && (
              <View style={[styles.providerBadge, { backgroundColor: '#ECFEFF', borderColor: '#A5F3FC' }]}>
                <Ionicons name="play-circle" size={13} color={Colors.signal} />
                <Text style={[styles.providerBadgeText, { color: Colors.signal }]}>Video Stream</Text>
              </View>
            )}
            {videoSourceType === 'embed' && (
              <View style={[styles.providerBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                <Ionicons name="tv-outline" size={13} color="#7C3AED" />
                <Text style={[styles.providerBadgeText, { color: '#7C3AED' }]}>Cloud Stream</Text>
              </View>
            )}

            {parsedVideo.externalUrl ? (
              <TouchableOpacity
                style={styles.openExternalPill}
                onPress={() => void Linking.openURL(parsedVideo.externalUrl!)}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={12} color={Colors.signal} />
                <Text style={styles.openExternalPillText}>
                  {parsedVideo.type === 'youtube'
                    ? 'Watch on YouTube'
                    : parsedVideo.type === 'vimeo'
                    ? 'Watch on Vimeo'
                    : 'Open External'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {lesson?.duration_minutes ? (
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={14} color={Colors.signal} />
                <Text style={styles.metaPillText}>{lesson.duration_minutes} Minutes</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.statusBadge,
                isCompleted ? styles.statusBadgeDone : styles.statusBadgeActive,
              ]}
            >
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'play-circle'}
                size={14}
                color={isCompleted ? Colors.emerald : Colors.signal}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isCompleted ? Colors.emerald : Colors.signal },
                ]}
              >
                {isCompleted ? 'Completed' : 'In Progress'}
              </Text>
            </View>
          </View>

          {/* Mark Complete CTA - hidden once completed */}
          {!isCompleted && (
            <TouchableOpacity
              style={[styles.completeBtn, styles.completeBtnActive]}
              onPress={handleMarkComplete}
              disabled={completing}
              activeOpacity={0.85}
            >
              {completing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.completeBtnText}>
                    Mark as Complete
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Summary */}
          {lesson?.summary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Lesson Summary</Text>
              <Text style={styles.summaryText}>{cleanHtml(lesson.summary)}</Text>
            </View>
          ) : null}
        </View>

        {/* Lesson Materials & Resources / PDF Section */}
        {attachmentsList.length > 0 && (
          <View style={[styles.materialsCard, cardShadow(2)]}>
            <View style={styles.materialsHeader}>
              <View style={styles.materialsIconCircle}>
                <Ionicons name="document-attach" size={18} color={Colors.signal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.materialsSectionTitle}>Lesson Resources & Materials</Text>
                <Text style={styles.materialsSectionSub}>
                  {attachmentsList.length} downloadable {attachmentsList.length === 1 ? 'file' : 'files'} for this lesson
                </Text>
              </View>
            </View>

            <View style={styles.materialsList}>
              {attachmentsList.map((att, idx) => {
                const attachId = att.id || `att_${idx}`;
                const isDownloading = downloadingAttachmentId === attachId;
                const isPdf =
                  att.type === 'pdf' ||
                  att.title?.toLowerCase().includes('.pdf') ||
                  att.url?.toLowerCase().includes('.pdf');

                return (
                  <View key={attachId} style={styles.attachmentItemRow}>
                    <View
                      style={[
                        styles.attachmentFileIcon,
                        { backgroundColor: isPdf ? '#FEF2F2' : '#F0F9FF' },
                      ]}
                    >
                      <Ionicons
                        name={isPdf ? 'document-text' : 'folder-outline'}
                        size={20}
                        color={isPdf ? '#EF4444' : Colors.signal}
                      />
                    </View>

                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.attachmentTitle} numberOfLines={1}>
                        {att.title || 'Course Material'}
                      </Text>
                      <Text style={styles.attachmentMeta}>
                        {isPdf ? 'PDF Document' : 'Resource File'}
                        {att.size ? ` • ${att.size}` : ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.downloadBtn}
                      activeOpacity={0.8}
                      onPress={() => void handleDownloadAttachment(att, idx)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={Colors.signal} />
                      ) : (
                        <>
                          <Ionicons name="cloud-download-outline" size={15} color={Colors.signal} />
                          <Text style={styles.downloadBtnText}>Open</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Prev & Next Navigation Buttons */}
        <View style={styles.navButtonsRow}>
          {prevLesson ? (
            <TouchableOpacity
              style={[styles.stepBtn, cardShadow(1)]}
              onPress={() => setCurrentLessonId(prevLesson.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.textMain} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.stepBtnSub}>Previous</Text>
                <Text style={styles.stepBtnTitle} numberOfLines={1}>
                  {prevLesson.title}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={{ width: 12 }} />

          {nextLesson ? (
            <TouchableOpacity
              style={[styles.stepBtn, styles.stepBtnNext, cardShadow(1)]}
              onPress={() => setCurrentLessonId(nextLesson.id)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, marginRight: 8, alignItems: 'flex-end' }}>
                <Text style={styles.stepBtnSub}>Next</Text>
                <Text style={styles.stepBtnTitle} numberOfLines={1}>
                  {nextLesson.title}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={Colors.signal} />
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>

        {/* Lesson Discussion & Questions Section */}
        <View style={[styles.discussionSection, cardShadow(1)]}>
          <View style={styles.discussionHeader}>
            <View style={styles.discussionHeaderLeft}>
              <Ionicons name="chatbubbles" size={18} color={Colors.signal} />
              <Text style={styles.discussionTitle}>Lesson Discussion</Text>
            </View>
            <View style={styles.commentCountBadge}>
              <Text style={styles.commentCountText}>{comments.length}</Text>
            </View>
          </View>

          {/* Comment Composer */}
          <View style={styles.commentComposerRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Ask a question about this lesson..."
              placeholderTextColor="#94A3B8"
              value={newCommentText}
              onChangeText={setNewCommentText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.postCommentBtn,
                (!newCommentText.trim() || postingComment) && styles.postCommentBtnDisabled,
              ]}
              onPress={handlePostComment}
              disabled={!newCommentText.trim() || postingComment}
              activeOpacity={0.8}
            >
              {postingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={15} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {comments.length === 0 ? (
            <View style={styles.emptyCommentsBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color="#94A3B8" />
              <Text style={styles.emptyCommentsText}>
                No questions or discussions yet. Have a question? Ask above!
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((c, cIdx) => {
                const authorName = c.user?.name || c.author_name || (c.user_id === user?.id ? user?.name : 'Learner');
                const initial = (authorName || 'U').charAt(0).toUpperCase();
                const isInstructor = Boolean(c.is_instructor || c.user?.is_instructor);

                return (
                  <View key={c.id || cIdx} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{initial}</Text>
                    </View>
                    <View style={styles.commentBodyCol}>
                      <View style={styles.commentAuthorRow}>
                        <Text style={styles.commentAuthorName}>{authorName}</Text>
                        {isInstructor && (
                          <View style={styles.instructorBadge}>
                            <Text style={styles.instructorBadgeText}>Instructor</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.commentBodyText}>{c.body || c.comment || c.message || ''}</Text>

                      {/* Nested Replies */}
                      {c.replies && Array.isArray(c.replies) && c.replies.length > 0 && (
                        <View style={styles.repliesList}>
                          {c.replies.map((r: any, rIdx: number) => {
                            const rAuthor = r.user?.name || r.author_name || 'Instructor';
                            return (
                              <View key={r.id || rIdx} style={styles.replyItem}>
                                <Text style={styles.replyAuthor}>{rAuthor}:</Text>
                                <Text style={styles.replyBody}>{r.body || r.comment || ''}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Course Curriculum Drawer / List */}
        {courseDetail?.sections && courseDetail.sections.length > 0 ? (
          <View style={styles.syllabusSection}>
            <Text style={styles.syllabusHeading}>Course Syllabus</Text>
            {courseDetail.sections.map((section, sIdx) => (
              <View key={section.id || sIdx} style={[styles.sectionCard, cardShadow(1)]}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.lessons?.map((les, lIdx) => {
                  const isCurrent = String(les.id) === String(currentLessonId);
                  return (
                    <TouchableOpacity
                      key={les.id || lIdx}
                      style={[
                        styles.lessonItemRow,
                        isCurrent && styles.lessonItemRowCurrent,
                      ]}
                      onPress={() => setCurrentLessonId(les.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          les.is_completed
                            ? 'checkmark-circle'
                            : isCurrent
                            ? 'play-circle'
                            : 'play-circle-outline'
                        }
                        size={20}
                        color={
                          les.is_completed
                            ? Colors.emerald
                            : isCurrent
                            ? Colors.signal
                            : Colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.lessonItemTitle,
                          isCurrent && styles.lessonItemTitleCurrent,
                        ]}
                        numberOfLines={2}
                      >
                        {les.title}
                      </Text>
                      <Text style={styles.lessonItemTime}>
                        {les.duration_minutes ? `${les.duration_minutes}m` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {courseDetail?.activities && courseDetail.activities.length > 0 ? (
              <View style={[styles.sectionCard, cardShadow(1)]}>
                <Text style={styles.sectionTitle}>Checkpoints & Quizzes</Text>
                {courseDetail.activities.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={styles.lessonItemRow}
                    onPress={() => {
                      navigation.navigate('Quiz', {
                        courseSlug,
                        activityId: act.id,
                        activityTitle: act.title,
                        courseTitle: courseDetail.title,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={act.is_completed ? 'checkmark-circle' : 'help-circle-outline'}
                      size={20}
                      color={act.is_completed ? Colors.emerald : '#F59E0B'}
                    />
                    <Text style={styles.lessonItemTitle} numberOfLines={2}>
                      {act.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  navCourseTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  navLessonCounter: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  videoPlayerContainer: {
    width: '100%',
    backgroundColor: '#000000',
  },
  portraitVideoRatio: {
    aspectRatio: 16 / 9,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  loadingText: {
    color: Colors.textMuted,
    marginTop: 10,
    fontSize: 13,
  },
  noVideoText: {
    color: Colors.textMuted,
    marginTop: 10,
    fontSize: 13,
  },
  openExternalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  openExternalPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
  },
  errorOverlay: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlayTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  errorOverlaySub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  errorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.signal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: Colors.signal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openExternalBtnText: {
    color: Colors.signal,
    fontSize: 12,
    fontWeight: '700',
  },
  noVideoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  noVideoSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 17,
  },
  noVideoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  signInBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  titleRow: {
    marginBottom: 10,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFEFF',
  },
  statusBadgeDone: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  completeBtnActive: {
    backgroundColor: Colors.signal,
  },
  completeBtnDone: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: Colors.emerald,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  completeBtnTextDone: {
    color: Colors.emerald,
  },
  summaryBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  materialsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  materialsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  materialsIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  materialsSectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  materialsList: {
    gap: 10,
  },
  attachmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  stepBtnNext: {
    borderColor: Colors.signal,
  },
  stepBtnSub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  stepBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginTop: 2,
  },
  syllabusSection: {
    marginTop: 4,
  },
  discussionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  discussionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discussionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  commentCountBadge: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  commentCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.signal,
  },
  commentComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 80,
  },
  postCommentBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.signal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCommentBtnDisabled: {
    opacity: 0.5,
  },
  emptyCommentsBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyCommentsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E7490',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  commentBodyCol: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  instructorBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  instructorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  commentBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  repliesList: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    gap: 6,
  },
  replyItem: {
    flexDirection: 'row',
    gap: 4,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E7490',
  },
  replyBody: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  syllabusHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 10,
  },
  lessonItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: 10,
  },
  lessonItemRowCurrent: {
    backgroundColor: '#ECFEFF',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderTopWidth: 0,
  },
  lessonItemTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  lessonItemTitleCurrent: {
    color: Colors.signal,
    fontWeight: '700',
  },
  lessonItemTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  quickControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  quickCtrlBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickPlayBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  quickSpeedBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  quickSpeedBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickFsBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    ...StyleSheet.absoluteFill,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 99999,
    backgroundColor: '#000000',
  },
  fullscreenHeaderRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  fullscreenBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenLessonTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  fullscreenBottomExitRow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 50,
  },
  fullscreenExitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenControlsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 30,
  },
  fsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fsActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fsPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.signal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fsSpeedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 116, 144, 0.4)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  fsSpeedBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  hudOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 60,
  },
  hudCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 150,
  },
  hudText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  hudProgressBarTrack: {
    width: 110,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  hudProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  hudPercentText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  gestureHintPill: {
    position: 'absolute',
    top: 68,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 20,
  },
  gestureHintText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
});
