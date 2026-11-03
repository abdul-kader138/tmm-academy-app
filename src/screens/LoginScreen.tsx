import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';

type AuthMode = 'login' | 'register' | 'forgot_password';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, complete2FA, register, forgotPassword } = useAuth();

  // Mode: Sign In vs Create Account vs Forgot Password
  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Captcha & 2FA State
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [turnstileVisible, setTurnstileVisible] = useState(false);
  const [twoFactorVisible, setTwoFactorVisible] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Pending submit action waiting for Turnstile resolution
  const pendingActionRef = useRef<((token: string) => Promise<void>) | null>(null);

  // Sanitize names: strictly blocks numbers and special characters, allowing only letters and spaces
  const handleNameChange = (text: string, setter: (val: string) => void) => {
    const sanitized = text.replace(/[^\p{L}\s]/gu, '');
    setter(sanitized);
  };

  useEffect(() => {
    void (async () => {
      try {
        await lmsApi.ensureCsrf();
        const meta = await lmsApi.getAuthMeta();
        setCaptchaRequired(meta.captcha_required);
      } catch {
        setCaptchaRequired(false);
      }
    })();
  }, []);

  // Handle Cloudflare Turnstile token from WebView
  const handleTurnstileMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.token) {
        setTurnstileVisible(false);
        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          // Run the pending submit with the actual turnstile token from Cloudflare
          await action(data.token);
        }
      } else if (data?.error) {
        Alert.alert('Security Check Failed', 'Please try solving the security check again.');
        setTurnstileVisible(false);
        setLoading(false);
      }
    } catch {
      setTurnstileVisible(false);
      setLoading(false);
    }
  };

  // Perform Sign In
  const executeLogin = async (turnstileToken?: string) => {
    setLoading(true);
    try {
      const res = await login({
        email: email.trim(),
        password: password.trim(),
        cf_turnstile_response: turnstileToken,
        remember,
      });

      if (res.success) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else if (res.twoFactor && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setTwoFactorVisible(true);
      } else if (res.status === 403) {
        Alert.alert(
          'Email Verification Required',
          'Please verify your email address before signing in. Check your inbox for the confirmation link.'
        );
      } else {
        Alert.alert('Sign In Failed', res.error || 'Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Perform Registration
  const executeRegister = async (turnstileToken?: string) => {
    setLoading(true);
    try {
      const res = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password: password.trim(),
        password_confirmation: passwordConfirmation.trim(),
        cf_turnstile_response: turnstileToken,
      });

      if (res.success) {
        Alert.alert(
          'Account Created',
          'We have sent a verification email to ' + email.trim() + '. Please click the link in your email to activate your account, then sign in.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
      } else {
        Alert.alert('Registration Failed', res.error || 'Could not create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Form Submit
  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return;
    }

    if (mode === 'forgot_password') {
      setLoading(true);
      try {
        const res = await forgotPassword(email.trim());
        if (res.success) {
          Alert.alert('Password Reset', res.message || 'If an account exists, a reset link was sent.', [
            { text: 'Back to Sign In', onPress: () => setMode('login') },
          ]);
        } else {
          Alert.alert('Error', res.error || 'Could not send reset link.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      Alert.alert('Required Field', 'Please enter your password.');
      return;
    }

    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Required Fields', 'Please enter your first and last name.');
        return;
      }
      const namePattern = /^[\p{L}\s]+$/u;
      if (!namePattern.test(firstName.trim()) || !namePattern.test(lastName.trim())) {
        Alert.alert('Invalid Name', 'Names can only contain letters and spaces. Numbers and special characters are not allowed.');
        return;
      }
      if (password !== passwordConfirmation) {
        Alert.alert('Password Mismatch', 'Password confirmation does not match.');
        return;
      }
    }

    // Check if Cloudflare Turnstile Captcha is required by the API
    if (captchaRequired) {
      pendingActionRef.current = async (turnstileToken: string) => {
        if (mode === 'login') {
          await executeLogin(turnstileToken);
        } else if (mode === 'register') {
          await executeRegister(turnstileToken);
        }
      };
      setTurnstileVisible(true);
    } else {
      if (mode === 'login') {
        await executeLogin();
      } else if (mode === 'register') {
        await executeRegister();
      }
    }
  };

  // Handle 2FA Challenge Submit
  const handle2FASubmit = async () => {
    if (!totpCode.trim()) {
      Alert.alert('Code Required', 'Please enter the 6-digit authenticator or recovery code.');
      return;
    }

    setLoading(true);
    try {
      const res = await complete2FA(challengeToken, totpCode.trim());
      if (res.success) {
        setTwoFactorVisible(false);
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        Alert.alert('Verification Failed', res.error || 'Invalid code.');
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
      {/* Top Navbar */}
      <View
        style={[
          styles.navbar,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 14),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (mode !== 'login') {
              setMode('login');
            } else {
              navigation.goBack();
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/tmm-academy-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>TMM Academy</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 28 },
        ]}
      >
        {/* Title Section */}
        <View style={styles.headerBlock}>
          <Text style={styles.headline}>
            {mode === 'login'
              ? 'Welcome back'
              : mode === 'register'
              ? 'Create your account'
              : 'Reset your password'}
          </Text>
          <Text style={styles.subheadline}>
            {mode === 'login'
              ? 'Sign in to access your course syllabus, video lessons, and diplomas.'
              : mode === 'register'
              ? 'Register with your name and email to start verified learning tracks.'
              : 'Enter your registered email and we will send you a secure reset link.'}
          </Text>
        </View>

        {/* Form Card with Theme Colors & Shadow */}
        <View style={[styles.formCard, cardShadow(2)]}>
          {mode === 'register' && (
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="First name"
                  placeholderTextColor={Colors.textMuted}
                  value={firstName}
                  onChangeText={(val) => handleNameChange(val, setFirstName)}
                  keyboardType="default"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Last name"
                  placeholderTextColor={Colors.textMuted}
                  value={lastName}
                  onChangeText={(val) => handleNameChange(val, setLastName)}
                  keyboardType="default"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>
          )}

          {/* Email Address */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputFieldInner}
              placeholder="name@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password (for login and register) */}
          {mode !== 'forgot_password' && (
            <>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                {mode === 'login' && (
                  <TouchableOpacity onPress={() => setMode('forgot_password')}>
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputFieldInner}
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
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Password Confirmation (for register) */}
          {mode === 'register' && (
            <>
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputFieldInner}
                  placeholder="Repeat your password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                />
              </View>
            </>
          )}

          {/* Remember me toggle for Login */}
          {mode === 'login' && (
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRemember(!remember)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={remember ? 'checkbox' : 'square-outline'}
                size={20}
                color={remember ? Colors.signal : Colors.textMuted}
              />
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
          )}

          {/* Password complexity helper for Register */}
          {mode === 'register' && (
            <Text style={styles.passwordHint}>
              • At least 8 characters with upper, lowercase, and numbers.
            </Text>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primarySubmitBtn, cardShadow(2)]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primarySubmitText}>
                {mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                  ? 'Create Learner Account'
                  : 'Send Reset Link'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Mode Switcher */}
        <View style={styles.bottomSwitchRow}>
          {mode === 'login' ? (
            <>
              <Text style={styles.switchPromptText}>New to TMM Academy? </Text>
              <TouchableOpacity onPress={() => setMode('register')}>
                <Text style={styles.switchActionLink}>Create an account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.switchPromptText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => setMode('login')}>
                <Text style={styles.switchActionLink}>Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Cloudflare Turnstile Challenge Modal (Official Endpoint) */}
      <Modal visible={turnstileVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <View style={styles.securityTitleRow}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.signal} />
                <Text style={styles.modalTitle}>Security Verification</Text>
              </View>
              <TouchableOpacity onPress={() => setTurnstileVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <View style={styles.webViewContainer}>
              <WebView
                source={{ uri: lmsApi.getChallengeViewUrl() }}
                onMessage={handleTurnstileMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                style={{ backgroundColor: 'transparent' }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Two-Factor Authentication Modal */}
      <Modal visible={twoFactorVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <View style={styles.securityTitleRow}>
                <Ionicons name="key" size={18} color={Colors.signal} />
                <Text style={styles.modalTitle}>Two-Factor Verification</Text>
              </View>
              <TouchableOpacity onPress={() => setTwoFactorVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <Text style={styles.twoFactorDesc}>
              Enter the 6-digit verification code from your authenticator app or an unused backup recovery code.
            </Text>

            <TextInput
              style={styles.twoFactorInput}
              placeholder="123456"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={12}
              value={totpCode}
              onChangeText={setTotpCode}
              autoFocus
            />

            <TouchableOpacity
              style={styles.primarySubmitBtn}
              onPress={handle2FASubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primarySubmitText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.2,
  },

  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  headerBlock: {
    marginBottom: 20,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },

  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 22,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    color: Colors.textMain,
  },
  inputFieldInner: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: Colors.textMain,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  rememberText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  passwordHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 10,
  },
  primarySubmitBtn: {
    backgroundColor: Colors.signal,
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primarySubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  bottomSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchPromptText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  switchActionLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.signal,
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  securityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  webViewContainer: {
    height: 240,
    marginTop: 10,
  },
  twoFactorDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 16,
  },
  twoFactorInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 50,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textMain,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 10,
  },
});
