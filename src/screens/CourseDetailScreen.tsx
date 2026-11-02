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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, elevationStyle } from '../theme/colors';
import { lmsApi, API_BASE_URL } from '../api/lmsApi';
import { CourseCatalogItem, CourseDetail } from '../api/types';

export const CourseDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const initialCourse: CourseCatalogItem = route.params?.course;
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 90,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Header */}
        <View style={styles.coverWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.coverImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(11, 15, 25, 0.4)', 'rgba(11, 15, 25, 0.95)']}
            style={StyleSheet.absoluteFill}
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

            <View style={styles.shareBadge}>
              <Ionicons name="bookmark-outline" size={20} color="#FFFFFF" />
            </View>
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
          <View style={[styles.statsBar, elevationStyle(2)]}>
            <View style={styles.statCol}>
              <Ionicons name="time" size={18} color={Colors.cyan} />
              <Text style={styles.statVal}>{Math.round(course.duration_minutes / 60)} Hours</Text>
              <Text style={styles.statLbl}>Duration</Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.statCol}>
              <Ionicons name="layers" size={18} color={Colors.primaryLight} />
              <Text style={styles.statVal}>{course.lessons_count} Lessons</Text>
              <Text style={styles.statLbl}>Curriculum</Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.statCol}>
              <Ionicons name="ribbon" size={18} color={Colors.emerald} />
              <Text style={styles.statVal}>Certificate</Text>
              <Text style={styles.statLbl}>Included</Text>
            </View>
          </View>

          {/* About Section */}
          <Text style={styles.sectionHeading}>About this Course</Text>
          <Text style={styles.descriptionText}>{course.description}</Text>

          {/* Syllabus / Sections if present */}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : detail?.sections && detail.sections.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionHeading}>Course Syllabus</Text>
              {detail.sections.map((sec, idx) => (
                <View key={sec.id || idx} style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>{sec.title}</Text>
                  {sec.lessons.map((les) => (
                    <View key={les.id} style={styles.lessonRow}>
                      <Ionicons
                        name={les.is_completed ? 'checkmark-circle' : 'play-circle'}
                        size={18}
                        color={les.is_completed ? Colors.emerald : Colors.primaryLight}
                      />
                      <Text style={styles.lessonTitle}>{les.title}</Text>
                      <Text style={styles.lessonTime}>
                        {Math.floor(les.duration_seconds / 60)}m
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating Bottom Enroll / Start CTA */}
      <View
        style={[
          styles.bottomBar,
          elevationStyle(4),
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
          },
        ]}
      >
        <View style={styles.priceCol}>
          <Text style={styles.statusLabel}>Enrolled Status</Text>
          <Text style={styles.statusValue}>
            {course.is_enrolled ? 'Already Enrolled' : 'Ready to Start'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.enrollBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (course.is_enrolled) {
              navigation.navigate('Dashboard');
            } else {
              navigation.navigate('Login');
            }
          }}
        >
          <Text style={styles.enrollBtnText}>
            {course.is_enrolled ? 'Go to Learning' : 'Enroll / Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  coverWrapper: {
    width: '100%',
    height: 280,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTextContainer: {
    padding: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.badgeBg,
    borderColor: Colors.badgeBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: Colors.primaryLight,
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
    padding: 20,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  statLbl: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  vDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  sectionHeading: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  descriptionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    backgroundColor: Colors.backgroundInput,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priceCol: {
    flex: 1,
  },
  statusLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  statusValue: {
    color: Colors.emerald,
    fontSize: 15,
    fontWeight: '700',
  },
  enrollBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  enrollBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
