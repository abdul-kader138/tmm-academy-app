import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 30px x 30px SaaS glowing dot grid matching TMS aesthetic.
 */
const SaaSDotGrid = React.memo(() => {
  const cols = Math.ceil(SCREEN_WIDTH / 30);
  const rows = Math.ceil(SCREEN_HEIGHT / 30);
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: c * 30 + 14,
            top: r * 30 + 14,
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(129, 140, 248, 0.18)',
          }}
        />
      );
    }
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots}
    </View>
  );
});

/**
 * Interactive Dark Vector LMS Milestone Network HTML
 * Features animated bezier neural learning paths, pulsing radar rings,
 * glowing milestone badges (BOC-12, Legal/Permesso, CAF/ISEE, Partita IVA, Diploma),
 * and an animated traveling student beacon with light pulse trails.
 */
const DARK_LMS_SHOWCASE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent !important;
      background-color: transparent !important;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #stage {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
    }
    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .flow-line {
      stroke-dasharray: 6 6;
      animation: dashMove 1.8s linear infinite;
    }
    @keyframes dashMove {
      from { stroke-dashoffset: 24; }
      to { stroke-dashoffset: 0; }
    }
    .pulse-ring {
      transform-origin: center;
      animation: pulseAnim 2.8s ease-out infinite;
    }
    @keyframes pulseAnim {
      0% { r: 6px; opacity: 0.8; stroke-width: 1.5px; }
      70% { r: 18px; opacity: 0.15; stroke-width: 1px; }
      100% { r: 24px; opacity: 0; stroke-width: 0.5px; }
    }
    .floating-beacon {
      animation: beaconFloat 3.2s ease-in-out infinite alternate;
    }
    @keyframes beaconFloat {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-3px); }
    }
  </style>
</head>
<body>
  <div id="stage">
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#818cf8" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.9" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
        </linearGradient>
        <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.6" />
        </filter>
      </defs>

      <!-- Background Network Grid / Constellation lines -->
      <path d="M 40,120 L 120,55 L 200,135 L 290,65 L 360,125"
            fill="none" stroke="rgba(129, 140, 248, 0.15)" stroke-width="1.2" />
      <path d="M 120,55 L 290,65" fill="none" stroke="rgba(6, 182, 212, 0.10)" stroke-dasharray="3 3" />
      <path d="M 40,120 L 200,135" fill="none" stroke="rgba(129, 140, 248, 0.10)" stroke-dasharray="3 3" />

      <!-- Main Animated Career Highway Bezier Path -->
      <path id="learningPath"
            d="M 40,120 C 80,60 100,50 120,55 C 150,60 170,140 200,135 C 240,130 260,60 290,65 C 320,70 340,115 360,125"
            fill="none" stroke="url(#pathGrad)" stroke-width="2.5" class="flow-line" />

      <!-- Milestone 1: BOC-12 -->
      <g transform="translate(40, 120)">
        <circle cx="0" cy="0" r="14" fill="rgba(129, 140, 248, 0.1)" stroke="rgba(129, 140, 248, 0.35)" class="pulse-ring" />
        <circle cx="0" cy="0" r="5" fill="#818cf8" stroke="#ffffff" stroke-width="2" />
        <g transform="translate(-24, -26)" filter="url(#shadowFilter)">
          <rect width="48" height="18" rx="5" fill="rgba(15, 23, 42, 0.94)" stroke="rgba(129, 140, 248, 0.5)" stroke-width="0.8" />
          <text x="24" y="12" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="800" letter-spacing="0.5">BOC-12</text>
        </g>
      </g>

      <!-- Milestone 2: LEGAL & PERMESSO -->
      <g transform="translate(120, 55)">
        <circle cx="0" cy="0" r="14" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.35)" class="pulse-ring" style="animation-delay: 0.6s;" />
        <circle cx="0" cy="0" r="5" fill="#06b6d4" stroke="#ffffff" stroke-width="2" />
        <g transform="translate(-28, -26)" filter="url(#shadowFilter)">
          <rect width="56" height="18" rx="5" fill="rgba(15, 23, 42, 0.94)" stroke="rgba(6, 182, 212, 0.5)" stroke-width="0.8" />
          <text x="28" y="12" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="800" letter-spacing="0.5">PERMESSO</text>
        </g>
      </g>

      <!-- Milestone 3: CAF & ISEE -->
      <g transform="translate(200, 135)">
        <circle cx="0" cy="0" r="14" fill="rgba(139, 92, 246, 0.1)" stroke="rgba(139, 92, 246, 0.35)" class="pulse-ring" style="animation-delay: 1.2s;" />
        <circle cx="0" cy="0" r="5" fill="#a855f7" stroke="#ffffff" stroke-width="2" />
        <g transform="translate(-32, -26)" filter="url(#shadowFilter)">
          <rect width="64" height="18" rx="5" fill="rgba(15, 23, 42, 0.94)" stroke="rgba(168, 85, 247, 0.5)" stroke-width="0.8" />
          <text x="32" y="12" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="800" letter-spacing="0.5">CAF & ISEE</text>
        </g>
      </g>

      <!-- Milestone 4: PARTITA IVA -->
      <g transform="translate(290, 65)">
        <circle cx="0" cy="0" r="14" fill="rgba(245, 158, 11, 0.1)" stroke="rgba(245, 158, 11, 0.35)" class="pulse-ring" style="animation-delay: 1.8s;" />
        <circle cx="0" cy="0" r="5" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
        <g transform="translate(-34, -26)" filter="url(#shadowFilter)">
          <rect width="68" height="18" rx="5" fill="rgba(15, 23, 42, 0.94)" stroke="rgba(245, 158, 11, 0.5)" stroke-width="0.8" />
          <text x="34" y="12" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="800" letter-spacing="0.5">PARTITA IVA</text>
        </g>
      </g>

      <!-- Milestone 5: ACCREDITED DIPLOMA -->
      <g transform="translate(360, 125)">
        <circle cx="0" cy="0" r="16" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.45)" class="pulse-ring" style="animation-delay: 2.4s;" />
        <circle cx="0" cy="0" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2.5" />
        <g transform="translate(-32, -26)" filter="url(#shadowFilter)">
          <rect width="64" height="18" rx="5" fill="rgba(15, 23, 42, 0.94)" stroke="rgba(16, 185, 129, 0.6)" stroke-width="0.8" />
          <text x="32" y="12" text-anchor="middle" fill="#34d399" font-size="9" font-weight="900" letter-spacing="0.5">DIPLOMA ★</text>
        </g>
      </g>

      <!-- Traveling Student Beacon / Learning Progress Orb -->
      <g id="traveler" class="floating-beacon">
        <!-- Outer Halo -->
        <circle cx="0" cy="0" r="11" fill="rgba(99, 102, 241, 0.25)" stroke="rgba(129, 140, 248, 0.7)" stroke-width="1.2" />
        <!-- Inner Core -->
        <circle cx="0" cy="0" r="5" fill="#ffffff" />
        <!-- Micro Grad Cap Icon -->
        <polygon points="-4,-2 0,-5 4,-2 0,1" fill="#4f46e5" />
      </g>
    </svg>
  </div>

  <script>
    const path = document.getElementById('learningPath');
    const traveler = document.getElementById('traveler');
    let totalLen = 0;
    try {
      totalLen = path.getTotalLength();
    } catch(e) {}

    let progress = 0;
    let speed = 0.0016;

    function animate() {
      if (totalLen > 0) {
        progress += speed;
        if (progress > 1) progress = 0;
        const pt = path.getPointAtLength(progress * totalLen);
        traveler.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ',' + pt.y.toFixed(1) + ')');
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  </script>
</body>
</html>
`;

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<any>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const slide = Math.round(offsetX / SCREEN_WIDTH);
    if (slide !== activeSlide) {
      setActiveSlide(slide);
    }
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Full Screen Background Gradient */}
      <LinearGradient
        colors={['rgb(15, 23, 42)', 'rgb(30, 27, 75)', 'rgb(49, 46, 129)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Full-bleed Ambient Glow Orbs */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      {/* Full Screen Content Wrapper with Safe Insets */}
      <View
        style={[
          styles.mainWrapper,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 14),
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 12 : 16),
          },
        ]}
      >
        {/* Top Navbar matching TMS Branding Header */}
        <View style={styles.topNavbar}>
          <View style={styles.brandGroup}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.brandTitle}>TMM ACADEMY</Text>
              <Text style={styles.brandSub}>INNOVATION & LEARNING</Text>
            </View>
          </View>

          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ITALY • LMS</Text>
          </View>
        </View>

        {/* Paged Full-Screen Horizontal Carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {/* ===================== SLIDE 1: Interactive Milestone Showcase ===================== */}
          <View style={[styles.fullSlide, { width: SCREEN_WIDTH }]}>
            {/* SaaS Dot Grid Background */}
            <SaaSDotGrid />

            <View style={styles.slideFlexContainer}>
              <View style={styles.topContentBlock}>
                {/* Clean Dark Interactive Milestone Network Canvas Frame */}
                <View style={styles.mapCardFrame}>
                  <View style={styles.mapWebViewWrapper} pointerEvents="none">
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: DARK_LMS_SHOWCASE_HTML }}
                      style={{ backgroundColor: 'transparent' }}
                      containerStyle={{ backgroundColor: 'transparent' }}
                      scrollEnabled={false}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      androidLayerType="software"
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                      scalesPageToFit={Platform.OS === 'android'}
                      mixedContentMode="always"
                      allowsInlineMediaPlayback={true}
                    />
                  </View>
                </View>

                {/* Hero Section: Learn with Excellence & Badges */}
                <View style={styles.heroSection}>
                  <Text style={styles.heroTitle}>
                    Learn with <Text style={styles.heroTitleAccent}>excellence.</Text>
                  </Text>
                  <Text style={styles.heroSubTitle}>
                    Master professional Italian business opportunities, immigration laws, tax filing, and vocational certifications.
                  </Text>

                  {/* Feature Badges */}
                  <View style={styles.humanFeatureRow}>
                    <View style={styles.humanFeaturePill}>
                      <Ionicons name="ribbon-outline" size={13} color="rgb(129, 140, 248)" />
                      <Text style={styles.humanFeatureText}>Accredited</Text>
                    </View>
                    <View style={styles.humanFeaturePill}>
                      <Ionicons name="flash-outline" size={13} color="rgb(129, 140, 248)" />
                      <Text style={styles.humanFeatureText}>Self-Paced</Text>
                    </View>
                    <View style={styles.humanFeaturePill}>
                      <Ionicons name="language-outline" size={13} color="rgb(129, 140, 248)" />
                      <Text style={styles.humanFeatureText}>IT • EN • BN</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Bottom Action Area: Get Started & Sign In Buttons */}
              <View style={styles.bottomActionBox}>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => navigation.navigate('MainTabs')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['rgb(99, 102, 241)', 'rgb(79, 70, 229)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryActionGradient}
                  >
                    <Text style={styles.primaryActionText}>Explore Courses</Text>
                    <Ionicons name="arrow-forward" size={17} color="#ffffff" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.signInPromptRow}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signInPromptText}>
                    Already a registered learner?{' '}
                    <Text style={styles.signInPromptLink}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ===================== SLIDE 2: Career Impact & Diplomas ===================== */}
          <View style={[styles.fullSlide, { width: SCREEN_WIDTH }]}>
            <SaaSDotGrid />

            <View style={styles.slideFlexContainer}>
              <View style={styles.topContentBlock}>
                {/* Secondary Highlight Feature Card */}
                <View style={styles.featureCardFrame}>
                  <LinearGradient
                    colors={['rgba(99, 102, 241, 0.22)', 'rgba(30, 27, 75, 0.8)']}
                    style={styles.featureCardGradient}
                  >
                    <View style={styles.shieldIconWrapper}>
                      <Ionicons name="shield-checkmark" size={38} color={Colors.cyan} />
                    </View>
                    <Text style={styles.featureCardTitle}>Recognized Career Certification</Text>
                    <Text style={styles.featureCardDesc}>
                      Every course completion awards a verified, downloadable PDF certificate with unique tamper-evident verification codes.
                    </Text>

                    <View style={styles.highlightPillsRow}>
                      <View style={styles.highlightPill}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.emerald} />
                        <Text style={styles.highlightPillText}>Contabilità & 730</Text>
                      </View>
                      <View style={styles.highlightPill}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.emerald} />
                        <Text style={styles.highlightPillText}>Permesso di Soggiorno</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Hero Section 2 */}
                <View style={styles.heroSection}>
                  <Text style={styles.heroTitle}>
                    Build your future in <Text style={styles.heroTitleAccent}>Italy.</Text>
                  </Text>
                  <Text style={styles.heroSubTitle}>
                    Complete video lessons, complete quizzes, submit projects, and obtain your official diploma.
                  </Text>

                  <View style={styles.humanFeatureRow}>
                    <View style={styles.humanFeaturePill}>
                      <Ionicons name="desktop-outline" size={13} color="rgb(129, 140, 248)" />
                      <Text style={styles.humanFeatureText}>Full HD Video</Text>
                    </View>
                    <View style={styles.humanFeaturePill}>
                      <Ionicons name="shield-outline" size={13} color="rgb(129, 140, 248)" />
                      <Text style={styles.humanFeatureText}>2FA Secure</Text>
                    </View>
                    <View style={styles.humanFeaturePill}>
                      <Ionicons name="people-outline" size={13} color="rgb(129, 140, 248)" />
                      <Text style={styles.humanFeatureText}>Consultancy</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Bottom Action Area 2 */}
              <View style={styles.bottomActionBox}>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['rgb(99, 102, 241)', 'rgb(79, 70, 229)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryActionGradient}
                  >
                    <Text style={styles.primaryActionText}>Sign In to Learner Portal</Text>
                    <Ionicons name="arrow-forward" size={17} color="#ffffff" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.signInPromptRow}
                  onPress={() => goToSlide(0)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signInPromptText}>
                    <Ionicons name="arrow-back" size={13} color="rgb(129, 140, 248)" /> Back to Overview
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Carousel Indicators */}
        <View style={styles.indicatorRow}>
          <TouchableOpacity onPress={() => goToSlide(0)}>
            <View style={[styles.dot, activeSlide === 0 ? styles.activeDot : styles.inactiveDot]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goToSlide(1)}>
            <View style={[styles.dot, activeSlide === 1 ? styles.activeDot : styles.inactiveDot]} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(15, 23, 42)',
  },
  mainWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.35,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: (SCREEN_WIDTH * 0.9) / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: (SCREEN_WIDTH * 0.8) / 2,
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 10,
    zIndex: 10,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 26,
    height: 26,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgb(129, 140, 248)',
    letterSpacing: 1.2,
  },
  adminBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1.2,
  },

  /* Carousel */
  carousel: {
    flex: 1,
  },
  fullSlide: {
    flex: 1,
    paddingHorizontal: 22,
  },
  slideFlexContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  topContentBlock: {
    width: '100%',
  },

  /* Dark Milestone Network Showcase Frame */
  mapCardFrame: {
    height: Math.round(SCREEN_HEIGHT * 0.28),
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    marginTop: 14,
  },
  mapWebViewWrapper: {
    ...StyleSheet.absoluteFill,
  },

  /* Feature Card for Slide 2 */
  featureCardFrame: {
    height: Math.round(SCREEN_HEIGHT * 0.28),
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    marginTop: 14,
  },
  featureCardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  featureCardDesc: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
  },
  highlightPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  highlightPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  /* Hero Section */
  heroSection: {
    marginTop: Math.round(SCREEN_HEIGHT * 0.035),
    marginBottom: 0,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: 'rgb(255, 255, 255)',
    lineHeight: 32,
    marginBottom: 12,
  },
  heroTitleAccent: {
    color: 'rgb(129, 140, 248)',
  },
  heroSubTitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.58)',
    lineHeight: 19,
    marginBottom: 16,
  },

  /* Human Feature Pills */
  humanFeatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  humanFeaturePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  humanFeatureText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  /* Bottom Action Area: Get Started & Sign In */
  bottomActionBox: {
    marginTop: 10,
    marginBottom: 6,
    gap: 10,
  },
  primaryActionButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: 'rgb(99, 102, 241)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  signInPromptRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  signInPromptText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  signInPromptLink: {
    color: 'rgb(129, 140, 248)',
    fontWeight: '700',
  },

  /* Carousel Dots */
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 22,
    backgroundColor: 'rgb(129, 140, 248)',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
