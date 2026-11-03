import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';
import { TwoFactorSetupResponse } from '../api/types';

export const AccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    user,
    logout,
    resendVerification,
    updateProfile,
    changePassword,
    setup2FA,
    confirm2FA,
    disable2FA,
    regenerateRecoveryCodes,
  } = useAuth();

  // Modals state
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [twoFactorSetupVisible, setTwoFactorSetupVisible] = useState(false);
  const [twoFactorManageVisible, setTwoFactorManageVisible] = useState(false);
  const [recoveryCodesVisible, setRecoveryCodesVisible] = useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);

  // Edit Profile Form
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [locale, setLocale] = useState<'en' | 'it' | 'bn'>((user?.locale as any) || 'en');

  // Change Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA Setup State
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const [loading, setLoading] = useState(false);

  // Sanitize names: block all numbers and special characters
  const handleNameChange = (text: string, setter: (val: string) => void) => {
    setter(text.replace(/[^\p{L}\s]/gu, ''));
  };

  // Resend Email Verification
  const handleResendEmail = async () => {
    try {
      const res = await resendVerification();
      if (res.success) {
        Alert.alert('Verification Sent', res.message || 'Verification link has been sent to your email.');
      } else {
        Alert.alert('Error', res.error || 'Could not resend email.');
      }
    } catch {
      Alert.alert('Error', 'Connection error.');
    }
  };

  // Submit Profile Update
  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required Fields', 'First name and last name are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        locale,
      });

      if (res.success) {
        Alert.alert('Profile Updated', 'Your profile details have been saved.');
        setEditProfileVisible(false);
      } else {
        Alert.alert('Update Failed', res.error || 'Could not update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Change
  const handleChangePasswordSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Required Fields', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Mismatch', 'New password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmNewPassword,
      });

      if (res.success) {
        Alert.alert('Password Changed', 'Your account password has been updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setChangePasswordVisible(false);
      } else {
        Alert.alert('Change Failed', res.error || 'Could not change password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Start 2FA Setup
  const handleStart2FASetup = async () => {
    setLoading(true);
    try {
      const res = await setup2FA();
      if (res.success && res.data) {
        setSetupData(res.data);
        setTotpCode('');
        setTwoFactorSetupVisible(true);
      } else {
        Alert.alert('Setup Failed', res.error || 'Could not initiate 2FA setup.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Confirm 2FA Code
  const handleConfirm2FA = async () => {
    if (!setupData || !totpCode.trim()) {
      Alert.alert('Code Required', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const res = await confirm2FA(setupData.secret, totpCode.trim());
      if (res.success && res.data) {
        setTwoFactorSetupVisible(false);
        setRecoveryCodes(res.data.recovery_codes || []);
        setRecoveryCodesVisible(true);
      } else {
        Alert.alert('Verification Failed', res.error || 'Invalid authentication code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!twoFactorPassword) {
      Alert.alert('Password Required', 'Please enter your password to disable 2FA.');
      return;
    }

    setLoading(true);
    try {
      const res = await disable2FA(twoFactorPassword);
      if (res.success) {
        Alert.alert('2FA Disabled', 'Two-factor authentication has been disabled for your account.');
        setTwoFactorManageVisible(false);
        setTwoFactorPassword('');
      } else {
        Alert.alert('Error', res.error || 'Could not disable 2FA.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Regenerate Recovery Codes
  const handleRegenerateRecoveryCodes = async () => {
    if (!twoFactorPassword) {
      Alert.alert('Password Required', 'Please enter your password to regenerate recovery codes.');
      return;
    }

    setLoading(true);
    try {
      const res = await regenerateRecoveryCodes(twoFactorPassword);
      if (res.success && res.data) {
        setTwoFactorManageVisible(false);
        setTwoFactorPassword('');
        setRecoveryCodes(res.data.recovery_codes || []);
        setRecoveryCodesVisible(true);
      } else {
        Alert.alert('Error', res.error || 'Could not regenerate codes.');
      }
    } finally {
      setLoading(false);
    }
  };

  // GDPR Data Export
  const handleExportData = async () => {
    setLoading(true);
    try {
      const res = await lmsApi.exportAccountData();
      if (res.success) {
        Alert.alert(
          'GDPR Data Export',
          'Your account records, enrollment history, and certificates package have been generated according to EU GDPR standards.'
        );
      } else {
        Alert.alert('Export Notice', res.error || 'Data export initiated.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete / Anonymize Account
  const handleDeleteAccountSubmit = async () => {
    if (!deletePassword) {
      Alert.alert('Password Required', 'Please enter your password to confirm deletion.');
      return;
    }

    setLoading(true);
    try {
      const res = await lmsApi.deleteAccount(deletePassword);
      if (res.success) {
        setDeleteAccountVisible(false);
        Alert.alert(
          'Account Closed',
          'Your account has been deleted and anonymized as per EU privacy guidelines.',
          [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] }) }]
        );
      } else {
        Alert.alert('Deletion Failed', res.error || 'Could not delete account.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy text helper
  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 16),
          },
        ]}
      >
        <Text style={styles.screenTitle}>Account & Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={[styles.userCard, cardShadow(2)]}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color={Colors.signal} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user ? `${user.first_name} ${user.last_name}` : 'Learner Account'}
            </Text>
            {user?.email ? (
              <Text style={styles.userEmail}>{user.email}</Text>
            ) : null}

            <View style={styles.badgeRow}>
              {user?.email_verified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.emerald} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.unverifiedBadge}
                  onPress={handleResendEmail}
                  activeOpacity={0.7}
                >
                  <Ionicons name="alert-circle" size={12} color={Colors.amber} />
                  <Text style={styles.unverifiedText}>Verify Email (Resend)</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => {
                  setFirstName(user?.first_name || '');
                  setLastName(user?.last_name || '');
                  setPhone(user?.phone || '');
                  setLocale((user?.locale as any) || 'en');
                  setEditProfileVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={12} color={Colors.signal} />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security & Authentication Section */}
        <Text style={styles.groupHeading}>Security & Access</Text>
        <View style={[styles.settingsGroup, cardShadow(1)]}>
          {/* Two-Factor Authentication */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => {
              if (user?.two_factor_enabled) {
                setTwoFactorPassword('');
                setTwoFactorManageVisible(true);
              } else {
                handleStart2FASetup();
              }
            }}
          >
            <View style={styles.settingIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={user?.two_factor_enabled ? Colors.emerald : Colors.signal}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Two-Factor Authentication (2FA)</Text>
              <Text style={styles.settingSubtitle}>
                {user?.two_factor_enabled
                  ? 'Authenticator app is active'
                  : 'Add extra layer of login security'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: user?.two_factor_enabled ? '#ECFDF5' : Colors.surfaceElevated },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: user?.two_factor_enabled ? Colors.emerald : Colors.textMuted },
                ]}
              >
                {user?.two_factor_enabled ? 'Active' : 'Disabled'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmNewPassword('');
              setChangePasswordVisible(true);
            }}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.signal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingSubtitle}>Update your current credentials</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Preferences & Privacy */}
        <Text style={styles.groupHeading}>Preferences & Compliance</Text>
        <View style={[styles.settingsGroup, cardShadow(1)]}>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => {
              setFirstName(user?.first_name || '');
              setLastName(user?.last_name || '');
              setPhone(user?.phone || '');
              setLocale((user?.locale as any) || 'en');
              setEditProfileVisible(true);
            }}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="globe-outline" size={20} color={Colors.signal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Preferred Language</Text>
              <Text style={styles.settingSubtitle}>Interface and communications</Text>
            </View>
            <Text style={styles.settingValue}>
              {user?.locale === 'bn' ? 'বাংলা (BN)' : user?.locale === 'it' ? 'Italiano (IT)' : 'English (EN)'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* GDPR Export */}
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={handleExportData}
            disabled={loading}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="download-outline" size={20} color={Colors.signal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Export Account Data (GDPR)</Text>
              <Text style={styles.settingSubtitle}>Download all your LMS history</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone: Delete & Logout */}
        <Text style={styles.groupHeading}>Danger Zone</Text>
        <View style={[styles.settingsGroup, cardShadow(1)]}>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => {
              setDeletePassword('');
              setDeleteAccountVisible(true);
            }}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="trash-outline" size={20} color={Colors.rose} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: Colors.rose }]}>Delete Account</Text>
              <Text style={styles.settingSubtitle}>Permanently anonymize learner data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, cardShadow(2)]}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Sign Out from TMM Academy</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================================================= */}
      {/* MODAL 1: EDIT PROFILE */}
      {/* ================================================= */}
      <Modal visible={editProfileVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.inputField}
                    value={firstName}
                    onChangeText={(val) => handleNameChange(val, setFirstName)}
                    placeholder="First name"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.inputField}
                    value={lastName}
                    onChangeText={(val) => handleNameChange(val, setLastName)}
                    placeholder="Last name"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Phone (Optional)</Text>
              <TextInput
                style={styles.inputField}
                value={phone}
                onChangeText={setPhone}
                placeholder="+39 123 456 7890"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Preferred Language</Text>
              <View style={styles.languageRow}>
                {[
                  { code: 'en', label: 'English' },
                  { code: 'bn', label: 'বাংলা' },
                  { code: 'it', label: 'Italiano' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.langBtn,
                      locale === item.code && styles.langBtnActive,
                    ]}
                    onPress={() => setLocale(item.code as any)}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        locale === item.code && styles.langBtnTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* MODAL 2: CHANGE PASSWORD */}
      {/* ================================================= */}
      <Modal visible={changePasswordVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setChangePasswordVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.inputField}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.inputField}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.inputField}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.helperText}>
                • Must be at least 8 characters with uppercase, lowercase, and a number.
              </Text>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleChangePasswordSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* MODAL 3: 2FA SETUP (QR CODE + TOTP INPUT) */}
      {/* ================================================= */}
      <Modal visible={twoFactorSetupVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="key" size={20} color={Colors.signal} />
                <Text style={styles.modalTitle}>Setup 2FA Authentication</Text>
              </View>
              <TouchableOpacity onPress={() => setTwoFactorSetupVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>
                Scan the QR code in Google Authenticator, Authy, or 1Password, or copy the setup key manually.
              </Text>

              {setupData?.qr_code_svg ? (
                <View style={styles.qrContainer}>
                  <WebView
                    source={{
                      html: `<html><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#FFFFFF;">${setupData.qr_code_svg}</body></html>`,
                    }}
                    style={{ width: 180, height: 180, backgroundColor: 'transparent' }}
                    scrollEnabled={false}
                  />
                </View>
              ) : null}

              {setupData?.secret ? (
                <View style={styles.secretBox}>
                  <Text style={styles.secretLabel}>Manual Setup Key:</Text>
                  <View style={styles.secretRow}>
                    <Text style={styles.secretCode} numberOfLines={1}>
                      {setupData.secret}
                    </Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(setupData.secret, 'Setup Key')}
                      style={styles.copySmallBtn}
                    >
                      <Ionicons name="copy-outline" size={16} color={Colors.signal} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Enter 6-Digit Authenticator Code</Text>
              <TextInput
                style={styles.totpInput}
                value={totpCode}
                onChangeText={setTotpCode}
                placeholder="123456"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleConfirm2FA}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Verify & Enable 2FA</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* MODAL 4: 2FA RECOVERY CODES DISPLAY */}
      {/* ================================================= */}
      <Modal visible={recoveryCodesVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.emerald} />
                <Text style={styles.modalTitle}>Backup Recovery Codes</Text>
              </View>
              <TouchableOpacity onPress={() => setRecoveryCodesVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>
                Save these one-time recovery codes in a safe place. If you ever lose your authenticator app, you can use these codes to regain access to your account.
              </Text>

              <View style={styles.recoveryGrid}>
                {recoveryCodes.map((code, idx) => (
                  <View key={idx} style={styles.recoveryItem}>
                    <Text style={styles.recoveryText}>{code}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.copyAllBtn}
                onPress={() => copyToClipboard(recoveryCodes.join('\n'), 'Recovery Codes')}
                activeOpacity={0.8}
              >
                <Ionicons name="copy-outline" size={18} color={Colors.signal} />
                <Text style={styles.copyAllText}>Copy All Recovery Codes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setRecoveryCodesVisible(false)}
              >
                <Text style={styles.modalPrimaryBtnText}>I Have Saved My Codes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================= */}
      {/* MODAL 5: MANAGE ACTIVE 2FA */}
      {/* ================================================= */}
      <Modal visible={twoFactorManageVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Two-Factor Authentication</Text>
              <TouchableOpacity onPress={() => setTwoFactorManageVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>
                Enter your account password to regenerate backup recovery codes or disable two-factor authentication.
              </Text>

              <Text style={styles.inputLabel}>Account Password</Text>
              <TextInput
                style={styles.inputField}
                value={twoFactorPassword}
                onChangeText={setTwoFactorPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.actionOutlineBtn, { marginTop: 14 }]}
                onPress={handleRegenerateRecoveryCodes}
                disabled={loading}
              >
                <Ionicons name="refresh" size={16} color={Colors.signal} />
                <Text style={styles.actionOutlineText}>Regenerate Recovery Codes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dangerOutlineBtn, { marginTop: 10 }]}
                onPress={handleDisable2FA}
                disabled={loading}
              >
                <Ionicons name="close-circle-outline" size={16} color={Colors.rose} />
                <Text style={styles.dangerOutlineText}>Disable 2FA</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================= */}
      {/* MODAL 6: DELETE ACCOUNT CONFIRMATION */}
      {/* ================================================= */}
      <Modal visible={deleteAccountVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, cardShadow(3)]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.rose }]}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDeleteAccountVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>
                Warning: This action is permanent and cannot be undone. All active course enrollments, syllabus progress, and issued credentials will be anonymized per EU GDPR requirements.
              </Text>

              <Text style={styles.inputLabel}>Confirm with Password</Text>
              <TextInput
                style={styles.inputField}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.deleteBtn, { marginTop: 20 }]}
                onPress={handleDeleteAccountSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  screenTitle: {
    color: Colors.textMain,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.textMain,
    fontSize: 17,
    fontWeight: '800',
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    color: Colors.emerald,
    fontSize: 11,
    fontWeight: '700',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  unverifiedText: {
    color: Colors.amber,
    fontSize: 11,
    fontWeight: '700',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  editProfileText: {
    color: Colors.signal,
    fontSize: 11,
    fontWeight: '700',
  },
  groupHeading: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginLeft: 4,
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    color: Colors.textMain,
    fontSize: 14,
    fontWeight: '700',
  },
  settingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  settingValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginLeft: 56,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.signal,
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textMain,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 6,
    marginTop: 10,
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
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 17,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  langBtnActive: {
    borderColor: Colors.signal,
    backgroundColor: '#ECFEFF',
  },
  langBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: Colors.signal,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    backgroundColor: Colors.signal,
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 14,
  },
  secretBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  secretLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  secretRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secretCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    flex: 1,
  },
  copySmallBtn: {
    padding: 4,
    marginLeft: 8,
  },
  totpInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 50,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textMain,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 6,
  },
  recoveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  recoveryItem: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  recoveryText: {
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: '#A5F3FC',
    marginBottom: 8,
  },
  copyAllText: {
    color: Colors.signal,
    fontSize: 13,
    fontWeight: '700',
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.signal,
    backgroundColor: '#ECFEFF',
  },
  actionOutlineText: {
    color: Colors.signal,
    fontSize: 13,
    fontWeight: '700',
  },
  dangerOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.rose,
    backgroundColor: '#FFF1F2',
  },
  dangerOutlineText: {
    color: Colors.rose,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: Colors.rose,
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});