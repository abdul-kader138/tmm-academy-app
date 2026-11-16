import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi, API_BASE_URL } from '../api/lmsApi';
import { CourseCatalogItem, CourseDetail } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { getCoursePricing } from '../utils/pricing';
import { cleanHtml } from '../utils/text';

export const CourseDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const initialCourse: CourseCatalogItem = route.params?.course;
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningSessionId, setJoiningSessionId] = useState<number | string | null>(null);

  useEffect(() => {
    void (async () => {
      if (initialCourse?.slug) {
        const res = await lmsApi.getCourseDetail(initialCourse.slug);
        setDetail(res);
      }
      setLoading(false);
    })();
  }, [initialCourse?.slug]);

  const course = detail || (initialCourse as unknown as CourseDetail);
  const imageUrl = course?.cover_image_url
    ? course.cover_image_url.startsWith('http')
      ? course.cover_image_url
      : `${API_BASE_URL}${course.cover_image_url}`
    : '';

  const pricing = getCoursePricing(course as any);

  const handleJoinLiveSession = async (sessionId: number | string, defaultJoinUrl?: string) => {
    setJoiningSessionId(sessionId);
    try {
      const res = await lmsApi.joinLiveSession(course.slug, sessionId);
      const urlToOpen = res.join_url || defaultJoinUrl;
      if (urlToOpen) {
        await Linking.openURL(urlToOpen);
      } else if (res.error) {
        Alert.alert('Live Session', res.error);
      } else {
        Alert.alert('Notice', 'Live session link will be accessible 10 minutes before the scheduled start time.');
      }
    } catch {
      if (defaultJoinUrl) {
        void Linking.openURL(defaultJoinUrl);
      } else {
        Alert.alert('Notice', 'Live session link will open shortly.');
      }
    } finally {
      setJoiningSessionId(null);
    }
  };

  return (
    <View style={styles.container}>
      {isFocused && <StatusBar style="light" animated />}

      {/* Cover Header (Fixed at top) */}
      <View style={styles.coverWrapper}>
        {Boolean(imageUrl) && (
          <Image source={{ uri: imageUrl }} style={styles.coverImage} resizeMode="cover" />
        )}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.15)', 'rgba(15, 23, 42, 0.85)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Status Bar Gradient Scrim (Smooth seamless fade) */}
        <LinearGradient
          colors={[
            'rgba(15, 23, 42, 0.75)',
            'rgba(15, 23, 42, 0.42)',
            'rgba(15, 23, 42, 0.12)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.7, 1]}
          style={[
            styles.topGradientScrim,
            { height: insets.top + (Platform.OS === 'ios' ? 44 : 48) },
          ]}
          pointerEvents="none"
        />

        {/* Top Navbar */}
        <View style={[styles.topBar, { top: insets.top + (Platform.OS === 'ios' ? 6 : 14) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Title on cover */}
        <View style={styles.coverTextContainer}>
          {course.eyebrow ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{course.eyebrow}</Text>
            </View>
          ) : null}
          <Text style={styles.heroTitle}>{course.title}</Text>
        </View>
      </View>

      {/* Content Body */}
      <View style={styles.body}>
        {/* Stats Bar */}
        <View style={[styles.statsBar, cardShadow(2)]}>
          <View style={styles.statCol}>
            <Ionicons name="time-outline" size={17} color={Colors.signal} />
            <Text style={styles.statVal}>
              {Math.round(course.duration_minutes / 60)}h
            </Text>
            <Text style={styles.statLbl}>Duration</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statCol}>
            <Ionicons name="layers-outline" size={17} color={Colors.signal} />
            <Text style={styles.statVal}>{course.lessons_count}</Text>
            <Text style={styles.statLbl}>Lessons</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statCol}>
            <Ionicons
              name={pricing.isFree ? 'gift-outline' : 'pricetag-outline'}
              size={17}
              color={pricing.isFree ? Colors.emerald : '#0284C7'}
            />
            {pricing.hasDiscount ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.strikeDetailPrice}>{pricing.originalPrice}</Text>
                <Text style={[styles.statVal, { color: '#DC2626' }]}>
                  {pricing.displayPrice}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.statVal,
                  { color: pricing.isFree ? Colors.emerald : '#0284C7' },
                ]}
              >
                {pricing.displayPrice}
              </Text>
            )}
            <Text style={styles.statLbl}>
              {pricing.hasDiscount ? pricing.discountBadgeText : 'Course Fee'}
            </Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statCol}>
            <Ionicons name="ribbon-outline" size={17} color={Colors.emerald} />
            <Text style={styles.statVal}>Included</Text>
            <Text style={styles.statLbl}>Certificate</Text>
          </View>
        </View>

        {/* About Section Heading */}
        <Text style={styles.sectionHeading}>About this Course</Text>

        {/* Only the description area is scrollable */}
        <ScrollView
          style={styles.descScrollView}
          contentContainerStyle={[
            styles.descScrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Access Expired / Completed Notice */}
          {course.access_expired && (
            <View style={[styles.accessExpiredCard, cardShadow(1)]}>
              <View style={styles.accessExpiredHeader}>
                <Ionicons name="information-circle" size={20} color="#D97706" />
                <Text style={styles.accessExpiredTitle}>Enrollment Access Notice</Text>
              </View>
              <Text style={styles.accessExpiredMessage}>
                {course.error_message ||
                  'Your access to this course has ended. Your earned certificate remains permanently available in the Certificates tab.'}
              </Text>
              <View style={styles.accessExpiredButtons}>
                <TouchableOpacity
                  style={styles.viewCertBtn}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'CertificatesTab' })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="ribbon-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.viewCertBtnText}>View Certificate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactSupportBtn}
                  onPress={() => navigation.navigate('SupportTicket')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubbles-outline" size={15} color={Colors.signal} />
                  <Text style={styles.contactSupportBtnText}>Help Desk</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.descriptionText}>
            {cleanHtml(course.description_text || course.description)}
          </Text>

          {/* Syllabus / Sections */}
          {loading ? (
            <ActivityIndicator color={Colors.signal} style={{ marginTop: 20 }} />
          ) : detail?.sections && detail.sections.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionHeading}>Course Syllabus</Text>
              {detail.sections.map((sec, idx) => (
                <View key={sec.id || idx} style={[styles.sectionCard, cardShadow(1)]}>
                  <Text style={styles.sectionTitle}>{sec.title}</Text>
                  {sec.lessons.map((les) => (
                    <TouchableOpacity
                      key={les.id}
                      style={styles.lessonRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (course.is_enrolled) {
                          navigation.navigate('LessonPlayer', {
                            courseSlug: course.slug,
                            lessonId: les.id,
                            courseTitle: course.title,
                          });
                        } else {
                          Alert.alert(
                            'Course Enrollment',
                            'Lessons are accessible for enrolled students. Enrollment is managed through the official academy website.'
                          );
                        }
                      }}
                    >
                      <Ionicons
                        name={les.is_completed ? 'checkmark-circle' : 'play-circle-outline'}
                        size={18}
                        color={les.is_completed ? Colors.emerald : Colors.signal}
                      />
                      <Text style={styles.lessonTitle}>{les.title}</Text>
                      <Text style={styles.lessonTime}>
                        {(les as any).duration_minutes
                          ? `${(les as any).duration_minutes}m`
                          : `${Math.floor((les.duration_seconds || 0) / 60)}m`}
                      </Text>
                      {course.is_enrolled && (
                        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              {/* Checkpoints & Quizzes if any */}
              {detail?.activities && detail.activities.length > 0 ? (
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.sectionHeading}>Quizzes & Checkpoints</Text>
                  {detail.activities.map((act) => (
                    <TouchableOpacity
                      key={act.id}
                      style={[styles.activityCard, cardShadow(1)]}
                      activeOpacity={course.is_enrolled ? 0.7 : 1}
                      onPress={() => {
                        if (course.is_enrolled) {
                          navigation.navigate('Quiz', {
                            courseSlug: course.slug,
                            activityId: act.id,
                            activityTitle: act.title,
                            courseTitle: course.title,
                          });
                        }
                      }}
                    >
                      <View style={styles.activityIconCircle}>
                        <Ionicons
                          name={act.type === 'project' ? 'folder-outline' : 'help-circle-outline'}
                          size={20}
                          color={Colors.signal}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityTitle}>{act.title}</Text>
                        <Text style={styles.activitySub}>
                          {act.type.toUpperCase()} • Passing: {act.passing_score || 70}%
                        </Text>
                      </View>
                      {course.is_enrolled && (
                        <View style={styles.takeQuizBadge}>
                          <Text style={styles.takeQuizText}>Start</Text>
                          <Ionicons name="arrow-forward" size={12} color={Colors.signal} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {/* Live Interactive Sessions if any */}
              {((detail?.live_sessions && detail.live_sessions.length > 0) ||
                (course.live_sessions && course.live_sessions.length > 0)) && (
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.sectionHeading}>Scheduled Live Sessions</Text>
                  {(detail?.live_sessions || course.live_sessions || []).map((session: any, sIdx: number) => {
                    const isJoining = joiningSessionId === session.id;
                    return (
                      <View key={session.id || sIdx} style={[styles.activityCard, cardShadow(1)]}>
                        <View style={[styles.activityIconCircle, { backgroundColor: '#FEF2F2' }]}>
                          <Ionicons name="videocam" size={20} color="#EF4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityTitle}>{session.title || 'Interactive Live Class'}</Text>
                          <Text style={styles.activitySub}>
                            {session.start_time || 'Schedule announced in classroom'}
                            {session.duration_minutes ? ` • ${session.duration_minutes}m` : ''}
                          </Text>
                        </View>
                        {course.is_enrolled ? (
                          <TouchableOpacity
                            style={[styles.takeQuizBadge, { backgroundColor: '#EF4444' }]}
                            onPress={() => void handleJoinLiveSession(session.id, session.join_url)}
                            disabled={isJoining}
                          >
                            {isJoining ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Text style={[styles.takeQuizText, { color: '#FFFFFF' }]}>Join</Text>
                                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                              </>
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : !loading ? (
            <View style={styles.emptySyllabusCard}>
              <View style={styles.emptySyllabusIcon}>
                <Ionicons
                  name={course.is_enrolled ? 'film-outline' : 'lock-closed-outline'}
                  size={26}
                  color={Colors.signal}
                />
              </View>
              <Text style={styles.emptySyllabusTitle}>
                {course.is_enrolled ? 'Modules Being Uploaded' : 'Curriculum for Enrolled Students'}
              </Text>
              <Text style={styles.emptySyllabusSub}>
                {course.is_enrolled
                  ? 'The video syllabus and study materials for this course are being prepared by the academy instructors. Check back shortly!'
                  : 'Course lessons and study materials are accessible once enrollment is activated via the official web portal.'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Floating Bottom Enroll / Start CTA */}
      <View
        style={[
          styles.bottomBar,
          cardShadow(4),
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
          },
        ]}
      >
        <View style={styles.statusCol}>
          <Text style={styles.statusLabel}>
            {course.access_expired ? 'Course Status' : course.is_enrolled ? 'Student Status' : 'Course Fee'}
          </Text>
          <Text
            style={[
              styles.statusValue,
              {
                color: course.access_expired
                  ? '#D97706'
                  : course.is_enrolled
                  ? Colors.emerald
                  : pricing.isFree
                  ? Colors.emerald
                  : '#0F172A',
              },
            ]}
          >
            {course.access_expired
              ? 'Completed'
              : course.is_enrolled
              ? 'Enrolled'
              : pricing.isFree
              ? 'Free Access'
              : pricing.hasDiscount
              ? `${pricing.displayPrice} (${pricing.discountBadgeText})`
              : pricing.displayPrice}
          </Text>
        </View>

        {course.access_expired ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#059669' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MainTabs', { screen: 'CertificatesTab' })}
          >
            <Text style={styles.actionBtnText}>View Certificate</Text>
            <Ionicons name="ribbon" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : course.is_enrolled ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.signal }]}
            activeOpacity={0.85}
            onPress={() => {
              // Find first incomplete lesson, or first lesson
              let targetLessonId: number | string | null = null;
              if (detail?.sections) {
                for (const sec of detail.sections) {
                  if (sec.lessons && sec.lessons.length > 0) {
                    const incomplete = sec.lessons.find((l) => !l.is_completed);
                    targetLessonId = incomplete ? incomplete.id : sec.lessons[0].id;
                    break;
                  }
                }
              }

              if (targetLessonId) {
                navigation.navigate('LessonPlayer', {
                  courseSlug: course.slug,
                  lessonId: targetLessonId,
                  courseTitle: course.title,
                });
              } else {
                Alert.alert('Notice', 'No lessons available for this course yet.');
              }
            }}
          >
            <Text style={styles.actionBtnText}>Go to Classroom</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.webAdmissionBtn}
            activeOpacity={0.85}
            onPress={() => {
              void Linking.openURL(`https://academy.tmminnovation.com/courses/${course.slug}`);
            }}
          >
            <Ionicons name="globe-outline" size={16} color={Colors.signal} />
            <Text style={styles.webAdmissionBtnText}>Enroll via Web</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  coverWrapper: {
    width: '100%',
    height: 260,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  topGradientScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: Colors.surfaceElevated,
  },
  topBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTextContainer: {
    padding: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(236, 254, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: Colors.signal,
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    color: Colors.textMain,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  strikeDetailPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  statLbl: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  vDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderSubtle,
  },
  sectionHeading: {
    color: Colors.textMain,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  descScrollView: {
    flex: 1,
  },
  descScrollContent: {
    paddingBottom: 24,
  },
  descriptionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  sectionTitle: {
    color: Colors.textMain,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: 10,
  },
  lessonTitle: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  lessonTime: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusCol: {
    flex: 1,
  },
  statusLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusValue: {
    color: Colors.textMain,
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.signal,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 10,
    gap: 12,
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 2,
  },
  activitySub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  takeQuizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  takeQuizText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  emptySyllabusCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptySyllabusIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptySyllabusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 6,
  },
  emptySyllabusSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  accessExpiredCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  accessExpiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  accessExpiredTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  accessExpiredMessage: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    marginBottom: 14,
  },
  accessExpiredButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  viewCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewCertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  contactSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  contactSupportBtnText: {
    color: Colors.signal,
    fontSize: 12,
    fontWeight: '700',
  },
  webAdmissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  webAdmissionBtnText: {
    color: Colors.signal,
    fontSize: 13,
    fontWeight: '700',
  },
});