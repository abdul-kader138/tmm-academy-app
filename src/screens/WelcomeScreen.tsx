import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, elevationStyle } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing pulse animation for learning orb
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, floatAnim]);

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#312E81']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient Orbs */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      <View
        style={[
          styles.contentWrapper,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 12 : 20),
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 24 : 20),
          },
        ]}
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.brandBadge}>
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

        {/* Hero Illustration / Animated Constellation */}
        <View style={styles.heroCenter}>
          <Animated.View
            style={[
              styles.orbGlow,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.centerCard,
              elevationStyle(4),
              {
                transform: [{ translateY: floatAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.25)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.cardGradient}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="school" size={42} color={Colors.primaryLight} />
              </View>
              <Text style={styles.cardBadge}>Professional LMS Platform</Text>
              <Text style={styles.heroTagline}>
                Master Legal, Business & Migration Skills in Italy
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>100%</Text>
                  <Text style={styles.statLabel}>Online</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>Verified</Text>
                  <Text style={styles.statLabel}>Certificates</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>3</Text>
                  <Text style={styles.statLabel}>Languages</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryBtn, elevationStyle(3)]}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.primaryBtnText}>Explore Courses</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryBtnText}>Sign In to Learner Portal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  brandTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSub: {
    color: Colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  centerCard: {
    width: SCREEN_WIDTH - 44,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: '#1E293B',
  },
  cardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardBadge: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTagline: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionSection: {
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
