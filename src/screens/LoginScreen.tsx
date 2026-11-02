import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, elevationStyle } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);

  useEffect(() => {
    void (async () => {
      const meta = await lmsApi.getAuthMeta();
      setCaptchaRequired(meta.captcha_required);
    })();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        email: email.trim(),
        password: password.trim(),
      });

      if (res.success) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else if (res.twoFactor) {
        Alert.alert('2FA Required', 'Two-Factor challenge verification required.');
      } else {
        Alert.alert('Sign In Failed', res.error || 'Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 12 : 20),
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Sign In</Text>
          <Text style={styles.subText}>Access your courses, quizzes, and certificates</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.formCard, elevationStyle(4)]}>
          {/* Email */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.inputField}
              placeholder="name@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.inputField}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {captchaRequired && (
            <View style={styles.captchaNotice}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.cyan} />
              <Text style={styles.captchaNoticeText}>Cloudflare Turnstile Verified Protection</Text>
            </View>
          )}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.submitBtn, elevationStyle(3)]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Switch */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => Alert.alert('Registration', 'Registration form on LMS portal')}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  titleText: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  formCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputField: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  captchaNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 14,
  },
  captchaNoticeText: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
});
