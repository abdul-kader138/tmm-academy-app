import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi, normalizeAvatarUrl } from '../api/lmsApi';
import { DashboardSummary, CourseCatalogItem } from '../api/types';
import { useAuth } from '../context/AuthContext';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar_url]);

  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await lmsApi.getDashboard();
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Automatically refresh whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // If we already have dashboard data, refresh silently in the background
        void fetchDashboard(Boolean(dashboard));
      } else {
        setLoading(false);
      }
    }, [user, fetchDashboard, Boolean(dashboard)])
  );

  const onRefresh = () => {
    if (user) {
      setRefreshing(true);
      void fetchDashboard(true);
    }
  };

  const streakDays = dashboard?.streak_summary?.streak_days || 0;
  const enrolledCourses: CourseCatalogItem[] =
    dashboard?.enrolled_courses || (dashboard as any)?.courses || [];
  const certificateCount = dashboard?.certificates?.length || 0;

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 40 : 50),
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View style={[styles.guestCard, cardShadow(2)]}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="speedometer-outline" size={48} color={Colors.signal} />
          </View>
          <Text style={styles.guestTitle}>Sign in to Classroom</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to track your learning streak, resume enrolled lessons, and view course checkpoints.
          </Text>
          <TouchableOpacity
            style={styles.guestSignInBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.guestSignInBtnText}>Sign In</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 16),
          },
        ]}
      >
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.first_name || 'Learner'}</Text>
        </View>

        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => navigation.navigate('MainTabs', { screen: 'AccountTab' })}
          activeOpacity={0.7}
        >
          {user?.avatar_url && !avatarLoadFailed ? (
            <Image
              source={{ uri: normalizeAvatarUrl(user.avatar_url) || user.avatar_url }}
              style={styles.avatarImage}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {user?.first_name ? user.first_name[0].toUpperCase() : 'L'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.signal}
            colors={[Colors.signal]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Learning Streak Card */}
        <View style={[styles.streakCard, cardShadow(2)]}>
          <View style={styles.streakLeft}>
            <View style={styles.fireCircle}>
              <Ionicons name="flame" size={26} color="#FF7A00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakCount}>
                {streakDays > 0 ? `${streakDays} Day Streak!` : '0 Day Streak'}
              </Text>
              <Text style={styles.streakSub}>
                {streakDays > 0
                  ? 'Keep learning today to maintain your routine.'
                  : "Complete today's lesson to start your learning streak!"}
              </Text>
            </View>
          </View>

          {/* 7-day mini pills */}
          <View style={styles.daysRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <View
                key={idx}
                style={[
                  styles.dayPill,
                  idx < streakDays ? styles.dayPillActive : styles.dayPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    idx < streakDays && styles.dayPillTextActive,
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, cardShadow(2)]}>
            <Ionicons name="school" size={24} color={Colors.signal} />
            <Text style={styles.statVal}>{enrolledCourses.length}</Text>
            <Text style={styles.statLabel}>Enrolled Courses</Text>
          </View>

          <View style={[styles.statBox, cardShadow(2)]}>
            <Ionicons name="ribbon" size={24} color={Colors.emerald} />
            <Text style={styles.statVal}>{certificateCount}</Text>
            <Text style={styles.statLabel}>Certificates</Text>
          </View>
        </View>

        {/* In Progress Courses */}
        <Text style={styles.sectionTitle}>In-Progress Learning</Text>
        {loading ? (
          <ActivityIndicator color={Colors.signal} style={{ marginTop: 24 }} />
        ) : enrolledCourses.length > 0 ? (
          <View style={styles.courseProgressList}>
            {enrolledCourses.map((c) => (
              <View key={c.id} style={[styles.activeCourseCard, cardShadow(2)]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.activeCourseTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={styles.percentText}>{c.progress_percent || 0}%</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${c.progress_percent || 0}%` },
                    ]}
                  />
                </View>

                <View style={styles.cardActions}>
                  <Text style={styles.lessonInfo}>
                    {c.progress_percent === 100
                      ? 'Course Completed (100%)'
                      : `${c.lessons_count} Lessons in track`}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.continueBtn,
                      c.progress_percent === 100 && { backgroundColor: '#059669' },
                    ]}
                    onPress={() =>
                      navigation.navigate('CourseDetail', { course: c })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueBtnText}>
                      {c.progress_percent === 100 ? 'Details' : 'Continue'}
                    </Text>
                    <Ionicons
                      name={c.progress_percent === 100 ? 'ribbon' : 'play'}
                      size={12}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, cardShadow(1)]}>
            <Ionicons name="book-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Enrolled Courses Yet</Text>
            <Text style={styles.emptyDesc}>
              Enroll in verified courses to track your curriculum and earn credentials.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'CatalogTab' })}
              activeOpacity={0.85}
            >
              <Text style={styles.browseBtnText}>Explore Courses</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Classes & Support Cards */}
        <View style={styles.interactiveGrid}>
          {/* Live Classes Card */}
          <TouchableOpacity
            style={[styles.interactiveCard, cardShadow(2)]}
            onPress={() => navigation.navigate('LiveClasses')}
            activeOpacity={0.85}
          >
            <View style={styles.interactiveCardTop}>
              <View style={[styles.interactiveIconCircle, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="videocam" size={20} color="#EF4444" />
              </View>
              <View style={styles.interactiveBadge}>
                <Text style={styles.interactiveBadgeText}>LIVE SESSIONS</Text>
              </View>
            </View>
            <Text style={styles.interactiveCardTitle}>Live Classes & Webinars</Text>
            <Text style={styles.interactiveCardSub}>
              View interactive Zoom and Google Meet schedules
            </Text>
            <View style={styles.interactiveLink}>
              <Text style={[styles.interactiveLinkText, { color: '#EF4444' }]}>View Schedule</Text>
              <Ionicons name="arrow-forward" size={12} color="#EF4444" />
            </View>
          </TouchableOpacity>

          {/* Support Ticket Card */}
          <TouchableOpacity
            style={[styles.interactiveCard, cardShadow(2)]}
            onPress={() => navigation.navigate('SupportTicket')}
            activeOpacity={0.85}
          >
            <View style={styles.interactiveCardTop}>
              <View style={[styles.interactiveIconCircle, { backgroundColor: '#ECFEFF' }]}>
                <Ionicons name="chatbubbles" size={20} color={Colors.signal} />
              </View>
              <View style={[styles.interactiveBadge, { backgroundColor: '#ECFEFF' }]}>
                <Text style={[styles.interactiveBadgeText, { color: Colors.signal }]}>ASSISTANCE</Text>
              </View>
            </View>
            <Text style={styles.interactiveCardTitle}>Support & Help Desk</Text>
            <Text style={styles.interactiveCardSub}>
              Raise tickets, get help with quizzes & curriculum
            </Text>
            <View style={styles.interactiveLink}>
              <Text style={styles.interactiveLinkText}>Open Desk</Text>
              <Ionicons name="arrow-forward" size={12} color={Colors.signal} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Pending Checkpoints & Quizzes */}
        {dashboard?.pending_checkpoints && dashboard.pending_checkpoints.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Pending Checkpoints</Text>
            {dashboard.pending_checkpoints.map((cp) => (
              <View key={cp.id} style={[styles.checkpointCard, cardShadow(1)]}>
                <View style={styles.checkpointIconCircle}>
                  <Ionicons name="help-circle" size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkpointTitle}>{cp.title}</Text>
                  <Text style={styles.checkpointSub}>
                    Passing requirement: {cp.passing_score || 70}%
                  </Text>
                </View>
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
    backgroundColor: Colors.canvas,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  greetingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  userName: {
    color: Colors.textMain,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  profileBadge: {
    padding: 2,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0F2FE',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  fireCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCount: {
    color: Colors.textMain,
    fontSize: 16,
    fontWeight: '800',
  },
  streakSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: '#FF7A00',
  },
  dayPillInactive: {
    backgroundColor: Colors.surfaceElevated,
  },
  dayPillText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  statVal: {
    color: Colors.textMain,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  sectionTitle: {
    color: Colors.textMain,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  courseProgressList: {
    gap: 12,
  },
  activeCourseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeCourseTitle: {
    color: Colors.textMain,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  percentText: {
    color: Colors.signal,
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.signal,
    borderRadius: 3,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonInfo: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.signal,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.signal,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  guestCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  guestIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(236, 254, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 10,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.signal,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  checkpointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 10,
    gap: 14,
  },
  checkpointIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkpointTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 2,
  },
  checkpointSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  interactiveGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  interactiveCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  interactiveCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  interactiveIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactiveBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  interactiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  interactiveCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 18,
  },
  interactiveCardSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 12,
  },
  interactiveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  interactiveLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
  },
});