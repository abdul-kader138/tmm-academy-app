import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';
import { CourseCatalogItem } from '../api/types';
import { cleanHtml } from '../utils/text';
import { getCoursePricing } from '../utils/pricing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const handleOpenCourses = () => {
    if (user) {
      navigation.navigate('MainTabs', { screen: 'CatalogTab' });
    } else {
      navigation.navigate('CourseCatalog');
    }
  };

  useEffect(() => {
    if (user) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const data = await lmsApi.getCourses();
        if (isMounted && Array.isArray(data)) {
          setCourses(data);
        }
      } catch {
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Subtle breathing float for the hero illustration
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 6,
          duration: 2600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={styles.container}>
      {/* Top Navbar — Pure Brand Logo & Title (EN/BN and duplicate sign-in removed) */}
      <View
        style={[
          styles.navbar,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 14),
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/tmm-academy-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>TMM Academy</Text>
            <Text style={styles.brandSub}>LEARN, PRACTICE, AND EARN CERTIFICATES.</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Hero Section */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroHeadline}>
            Build practical skills that{' '}
            <Text style={styles.heroHeadlineSignal}>move you forward.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            A calm, distraction-free learning space designed for modern professionals. Practical video modules, real-world project reviews, and verifiable industry certificates.
          </Text>

          {/* Action Buttons: Browse Courses & Single Clean Sign In */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryBrowseBtn, cardShadow(2)]}
              onPress={handleOpenCourses}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBrowseText}>Browse Courses</Text>
              <Ionicons name="chevron-down" size={17} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondarySignInBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondarySignInText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Learner Satisfaction / Social Proof */}
          <View style={styles.socialProofRow}>
            <View style={styles.avatarStack}>
              <View style={[styles.avatarCircle, { backgroundColor: '#0284c7' }]}>
                <Text style={styles.avatarInitial}>AL</Text>
              </View>
              <View style={[styles.avatarCircle, { backgroundColor: '#0d9488', marginLeft: -8 }]}>
                <Text style={styles.avatarInitial}>MK</Text>
              </View>
              <View style={[styles.avatarCircle, { backgroundColor: '#6366f1', marginLeft: -8 }]}>
                <Text style={styles.avatarInitial}>SR</Text>
              </View>
              <View style={[styles.avatarCircle, { backgroundColor: '#0f172a', marginLeft: -8 }]}>
                <Text style={styles.avatarInitial}>+1k</Text>
              </View>
            </View>

            <View style={styles.ratingInfo}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name="star" size={13} color={Colors.star} style={{ marginRight: 2 }} />
                ))}
                <Text style={styles.ratingScore}>4.9 / 5</Text>
              </View>
              <Text style={styles.ratingCaption}>
                Learner satisfaction across all accredited courses
              </Text>
            </View>
          </View>
        </View>

        {/* Hero Feature 3D Card (The official app illustration from academy.tmminnovation.com) */}
        <Animated.View
          style={[
            styles.heroCardContainer,
            cardShadow(2),
            {
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <Image
            source={require('../../assets/tmm-hero-card.png')}
            style={styles.heroIllustration}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Available Courses Header */}
        <View style={styles.coursesSectionHeader}>
          <Text style={styles.sectionTitle}>Available Courses</Text>
          <Text style={styles.sectionSubtitle}>
            Select an enrolled course to jump into your classroom, or browse new tracks.
          </Text>

          {/* Track Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            <TouchableOpacity
              style={[styles.filterPill, styles.filterPillActive]}
              onPress={handleOpenCourses}
            >
              <Text style={[styles.filterPillText, styles.filterPillTextActive]}>All courses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPill}
              onPress={handleOpenCourses}
            >
              <Text style={styles.filterPillText}>TOP Courses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPill}
              onPress={handleOpenCourses}
            >
              <Text style={styles.filterPillText}>New-পেশাদার কোর্স</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPill}
              onPress={handleOpenCourses}
            >
              <Text style={styles.filterPillText}>Advance & Popular Course</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ================= EXTRA RICH FEATURES ADDED BELOW AVAILABLE COURSES ================= */}

        {/* 1. Featured Career Tracks Horizontal Carousel (Dynamic from LMS API) */}
        <View style={styles.tracksCarouselHeader}>
          <Text style={styles.subSectionTitle}>Featured Career Tracks</Text>
          <Text style={styles.subSectionSubtitle}>
            Swipe through in-demand executive programs tailored for Italy
          </Text>
        </View>

        {loadingCourses ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.signal} />
          </View>
        ) : courses.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tracksCarouselScroll}
          >
            {courses.slice(0, 6).map((item) => {
              const pricing = getCoursePricing(item);
              const durationHours = Math.round((item.duration_minutes || 0) / 60);
              const durationText =
                durationHours > 0
                  ? `${durationHours}h`
                  : item.duration_minutes > 0
                  ? `${item.duration_minutes}m`
                  : 'Self-paced';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.trackCard, cardShadow(1)]}
                  onPress={() => navigation.navigate('CourseDetail', { course: item })}
                  activeOpacity={0.88}
                >
                  {Boolean(item.eyebrow) && (
                    <View style={[styles.trackBadge, { backgroundColor: '#ECFEFF' }]}>
                      <Text style={[styles.trackBadgeText, { color: '#0E7490' }]}>
                        {item.eyebrow!.toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.trackTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.trackDesc} numberOfLines={3}>
                    {cleanHtml(item.description_text || item.description)}
                  </Text>

                  <View style={styles.trackFooter}>
                    <View style={styles.trackMeta}>
                      <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.trackMetaText}>{durationText}</Text>
                    </View>
                    <View style={styles.trackMeta}>
                      <Ionicons name="play-circle-outline" size={13} color={Colors.signal} />
                      <Text style={styles.trackMetaText}>{item.lessons_count || 0} Lessons</Text>
                    </View>
                    <Text style={styles.trackRating}>{pricing.displayPrice}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* 2. Built for Your Mobile Routine — 3 App Advantages */}
        <View style={styles.perksSection}>
          <Text style={styles.subSectionTitle}>Built for Your Mobile Routine</Text>
          <Text style={styles.subSectionSubtitle}>
            Learn anytime on your smartphone with seamless cloud synchronization
          </Text>

          <View style={styles.perksGrid}>
            <View style={[styles.perkCard, cardShadow(1)]}>
              <View style={[styles.perkIconWrap, { backgroundColor: '#ECFEFF' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#0E7490" />
              </View>
              <Text style={styles.perkTitle}>Mobile Video Player</Text>
              <Text style={styles.perkDesc}>
                Auto-saves your progress as you watch; auto-completes lessons at 90% runtime.
              </Text>
            </View>

            <View style={[styles.perkCard, cardShadow(1)]}>
              <View style={[styles.perkIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="ribbon-outline" size={20} color="#059669" />
              </View>
              <Text style={styles.perkTitle}>Instant Verifiable Diplomas</Text>
              <Text style={styles.perkDesc}>
                Complete quizzes & exams to immediately download official, tamper-evident PDF certificates.
              </Text>
            </View>

            <View style={[styles.perkCard, cardShadow(1)]}>
              <View style={[styles.perkIconWrap, { backgroundColor: '#FDF4FF' }]}>
                <Ionicons name="chatbubbles-outline" size={20} color="#A21CAF" />
              </View>
              <Text style={styles.perkTitle}>Interactive Mentor Q&A</Text>
              <Text style={styles.perkDesc}>
                Ask questions and interact directly with instructors in lesson comment threads.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoImage: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  brandTextWrap: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.2,
  },
  brandSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.signal,
    letterSpacing: 0.6,
  },

  scrollBody: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  heroBlock: {
    marginBottom: 22,
  },
  heroHeadline: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textMain,
    lineHeight: 38,
    letterSpacing: -0.8,
    marginBottom: 14,
  },
  heroHeadlineSignal: {
    color: Colors.signal,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  primaryBrowseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.signal,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9,
    gap: 8,
  },
  primaryBrowseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondarySignInBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  secondarySignInText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },

  /* Social proof */
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  ratingInfo: {
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMain,
    marginLeft: 4,
  },
  ratingCaption: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },

  /* Hero Feature Card */
  heroCardContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 28,
  },
  heroIllustration: {
    width: '100%',
    height: Math.round((SCREEN_WIDTH - 36) * 0.78),
  },

  /* Available courses section */
  coursesSectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: Colors.signalTint,
    borderColor: Colors.signalTintBorder,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.signal,
    fontWeight: '700',
  },

  /* Extra Features Added Below Available Courses */
  tracksCarouselHeader: {
    marginTop: 10,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subSectionSubtitle: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tracksCarouselScroll: {
    paddingRight: 10,
    paddingBottom: 6,
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  trackCard: {
    width: SCREEN_WIDTH * 0.72,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'space-between',
  },
  trackBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  trackBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMain,
    lineHeight: 20,
    marginBottom: 6,
  },
  trackDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 14,
  },
  trackFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackMetaText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  trackRating: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.star,
  },

  /* Perks Section */
  perksSection: {
    marginTop: 6,
    marginBottom: 10,
  },
  perksGrid: {
    marginTop: 12,
    gap: 10,
  },
  perkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  perkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  perkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 4,
  },
  perkDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});
