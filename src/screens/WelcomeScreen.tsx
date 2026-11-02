import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 30px x 30px glowing SaaS dot grid.
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
            backgroundColor: 'rgba(129, 140, 248, 0.16)',
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
 * Cinematic 3D Book Opening Animation:
 * 1. Book starts closed in 3D space.
 * 2. Hardcover flips open smoothly with realistic perspective shadows.
 * 3. Golden & cyan pages flip sequentially.
 * 4. A luminous volumetric light beam erupts from the book spine.
 * 5. Floating knowledge particles and course icons (🎓, 📜, 💡, ⭐, 💼) rise out of the open pages!
 */
const BOOK_3D_OPENING_HTML = `
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
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scene {
      width: 320px;
      height: 220px;
      position: relative;
      perspective: 1200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Ambient Spotlight behind book */
    .spotlight {
      position: absolute;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(6, 182, 212, 0.15) 45%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: pulseGlow 4s ease-in-out infinite alternate;
    }
    @keyframes pulseGlow {
      0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
      100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.95; }
    }

    /* Vertical Light Rays Erupting from the Open Book */
    .light-beam {
      position: absolute;
      width: 90px;
      height: 140px;
      background: linear-gradient(to top, rgba(129, 140, 248, 0.5) 0%, rgba(6, 182, 212, 0.25) 50%, transparent 100%);
      clip-path: polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%);
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      animation: beamRise 2.5s cubic-bezier(0.16, 1, 0.3, 1) 1.2s forwards;
      pointer-events: none;
      filter: blur(2px);
    }
    @keyframes beamRise {
      0% { opacity: 0; height: 30px; }
      50% { opacity: 0.9; }
      100% { opacity: 0.75; height: 130px; }
    }

    /* The 3D Book Container */
    .book {
      position: relative;
      width: 140px;
      height: 190px;
      transform-style: preserve-3d;
      transform: rotateX(24deg) rotateY(-8deg) rotateZ(0deg);
      transition: transform 0.6s ease;
      animation: bookFloat 4s ease-in-out infinite alternate;
    }
    @keyframes bookFloat {
      0% { transform: rotateX(24deg) rotateY(-8deg) translateY(0px); }
      100% { transform: rotateX(20deg) rotateY(-5deg) translateY(-8px); }
    }

    /* Base Back Cover */
    .back-cover {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #1e1b4b, #0f172a);
      border-radius: 4px 14px 14px 4px;
      border: 1.5px solid rgba(129, 140, 248, 0.4);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(99, 102, 241, 0.3);
      transform: translateZ(-8px);
    }

    /* Page Spines / Stack */
    .page-stack {
      position: absolute;
      right: 4px;
      top: 6px;
      bottom: 6px;
      width: 130px;
      background: linear-gradient(to right, #0f172a, #1e293b, #f8fafc);
      border-radius: 2px 10px 10px 2px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }

    /* Flappable Page 1 */
    .page-flip-1 {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border-radius: 4px 12px 12px 4px;
      border: 1px solid rgba(129, 140, 248, 0.3);
      transform-origin: left center;
      transform-style: preserve-3d;
      animation: flipPage1 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards;
      display: flex;
      flex-direction: column;
      padding: 16px;
      overflow: hidden;
    }
    @keyframes flipPage1 {
      0% { transform: rotateY(0deg); }
      100% { transform: rotateY(-130deg); }
    }

    /* Flappable Page 2 (Main Left Page when open) */
    .page-flip-2 {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #1e293b, #312e81);
      border-radius: 4px 12px 12px 4px;
      border: 1px solid rgba(6, 182, 212, 0.4);
      transform-origin: left center;
      transform-style: preserve-3d;
      animation: flipPage2 2.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.7s forwards;
      display: flex;
      flex-direction: column;
      padding: 14px;
      overflow: hidden;
    }
    @keyframes flipPage2 {
      0% { transform: rotateY(0deg); }
      100% { transform: rotateY(-110deg); }
    }

    /* Main Front Cover that Opens Wide */
    .front-cover {
      position: absolute;
      inset: 0;
      background: linear-gradient(145deg, #312e81 0%, #1e1b4b 50%, #0f172a 100%);
      border-radius: 4px 14px 14px 4px;
      border: 1.5px solid rgba(129, 140, 248, 0.6);
      transform-origin: left center;
      transform-style: preserve-3d;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
      animation: openFrontCover 2.2s cubic-bezier(0.25, 1, 0.5, 1) 0.2s forwards;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px;
      backface-visibility: hidden;
    }
    @keyframes openFrontCover {
      0% { transform: rotateY(0deg); }
      100% { transform: rotateY(-150deg); }
    }

    .cover-gold-border {
      width: 100%;
      height: 100%;
      border: 1.5px solid rgba(245, 158, 11, 0.5);
      border-radius: 2px 10px 10px 2px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .cover-emblem {
      font-size: 32px;
      margin-bottom: 6px;
      filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.6));
    }
    .cover-title {
      font-size: 11px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-align: center;
    }
    .cover-sub {
      font-size: 7.5px;
      color: #818cf8;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    /* Open Page Content (Inside Book) */
    .open-page-content {
      position: absolute;
      inset: 6px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
      border-radius: 2px 10px 10px 2px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid rgba(129, 140, 248, 0.3);
    }
    .page-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      padding-bottom: 6px;
    }
    .page-tag {
      font-size: 8px;
      font-weight: 800;
      color: #06b6d4;
      letter-spacing: 0.5px;
    }
    .page-icon {
      font-size: 10px;
    }

    .page-lines {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin: 8px 0;
    }
    .line {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.12);
    }
    .line-accent {
      background: linear-gradient(to right, #818cf8, #06b6d4);
      width: 75%;
    }

    .page-badge-footer {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(99, 102, 241, 0.2);
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid rgba(129, 140, 248, 0.35);
    }
    .badge-check {
      color: #10b981;
      font-size: 10px;
      font-weight: 900;
    }
    .badge-text {
      font-size: 8px;
      font-weight: 700;
      color: #f8fafc;
    }

    /* Floating Icons Emerging From the Book */
    .floating-item {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      filter: drop-shadow(0 0 8px rgba(129, 140, 248, 0.8));
      font-size: 22px;
      animation: floatUp 3.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }
    .item-1 {
      left: 38%;
      bottom: 75px;
      animation-delay: 1.4s;
    }
    .item-2 {
      left: 55%;
      bottom: 70px;
      font-size: 20px;
      animation-delay: 2.0s;
    }
    .item-3 {
      left: 28%;
      bottom: 80px;
      font-size: 19px;
      animation-delay: 2.6s;
    }
    .item-4 {
      left: 64%;
      bottom: 85px;
      font-size: 21px;
      animation-delay: 3.2s;
    }
    .item-5 {
      left: 46%;
      bottom: 65px;
      font-size: 24px;
      animation-delay: 1.7s;
    }

    @keyframes floatUp {
      0% {
        transform: translateY(0px) scale(0.4) rotate(0deg);
        opacity: 0;
      }
      20% {
        opacity: 1;
        transform: translateY(-25px) scale(1) rotate(6deg);
      }
      75% {
        opacity: 0.9;
        transform: translateY(-75px) scale(1.05) rotate(-6deg);
      }
      100% {
        transform: translateY(-110px) scale(0.7) rotate(12deg);
        opacity: 0;
      }
    }

    /* Golden Sparkles */
    .sparkle {
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 6px #f59e0b, 0 0 12px #f59e0b;
      animation: sparkleAnim 2.5s ease-in-out infinite;
    }
    .sp-1 { left: 42%; bottom: 90px; animation-delay: 0.4s; }
    .sp-2 { left: 52%; bottom: 85px; animation-delay: 1.1s; width: 5px; height: 5px; background: #38bdf8; }
    .sp-3 { left: 36%; bottom: 95px; animation-delay: 1.8s; }
    .sp-4 { left: 60%; bottom: 90px; animation-delay: 2.3s; }

    @keyframes sparkleAnim {
      0% { transform: translateY(0px) scale(0); opacity: 0; }
      50% { opacity: 1; transform: translateY(-40px) scale(1.4); }
      100% { transform: translateY(-80px) scale(0); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="scene">
    <!-- Ambient Spotlight -->
    <div class="spotlight"></div>

    <!-- Vertical Light Beam -->
    <div class="light-beam"></div>

    <!-- Floating Emojis / Course Icons Emerging from Pages -->
    <div class="floating-item item-1">🎓</div>
    <div class="floating-item item-2">📜</div>
    <div class="floating-item item-3">💼</div>
    <div class="floating-item item-4">🇮🇹</div>
    <div class="floating-item item-5">⭐</div>

    <!-- Floating Sparkles -->
    <div class="sparkle sp-1"></div>
    <div class="sparkle sp-2"></div>
    <div class="sparkle sp-3"></div>
    <div class="sparkle sp-4"></div>

    <!-- 3D Book Structure -->
    <div class="book">
      <!-- Back Cover -->
      <div class="back-cover"></div>

      <!-- Page Stack Thickness -->
      <div class="page-stack"></div>

      <!-- Inside Open Page -->
      <div class="open-page-content">
        <div class="page-header-row">
          <span class="page-tag">TMM ACADEMY</span>
          <span class="page-icon">🇮🇹</span>
        </div>
        <div class="page-lines">
          <div class="line line-accent"></div>
          <div class="line" style="width: 90%;"></div>
          <div class="line" style="width: 60%;"></div>
          <div class="line line-accent" style="width: 80%; margin-top: 4px;"></div>
        </div>
        <div class="page-badge-footer">
          <span class="badge-check">✓</span>
          <span class="badge-text">BOC-12 ACCREDITED</span>
        </div>
      </div>

      <!-- Page 2 (Flipping Page) -->
      <div class="page-flip-2"></div>

      <!-- Page 1 (Flipping Page) -->
      <div class="page-flip-1"></div>

      <!-- Front Hard Cover (Flips Open to Left) -->
      <div class="front-cover">
        <div class="cover-gold-border">
          <div class="cover-emblem">📖</div>
          <div class="cover-title">TMM ACADEMY</div>
          <div class="cover-sub">INNOVATION & LEARNING</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Fade in text and CTA smoothly after the book begins opening
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        delay: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Deep Gradient Background */}
      <LinearGradient
        colors={['rgb(15, 23, 42)', 'rgb(30, 27, 75)', 'rgb(49, 46, 129)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Glow Orbs */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      {/* SaaS Glowing Dot Grid */}
      <SaaSDotGrid />

      {/* Content Container */}
      <View
        style={[
          styles.mainWrapper,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 14),
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 14 : 18),
          },
        ]}
      >
        {/* Top Navbar */}
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

        {/* ================= 3D BOOK OPENING ANIMATION STAGE ================= */}
        <View style={styles.bookStageCard}>
          <View style={styles.webViewWrapper} pointerEvents="none">
            <WebView
              originWhitelist={['*']}
              source={{ html: BOOK_3D_OPENING_HTML }}
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

        {/* Animated Hero & CTA Section (Fades up as book opens) */}
        <Animated.View
          style={[
            styles.bottomContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Hero Heading */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Open the book to <Text style={styles.heroTitleAccent}>your success.</Text>
            </Text>
            <Text style={styles.heroSubTitle}>
              Master legal immigration, business startup, Italian contabilità, and earn verified accredited diplomas.
            </Text>

            {/* Course Feature Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.featurePill}>
                <Ionicons name="book-outline" size={13} color="rgb(129, 140, 248)" />
                <Text style={styles.featurePillText}>BOC-12 Mastery</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="ribbon-outline" size={13} color="rgb(129, 140, 248)" />
                <Text style={styles.featurePillText}>Verified Diplomas</Text>
              </View>
              <View style={styles.featurePill}>
                <Ionicons name="globe-outline" size={13} color="rgb(129, 140, 248)" />
                <Text style={styles.featurePillText}>IT • EN • BN</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionBox}>
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
                <Text style={styles.primaryActionText}>Start Learning</Text>
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
        </Animated.View>
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
    paddingHorizontal: 22,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.35,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: (SCREEN_WIDTH * 0.9) / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.28)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: (SCREEN_WIDTH * 0.85) / 2,
    backgroundColor: 'rgba(129, 140, 248, 0.22)',
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
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

  /* 3D Book Stage Card */
  bookStageCard: {
    height: Math.round(SCREEN_HEIGHT * 0.38),
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.25)',
    position: 'relative',
    marginTop: 8,
    shadowColor: 'rgb(99, 102, 241)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  webViewWrapper: {
    ...StyleSheet.absoluteFill,
  },

  /* Bottom Content & Hero */
  bottomContent: {
    width: '100%',
    paddingBottom: 4,
  },
  heroSection: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: 'rgb(255, 255, 255)',
    lineHeight: 34,
    marginBottom: 10,
  },
  heroTitleAccent: {
    color: 'rgb(129, 140, 248)',
  },
  heroSubTitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 19,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  featurePill: {
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
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  /* Action Buttons */
  actionBox: {
    marginTop: 8,
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
});
