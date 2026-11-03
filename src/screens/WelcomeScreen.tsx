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

  return (
    <View style={styles.container}>
      {/* Top Navbar — Clean Brand Header (Sign In button removed from top) */}
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

        {/* Clean Language / Region Indicator */}
        <View style={styles.langIndicator}>
          <Ionicons name="globe-outline" size={14} color={Colors.signal} />
          <Text style={styles.langIndicatorText}>EN / BN</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 28 },
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

          {/* Action Buttons: Browse Courses & Single Sign In */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryBrowseBtn, cardShadow(2)]}
              onPress={() => navigation.navigate('MainTabs')}
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
              onPress={() => navigation.navigate('MainTabs')}
            >
              <Text style={[styles.filterPillText, styles.filterPillTextActive]}>All courses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPill}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <Text style={styles.filterPillText}>TOP Courses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPill}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <Text style={styles.filterPillText}>New-পেশাদার কোর্স</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPill}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <Text style={styles.filterPillText}>Advance & Popular Course</Text>
            </TouchableOpacity>
          </ScrollView>
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
  langIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.signalTint,
    borderWidth: 1,
    borderColor: Colors.signalTintBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  langIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
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
    marginBottom: 10,
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
});
