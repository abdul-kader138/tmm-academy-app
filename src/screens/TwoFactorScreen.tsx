import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { TwoFactorSetupResponse } from '../api/types';

const buildQrHtml = (
  qrSvg?: string | null,
  secret?: string | null,
  userEmail?: string | null
): string => {
  let contentHtml = '';
  const trimmed = (qrSvg || '').trim();

  if (trimmed.startsWith('data:') || trimmed.startsWith('http')) {
    contentHtml = `<img src="${trimmed}" alt="2FA QR Code" />`;
  } else if (trimmed.includes('<svg')) {
    // Strip XML declaration <?xml ...?> so it renders cleanly as inline SVG
    const cleaned = trimmed.replace(/<\?xml[^>]*\?>/gi, '').trim();
    contentHtml = `<div class="svg-wrapper">${cleaned}</div>`;
  } else if (trimmed.length > 50 && (trimmed.startsWith('PHN2Zy') || /^[A-Za-z0-9+/=]+$/.test(trimmed))) {
    contentHtml = `<img src="data:image/svg+xml;base64,${trimmed}" alt="2FA QR Code" />`;
  } else if (secret) {
    const otpUri = `otpauth://totp/TMM%20Academy:${encodeURIComponent(userEmail || 'Learner')}?secret=${encodeURIComponent(secret)}&issuer=TMM%20Academy`;
    const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=${encodeURIComponent(otpUri)}`;
    contentHtml = `<img src="${fallbackUrl}" alt="2FA QR Code" />`;
  } else {
    contentHtml = '<p style="color:#64748B;font-size:12px;font-family:sans-serif;">Generating QR Code...</p>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .svg-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 92% !important;
      height: 92% !important;
      max-width: 100%;
      max-height: 100%;
      display: block;
      margin: auto;
    }
    img {
      width: 92% !important;
      height: 92% !important;
      object-fit: contain;
      display: block;
      margin: auto;
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;
};

export const TwoFactorScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, setup2FA, confirm2FA, disable2FA, regenerateRecoveryCodes, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // States when 2FA is already enabled
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');

  useEffect(() => {
    if (!user?.two_factor_enabled) {
      void loadSetupData();
    }
  }, [user?.two_factor_enabled]);

  const loadSetupData = async () => {
    setLoading(true);
    try {
      const res = await setup2FA();
      if (res.alreadyEnabled) {
        await refreshUser();
        return;
      }
      if (res.success && res.data) {
        setSetupData(res.data);
      } else {
        Alert.alert('Setup Error', res.error || 'Could not initiate 2FA setup.');
      }
    } catch (e: any) {
      Alert.alert('Setup Error', e?.message || 'Network error initiating 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (!setupData?.secret) return;
    await Clipboard.setStringAsync(setupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyAllCodes = async () => {
    if (recoveryCodes.length === 0) return;
    await Clipboard.setStringAsync(recoveryCodes.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleConfirm = async () => {
    if (!setupData?.secret) return;
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await confirm2FA(setupData.secret, cleanCode);
      if (res.success && res.data) {
        setRecoveryCodes(res.data.recovery_codes || []);
        await refreshUser();
        Alert.alert('2FA Enabled', 'Two-factor authentication has been activated.');
      } else {
        Alert.alert('Verification Failed', res.error || 'Invalid authentication code.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      Alert.alert('Password Required', 'Please enter your password to disable 2FA.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await disable2FA(disablePassword);
      if (res.success) {
        setShowDisableForm(false);
        setDisablePassword('');
        await refreshUser();
        Alert.alert('2FA Disabled', 'Two-factor authentication has been turned off.');
        await loadSetupData();
      } else {
        Alert.alert('Error', res.error || 'Could not disable 2FA.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regeneratePassword) {
      Alert.alert('Password Required', 'Please enter your password to regenerate recovery codes.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await regenerateRecoveryCodes(regeneratePassword);
      if (res.success && res.data) {
        setShowRegenerateForm(false);
        setRegeneratePassword('');
        setRecoveryCodes(res.data.recovery_codes || []);
        Alert.alert('Codes Regenerated', 'Your new backup recovery codes have been generated.');
      } else {
        Alert.alert('Error', res.error || 'Could not regenerate codes.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textMain} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Two-Factor Authentication</Text>
          <Text style={styles.headerSubtitle}>TOTP Authenticator & backup keys</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: user?.two_factor_enabled ? '#ECFDF5' : Colors.surfaceElevated },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: user?.two_factor_enabled ? Colors.emerald : Colors.textMuted },
            ]}
          >
            {user?.two_factor_enabled ? 'ENABLED' : 'OFF'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {user?.two_factor_enabled ? (
            /* ================================================= */
            /* VIEW: 2FA IS ALREADY ACTIVE */
            /* ================================================= */
            <>
              <View style={[styles.activeCard, cardShadow(2)]}>
                <View style={styles.activeIconCircle}>
                  <Ionicons name="shield-checkmark" size={32} color={Colors.emerald} />
                </View>
                <Text style={styles.activeTitle}>2FA is Active</Text>
                <Text style={styles.activeSubtitle}>
                  Your account is protected. Every sign-in requires a 6-digit verification code from your authenticator app.
                </Text>
              </View>

              {/* Recovery Codes Section if present */}
              {recoveryCodes.length > 0 && (
                <View style={[styles.card, cardShadow(2), { marginTop: 16 }]}>
                  <Text style={styles.cardTitle}>New Recovery Codes</Text>
                  <Text style={styles.cardSubtitle}>
                    Save these backup codes in a safe place. Each code can be used once.
                  </Text>
                  <View style={styles.recoveryGrid}>
                    {recoveryCodes.map((c, i) => (
                      <View key={i} style={styles.recoveryItem}>
                        <Text style={styles.recoveryCodeText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.copyAllBtn}
                    onPress={handleCopyAllCodes}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={copiedAll ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={Colors.signal}
                    />
                    <Text style={styles.copyAllText}>
                      {copiedAll ? 'Copied to Clipboard' : 'Copy All Codes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action 1: Regenerate Recovery Codes */}
              <View style={[styles.card, cardShadow(2), { marginTop: 16 }]}>
                <View style={styles.actionHeaderRow}>
                  <View style={styles.actionIconCircle}>
                    <Ionicons name="key-outline" size={18} color={Colors.signal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Backup Recovery Codes</Text>
                    <Text style={styles.cardSubtitle}>Generate fresh backup codes if lost</Text>
                  </View>
                </View>

                {showRegenerateForm ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.inputLabel}>ACCOUNT PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      value={regeneratePassword}
                      onChangeText={setRegeneratePassword}
                      secureTextEntry
                      placeholder="Enter password"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.btnCancel]}
                        onPress={() => {
                          setShowRegenerateForm(false);
                          setRegeneratePassword('');
                        }}
                      >
                        <Text style={styles.btnCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.btnConfirm]}
                        onPress={handleRegenerate}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.btnConfirmText}>Generate New</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.actionRowBtn}
                    onPress={() => setShowRegenerateForm(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionRowBtnText}>Regenerate Recovery Codes</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.signal} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Action 2: Disable 2FA */}
              <View style={[styles.card, cardShadow(2), { marginTop: 16 }]}>
                <View style={styles.actionHeaderRow}>
                  <View style={[styles.actionIconCircle, { backgroundColor: '#FFF1F2' }]}>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.rose} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: Colors.rose }]}>Disable 2FA</Text>
                    <Text style={styles.cardSubtitle}>Revert to password-only authentication</Text>
                  </View>
                </View>

                {showDisableForm ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.inputLabel}>ACCOUNT PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      value={disablePassword}
                      onChangeText={setDisablePassword}
                      secureTextEntry
                      placeholder="Enter password"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.btnCancel]}
                        onPress={() => {
                          setShowDisableForm(false);
                          setDisablePassword('');
                        }}
                      >
                        <Text style={styles.btnCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: Colors.rose }]}
                        onPress={handleDisable}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.btnConfirmText}>Disable 2FA</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.actionRowBtn}
                    onPress={() => setShowDisableForm(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionRowBtnText, { color: Colors.rose }]}>
                      Turn Off Two-Factor Auth
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.rose} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            /* ================================================= */
            /* VIEW: 2FA SETUP FLOW */
            /* ================================================= */
            <>
              {loading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={Colors.signal} />
                  <Text style={styles.loadingText}>Generating secure 2FA keys...</Text>
                </View>
              ) : (
                <>
                  {/* Step 1: Scan or Manual Key */}
                  <View style={[styles.card, cardShadow(2)]}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>STEP 1</Text>
                    </View>
                    <Text style={styles.cardTitle}>Scan QR or Enter Key</Text>
                    <Text style={styles.cardSubtitle}>
                      Open Google Authenticator, 1Password, or Authy on your phone and scan this code:
                    </Text>

                    {/* Vector QR Code Display (TMS Style) */}
                    <View style={styles.qrContainerWrapper}>
                      <View style={styles.qrBox}>
                        <WebView
                          originWhitelist={['*']}
                          source={{
                            html: buildQrHtml(setupData?.qr_code_svg, setupData?.secret, user?.email),
                          }}
                          style={styles.qrWebView}
                          scrollEnabled={false}
                          javaScriptEnabled={true}
                          domStorageEnabled={true}
                          scalesPageToFit={true}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.reloadRow}
                        onPress={loadSetupData}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="refresh-outline" size={13} color={Colors.signal} />
                        <Text style={styles.reloadText}>Regenerate or Refresh QR</Text>
                      </TouchableOpacity>
                    </View>

                    {setupData?.secret ? (
                      <View style={styles.secretBox}>
                        <Text style={styles.secretLabel}>Manual Setup Key:</Text>
                        <View style={styles.secretRow}>
                          <Text style={styles.secretCode} numberOfLines={1}>
                            {setupData.secret}
                          </Text>
                          <TouchableOpacity
                            onPress={handleCopySecret}
                            style={styles.copyBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={copiedSecret ? 'checkmark' : 'copy-outline'}
                              size={16}
                              color={Colors.signal}
                            />
                            <Text style={styles.copyBtnText}>
                              {copiedSecret ? 'Copied' : 'Copy'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  {/* Step 2: Verification Code */}
                  <View style={[styles.card, cardShadow(2), { marginTop: 16 }]}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>STEP 2</Text>
                    </View>
                    <Text style={styles.cardTitle}>Enter 6-Digit Code</Text>
                    <Text style={styles.cardSubtitle}>
                      Enter the 6-digit code displayed in your authenticator app to complete setup:
                    </Text>

                    <TextInput
                      style={styles.totpInput}
                      value={code}
                      onChangeText={setCode}
                      placeholder="123456"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus={false}
                    />

                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        code.trim().length !== 6 && { opacity: 0.6 },
                      ]}
                      onPress={handleConfirm}
                      disabled={submitting || code.trim().length !== 6}
                      activeOpacity={0.85}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Verify & Enable 2FA</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  activeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  activeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
  },
  activeSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.signal,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
    marginBottom: 12,
  },
  qrContainerWrapper: {
    alignItems: 'center',
    marginVertical: 12,
  },
  qrBox: {
    width: 190,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  qrWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  reloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reloadText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
  },
  secretBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  secretLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secretCode: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  totpInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 52,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textMain,
    textAlign: 'center',
    letterSpacing: 6,
    marginVertical: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.signal,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
  recoveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  recoveryItem: {
    width: '48%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  recoveryCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMain,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ECFEFF',
    marginTop: 6,
  },
  copyAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  actionRowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.signal,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.textMain,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  smallBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.surfaceElevated,
  },
  btnCancelText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  btnConfirm: {
    backgroundColor: Colors.signal,
  },
  btnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});