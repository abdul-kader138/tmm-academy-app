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
import { Colors, elevationStyle } from '../theme/colors';
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

  const streakDays = dashboard?.streak_summary?.streak_days || 3;

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
        >
          <Ionicons name="person-circle" size={36} color={Colors.primaryLight} />
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
            tintColor={Colors.primaryLight}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Learning Streak Card */}
        <View style={[styles.streakCard, elevationStyle(3)]}>
          <View style={styles.streakLeft}>
            <View style={styles.fireCircle}>
              <Ionicons name="flame" size={28} color="#FF7A00" />
            </View>
            <View>
              <Text style={styles.streakCount}>{streakDays} Day Streak!</Text>
              <Text style={styles.streakSub}>Keep learning to retain your habits</Text>
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
          <View style={[styles.statBox, elevationStyle(2)]}>
            <Ionicons name="school" size={24} color={Colors.cyan} />
            <Text style={styles.statVal}>
              {dashboard?.enrolled_courses?.length || 1}
            </Text>
            <Text style={styles.statLabel}>Enrolled Courses</Text>
          </View>

          <View style={[styles.statBox, elevationStyle(2)]}>
            <Ionicons name="ribbon" size={24} color={Colors.emerald} />
            <Text style={styles.statVal}>
              {dashboard?.certificates?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Certificates</Text>
          </View>
        </View>

        {/* In Progress Courses */}
        <Text style={styles.sectionTitle}>In-Progress Learning</Text>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.courseProgressList}>
            {(dashboard?.enrolled_courses || [
              {
                id: 3,
                slug: 'boc-12-bijnes-oprcuniti-kors',
                title: 'BOC-12 (বিজনেস অপরচুনিটি কোর্স)',
                progress_percent: 45,
                lessons_count: 3,
              },
            ]).map((c: any) => (
              <View key={c.id} style={[styles.activeCourseCard, elevationStyle(2)]}>
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
                      { width: `${c.progress_percent || 25}%` },
                    ]}
                  />
                </View>

                <View style={styles.cardActions}>
                  <Text style={styles.lessonInfo}>
                    {c.lessons_count || 3} Lessons in curriculum
                  </Text>
                  <TouchableOpacity
                    style={styles.continueBtn}
                    onPress={() =>
                      navigation.navigate('CourseDetail', { course: c })
                    }
                  >
                    <Text style={styles.continueBtnText}>Continue</Text>
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.backgroundInput,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greetingText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  profileBadge: {
    padding: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  streakCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.25)',
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
    backgroundColor: 'rgba(255, 122, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCount: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  streakSub: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: '#FF7A00',
  },
  dayPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayPillText: {
    color: Colors.textMuted,
    fontSize: 11,
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
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statVal: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  courseProgressList: {
    gap: 12,
  },
  activeCourseCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeCourseTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  percentText: {
    color: Colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonInfo: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
