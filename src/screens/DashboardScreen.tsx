import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi } from '../api/lmsApi';
import { DashboardSummary } from '../api/types';
import { useAuth } from '../context/AuthContext';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const data = await lmsApi.getDashboard();
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDashboard();
  };

  const streakDays = dashboard?.streak_summary?.streak_days || 0;
  const enrolledCourses = dashboard?.enrolled_courses || [];
  const certificateCount = dashboard?.certificates?.length || 0;

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
          onPress={() => navigation.navigate('AccountTab')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle" size={38} color={Colors.signal} />
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
                    {c.lessons_count} Lessons in track
                  </Text>
                  <TouchableOpacity
                    style={styles.continueBtn}
                    onPress={() =>
                      navigation.navigate('CourseDetail', { course: c })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueBtnText}>Continue</Text>
                    <Ionicons name="play" size={12} color="#FFFFFF" />
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
              onPress={() => navigation.navigate('CatalogTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.browseBtnText}>Explore Courses</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
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
});