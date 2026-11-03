import React, { useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, cardShadow } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const floatAnim = useRef(new Animated.Value(0)).current;

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

  // Featured Career Tracks for Mobile Swipe Carousel
  const featuredTracks = [
    {
      id: 'boc-12',
      badge: 'TOP TRACK',
      title: 'BOC-12 বিজনেস অপরচুনিটি',
      desc: 'ইমিগ্রেশন, ট্যাক্স রিটার্ন (730/UNICO) ও পার্তিতা ইভা খোলার কমপ্লিট গাইডলাইন।',
      duration: '83 hrs',
      lessons: '3 Modules',
      rating: '4.9 ★',
      badgeColor: '#0E7490',
      badgeBg: '#ECFEFF',
    },
    {
      id: 'contabilita',
      badge: 'CAREER SKILL',
      title: 'Contabilità (কন্তাবিলিতা) কমপ্লিট কোর্স',
      desc: 'বাংলা ভাষায় সম্পূর্ণ হিসাবরক্ষণ, ভ্যাট ইনভয়েস ও ছোট-মাঝারি ব্যবসার জন্য নিখুঁত গাইড।',
      duration: '45 hrs',
      lessons: 'Full Series',
      rating: '5.0 ★',
      badgeColor: '#059669',
      badgeBg: '#ECFDF5',
    },
    {
      id: 'colf-badanti',
      badge: 'JOB READY',
      title: 'Colf, Badanti ও Lavoro Domestico',
      desc: 'ইতালিতে পেশাদার ও আইনসম্মত গৃহসেবা প্রশিক্ষণ, চুক্তি ও অধিকার সহায়িকা।',
      duration: '30 hrs',
      lessons: 'Certification',
      rating: '4.8 ★',
      badgeColor: '#7C3AED',
      badgeBg: '#F5F3FF',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Mobile Navbar - Clean brand + Single Sign In Button */}
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
            <Text style={styles.brandSub}>LEARN • PRACTICE • CERTIFY</Text>
          </View>
        </View>

        {/* Single, Sleek Top-Right Sign In Pill */}
        <TouchableOpacity
          style={styles.navSignInBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.75}
        >
          <Ionicons name="person-circle-outline" size={17} color={Colors.signal} style={{ marginRight: 5 }} />
          <Text style={styles.navSignInText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Mobile App Greeting Tag */}
        <View style={styles.greetingBadgeRow}>
          <View style={styles.greetingPill}>
            <Text style={styles.greetingDot}>●</Text>
            <Text style={styles.greetingText}>ITALY & EUROPE LEARNER PORTAL</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroHeadline}>
            Build practical skills that{' '}
            <Text style={styles.heroHeadlineSignal}>move you forward.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            A distraction-free executive learning space. Stream practical video modules, submit real-world assignments, and obtain verifiable accredited diplomas.
          </Text>

          {/* Primary Mobile Action: Single, bold and clean (Duplicate Sign In removed) */}
          <TouchableOpacity
            style={[styles.primaryExploreBtn, cardShadow(2)]}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryExploreText}>Explore All Courses</Text>
            <View style={styles.primaryArrowCircle}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Social Proof Strip */}
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

        {/* Hero Feature 3D Card with Floating Mobile Stat Chips */}
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

          {/* Floating Mobile Feature Tags */}
          <View style={styles.floatingTagTopRight}>
            <Ionicons name="ribbon" size={14} color="#0E7490" />
            <Text style={styles.floatingTagText}>Accredited EU Diplomas</Text>
          </View>
        </Animated.View>

        {/* Featured Career Tracks Carousel (Bespoke Mobile Component) */}
        <View style={styles.tracksHeader}>
          <View>
            <Text style={styles.sectionTitle}>Featured Career Tracks</Text>
            <Text style={styles.sectionSubtitle}>
              Swipe to explore popular Italian business & career programs
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tracksCarousel}
        >
          {featuredTracks.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.trackCard, cardShadow(1)]}
              onPress={() => navigation.navigate('MainTabs')}
              activeOpacity={0.88}
            >
              <View style={[styles.trackBadge, { backgroundColor: item.badgeBg }]}>
                <Text style={[styles.trackBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
              </View>

              <Text style={styles.trackTitle} numberOfLines={2}>
                {item.title}
              </Text>

              <Text style={styles.trackDesc} numberOfLines={3}>
                {item.desc}
              </Text>

              <View style={styles.trackFooter}>
                <View style={styles.trackMeta}>
                  <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.trackMetaText}>{item.duration}</Text>
                </View>
                <View style={styles.trackMeta}>
                  <Ionicons name="play-circle-outline" size={13} color={Colors.signal} />
                  <Text style={styles.trackMetaText}>{item.lessons}</Text>
                </View>
                <Text style={styles.trackRating}>{item.rating}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Why Learn on TMM App — 3 Native App Advantages */}
        <View style={styles.perksSection}>
          <Text style={styles.sectionTitle}>Built for Your Mobile Routine</Text>
          <Text style={styles.sectionSubtitle}>
            Learn anytime on your phone with seamless sync
          </Text>

          <View style={styles.perksGrid}>
            <View style={[styles.perkCard, cardShadow(1)]}>
              <View style={[styles.perkIconWrap, { backgroundColor: '#ECFEFF' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#0E7490" />
              </View>
              <Text style={styles.perkTitle}>Mobile Video Player</Text>
              <Text style={styles.perkDesc}>
                Auto-saves your progress as you watch; resumes right where you left off.
              </Text>
            </View>

            <View style={[styles.perkCard, cardShadow(1)]}>
              <View style={[styles.perkIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="document-text-outline" size={20} color="#059669" />
              </View>
              <Text style={styles.perkTitle}>Instant PDF Certificates</Text>
              <Text style={styles.perkDesc}>
                Complete quizzes & exams to immediately unlock verifiable digital credentials.
              </Text>
            </View>

            <View style={[styles.perkCard, cardShadow(1)]}>
              <View style={[styles.perkIconWrap, { backgroundColor: '#FDF4FF' }]}>
                <Ionicons name="chatbubbles-outline" size={20} color="#A21CAF" />
              </View>
              <Text style={styles.perkTitle}>Interactive Mentorship</Text>
              <Text style={styles.perkDesc}>
                Ask questions and interact directly with instructors in lesson comments.
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
    fontSize: 8,
    fontWeight: '700',
    color: Colors.signal,
    letterSpacing: 0.8,
  },
  navSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  navSignInText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.signal,
  },

  scrollBody: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  /* Greeting Badge */
  greetingBadgeRow: {
    marginBottom: 10,
  },
  greetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  greetingDot: {
    color: '#0E7490',
    fontSize: 9,
  },
  greetingText: {
    color: '#0E7490',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  heroBlock: {
    marginBottom: 20,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textMain,
    lineHeight: 36,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  heroHeadlineSignal: {
    color: Colors.signal,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 18,
  },

  /* Single prominent primary CTA */
  primaryExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.signal,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 18,
  },
  primaryExploreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  primaryArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Social proof */
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
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
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 24,
    position: 'relative',
  },
  heroIllustration: {
    width: '100%',
    height: Math.round((SCREEN_WIDTH - 36) * 0.72),
  },
  floatingTagTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  floatingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E7490',
  },

  /* Career Tracks Carousel */
  tracksHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tracksCarousel: {
    paddingRight: 12,
    paddingBottom: 6,
    gap: 12,
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
    marginBottom: 12,
  },
  perksGrid: {
    marginTop: 14,
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
