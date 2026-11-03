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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi } from '../api/lmsApi';
import { LessonDetail, CourseDetail } from '../api/types';

export const LessonPlayerScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { courseSlug, lessonId: initialLessonId, courseTitle: initialTitle } = route.params || {};

  const [currentLessonId, setCurrentLessonId] = useState<number | string>(initialLessonId);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Load course details (for sections and navigation)
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
    try {
      const data = await lmsApi.getLesson(courseSlug, id);
      setLesson(data);
      setIsCompleted(Boolean(data?.is_completed || data?.completed));
    } catch {
      setLesson(null);
    } finally {
      setLoadingLesson(false);
    }
  }, [courseSlug]);

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
        // Refresh course detail to update progress and checks
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

  const vimeoId = lesson?.vimeo_id;
  const vimeoEmbedHtml = vimeoId
    ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 100%; height: 100%; background: #0F172A; overflow: hidden; display: flex; align-items: center; justify-content: center; }
          .player-wrap { position: relative; width: 100%; height: 100%; }
          iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
        </style>
      </head>
      <body>
        <div class="player-wrap">
          <iframe
            src="https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0&transparent=0"
            frameborder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </body>
    </html>
  `
    : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" animated />

      {/* Top Navbar */}
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

      {/* Video Container (Fixed 16:9 ratio) */}
      <View style={styles.videoPlayerContainer}>
        {loadingLesson ? (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="large" color={Colors.signal} />
            <Text style={styles.loadingText}>Loading lesson video...</Text>
          </View>
        ) : vimeoEmbedHtml ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: vimeoEmbedHtml }}
            style={styles.webview}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.noVideoText}>Video player unavailable for this lesson</Text>
          </View>
        )}
      </View>

      {/* Content Scroll View */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson Title & Status */}
        <View style={[styles.card, cardShadow(2)]}>
          <View style={styles.titleRow}>
            <Text style={styles.lessonTitle}>{lesson?.title || 'Lesson Overview'}</Text>
          </View>

          <View style={styles.metaRow}>
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

          {/* Mark Complete CTA */}
          <TouchableOpacity
            style={[
              styles.completeBtn,
              isCompleted ? styles.completeBtnDone : styles.completeBtnActive,
            ]}
            onPress={handleMarkComplete}
            disabled={completing || isCompleted}
            activeOpacity={0.85}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isCompleted ? 'checkmark-done' : 'checkmark-circle-outline'}
                  size={18}
                  color={isCompleted ? Colors.emerald : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.completeBtnText,
                    isCompleted && styles.completeBtnTextDone,
                  ]}
                >
                  {isCompleted ? 'Lesson Completed' : 'Mark as Complete'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Summary */}
          {lesson?.summary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Lesson Summary</Text>
              <Text style={styles.summaryText}>{lesson.summary}</Text>
            </View>
          ) : null}
        </View>

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
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark canvas for cinema feel
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
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090D16',
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 10,
  },
  noVideoText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 8,
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
    gap: 10,
    marginBottom: 16,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMain,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  statusBadgeDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
    borderRadius: 10,
    marginTop: 4,
  },
  completeBtnActive: {
    backgroundColor: Colors.signal,
  },
  completeBtnDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: Colors.emerald,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completeBtnTextDone: {
    color: Colors.emerald,
  },
  summaryBox: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  navButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
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
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  stepBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginTop: 2,
  },
  syllabusSection: {
    marginTop: 24,
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
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  lessonItemRowCurrent: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  lessonItemTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMain,
    fontWeight: '500',
  },
  lessonItemTitleCurrent: {
    color: Colors.signal,
    fontWeight: '700',
  },
  lessonItemTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
