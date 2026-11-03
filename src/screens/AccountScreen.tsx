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
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
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
    refreshUser,
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  // Sanitize names: block all numbers and special characters
  const handleNameChange = (text: string, setter: (val: string) => void) => {
    setter(text.replace(/[^\p{L}\s]/gu, ''));
  };

  // Avatar Selection
  const handleAvatarPress = () => {
    Alert.alert('Profile Photo', 'Choose an option to update your photo:', [
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Please grant photo library access.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              await uploadAvatarFile(result.assets[0].uri);
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not access gallery.');
          }
        },
      },
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Please grant camera access.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              await uploadAvatarFile(result.assets[0].uri);
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not access camera.');
          }
        },
      },
      ...(user?.avatar_url
        ? [
            {
              text: 'Remove Photo',
              style: 'destructive' as const,
              onPress: async () => {
                setAvatarUploading(true);
                try {
                  const res = await lmsApi.removeAvatar();
                  if (res.success) {
                    await refreshUser();
                    Alert.alert('Success', 'Profile photo removed.');
                  } else {
                    Alert.alert('Error', res.error || 'Could not remove photo.');
                  }
                } finally {
                  setAvatarUploading(false);
                }
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadAvatarFile = async (uri: string) => {
    setAvatarUploading(true);
    try {
      const res = await lmsApi.uploadAvatar(uri);
      if (res.success) {
        await refreshUser();
        setAvatarLoadFailed(false);
        Alert.alert('Success', 'Profile photo updated successfully.');
      } else {
        Alert.alert('Upload Failed', res.error || 'Could not upload photo.');
      }
    } finally {
      setAvatarUploading(false);
    }
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

  const initialLetter = user?.first_name ? user.first_name[0].toUpperCase() : 'L';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === 'ios' ? 12 : 20) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ================================================= */}
      {/* 1. TMS-STYLE IDENTITY HEADER CARD */}
      {/* ================================================= */}
      <View style={[styles.profileHeaderCard, cardShadow(2)]}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          disabled={avatarUploading}
        >
          <View style={styles.avatarMini}>
            {user?.avatar_url && !avatarLoadFailed ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatarImage}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <Text style={styles.avatarMiniText}>{initialLetter}</Text>
            )}
            {avatarUploading && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={11} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.profileHeaderInfo}>
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user ? `${user.first_name} ${user.last_name}` : 'Learner Account'}
            </Text>
            <View style={styles.tierPill}>
              <Ionicons name="school" size={10} color={Colors.signal} />
              <Text style={styles.tierText}>LEARNER</Text>
            </View>
          </View>

          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email || 'learner@tmminnovation.com'}
          </Text>

          <View style={styles.profileStatusRow}>
            <View style={[styles.statusDot, user?.email_verified ? styles.dotGreen : styles.dotAmber]} />
            <Text style={styles.profileStatusText}>
              {user?.email_verified ? 'Verified Account' : 'Pending Email Verification'}
            </Text>
          </View>

          <View style={styles.actionLinksRow}>
            <TouchableOpacity
              onPress={handleAvatarPress}
              style={styles.editPhotoBtn}
              activeOpacity={0.7}
              disabled={avatarUploading}
            >
              <Ionicons name="camera-outline" size={12} color={Colors.signal} />
              <Text style={styles.editPhotoBtnText}>
                {avatarUploading ? 'Uploading…' : user?.avatar_url ? 'Change photo' : 'Add photo'}
              </Text>
            </TouchableOpacity>

            {!user?.email_verified && (
              <TouchableOpacity
                onPress={handleResendEmail}
                style={[styles.editPhotoBtn, { marginLeft: 12 }]}
                activeOpacity={0.7}
              >
                <Ionicons name="mail-unread-outline" size={12} color={Colors.amber} />
                <Text style={[styles.editPhotoBtnText, { color: Colors.amber }]}>Resend link</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ================================================= */}
      {/* 2. TMS-STYLE MENU GROUP 1: ACCOUNT & CREDENTIALS */}
      {/* ================================================= */}
      <Text style={styles.groupHeading}>Account & Security</Text>
      <View style={[styles.menuGroup, cardShadow(2)]}>
        {/* Personal Information Row */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => {
            setFirstName(user?.first_name || '');
            setLastName(user?.last_name || '');
            setPhone(user?.phone || '');
            setLocale((user?.locale as any) || 'en');
            setEditProfileVisible(true);
          }}
        >
          <View style={styles.menuRowLeft}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="person-outline" size={18} color={Colors.signal} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Personal Information</Text>
              <Text style={styles.menuSub}>Update name, phone number, and preferences</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Security & 2FA Row with TMS status badge */}
        <TouchableOpacity
          style={styles.menuRow}
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
          <View style={styles.menuRowLeft}>
            <View
              style={[
                styles.menuIconCircle,
                user?.two_factor_enabled ? { backgroundColor: '#ECFDF5' } : null,
              ]}
            >
              <Ionicons
                name={user?.two_factor_enabled ? 'shield-checkmark' : 'shield-outline'}
                size={18}
                color={user?.two_factor_enabled ? Colors.emerald : Colors.signal}
              />
            </View>
            <View style={styles.menuTextCol}>
              <View style={styles.menuTitleRow}>
                <Text style={styles.menuTitle}>Security & 2FA</Text>
                <View
                  style={[
                    styles.statusBadge,
                    user?.two_factor_enabled ? styles.statusBadgeActive : styles.statusBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      user?.two_factor_enabled ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                    ]}
                  >
                    {user?.two_factor_enabled ? 'ENABLED' : 'OFF'}
                  </Text>
                </View>
              </View>
              <Text style={styles.menuSub}>Google Authenticator (TOTP) & recovery keys</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Change Password Row */}
        <TouchableOpacity
          style={[styles.menuRow, { borderBottomWidth: 0 }]}
          activeOpacity={0.7}
          onPress={() => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setChangePasswordVisible(true);
          }}
        >
          <View style={styles.menuRowLeft}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.signal} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Change Password</Text>
              <Text style={styles.menuSub}>Update your account login password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ================================================= */}
      {/* 3. TMS-STYLE MENU GROUP 2: PREFERENCES & COMPLIANCE */}
      {/* ================================================= */}
      <Text style={styles.groupHeading}>Preferences & Compliance</Text>
      <View style={[styles.menuGroup, cardShadow(2)]}>
        {/* App Language */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => {
            setFirstName(user?.first_name || '');
            setLastName(user?.last_name || '');
            setPhone(user?.phone || '');
            setLocale((user?.locale as any) || 'en');
            setEditProfileVisible(true);
          }}
        >
          <View style={styles.menuRowLeft}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="globe-outline" size={18} color={Colors.signal} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Default Language</Text>
              <Text style={styles.menuSub}>
                {user?.locale === 'bn' ? 'বাংলা (BN)' : user?.locale === 'it' ? 'Italiano (IT)' : 'English (EN)'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* GDPR Export */}
        <TouchableOpacity
          style={[styles.menuRow, { borderBottomWidth: 0 }]}
          activeOpacity={0.7}
          onPress={handleExportData}
          disabled={loading}
        >
          <View style={styles.menuRowLeft}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="download-outline" size={18} color={Colors.signal} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Export Account Data (GDPR)</Text>
              <Text style={styles.menuSub}>Download archive of learning and certificates</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ================================================= */}
      {/* 4. TMS-STYLE MENU GROUP 3: DANGER ZONE & SESSION */}
      {/* ================================================= */}
      <Text style={styles.groupHeading}>Danger Zone</Text>
      <View style={[styles.menuGroup, cardShadow(2)]}>
        {/* Delete Account */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => {
            setDeletePassword('');
            setDeleteAccountVisible(true);
          }}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF1F2' }]}>
              <Ionicons name="trash-outline" size={18} color={Colors.rose} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuTitle, { color: Colors.rose }]}>Delete Account</Text>
              <Text style={styles.menuSub}>Permanently anonymize learner data per GDPR</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.menuRow, { borderBottomWidth: 0 }]}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF1F2' }]}>
              <Ionicons name="log-out-outline" size={18} color={Colors.rose} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuTitle, { color: Colors.rose }]}>Sign Out</Text>
              <Text style={styles.menuSub}>Terminate current Sanctum session</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

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
              <Text style={styles.modalTitle}>Personal Information</Text>
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

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.inputField}
                value={phone}
                onChangeText={setPhone}
                placeholder="+39 123 456 7890"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Default Language</Text>
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
                  <Text style={styles.modalPrimaryBtnText}>Save Changes</Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },

  /* TMS-style Profile Header Card */
  profileHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarMini: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.signal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ECFEFF',
    overflow: 'hidden',
  },
  avatarMiniText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.signal,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  profileHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    flexShrink: 1,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.signal,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: Colors.emerald,
  },
  dotAmber: {
    backgroundColor: Colors.amber,
  },
  profileStatusText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  actionLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  editPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  editPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
  },

  /* TMS-style Menu Groups */
  groupHeading: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    minHeight: 62,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  menuTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    flexShrink: 1,
  },
  menuSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeInactive: {
    backgroundColor: Colors.surfaceElevated,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextActive: {
    color: Colors.emerald,
  },
  statusBadgeTextInactive: {
    color: Colors.textMuted,
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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