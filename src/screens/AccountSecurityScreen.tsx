import React, { useState, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';

export const AccountSecurityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { changePassword, logout } = useAuth();

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Delete Account state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePass, setShowDeletePass] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const lock = useRef(false);

  // Validation
  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmitPassword = currentPassword.length > 0 && hasMinLength && passwordsMatch;

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Validation Error', 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setPasswordBusy(true);

    try {
      const res = await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      if (res.success) {
        Alert.alert('Success', res.message || 'Your password has been updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Update Failed', res.error || 'Failed to update password. Please check your current password.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'A network error occurred.');
    } finally {
      lock.current = false;
      setPasswordBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert('Password Required', 'Please enter your current password to confirm account deletion.');
      return;
    }

    Alert.alert(
      'Permanently Delete Account?',
      'Your account and all personal data will be completely anonymized in accordance with GDPR. Enrolled courses and certificates will be unlinked. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (lock.current) return;
            lock.current = true;
            setDeleteBusy(true);
            try {
              const res = await lmsApi.deleteAccount(deletePassword);
              if (res.success) {
                await logout();
                Alert.alert('Account Deleted', 'Your account has been deleted and anonymized.');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              } else {
                Alert.alert('Deletion Failed', res.error || 'Incorrect password or deletion could not be processed.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Unable to delete account.');
            } finally {
              lock.current = false;
              setDeleteBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header Bar matching TMS */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 44) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Password & Security</Text>
          <Text style={styles.headerSubtitle}>Credentials & account protection</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: Change Password */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={20} color={Colors.signal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Change Password</Text>
              <Text style={styles.cardSub}>Update your password regularly to keep your learning account secure</Text>
            </View>
          </View>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowCurrent(!showCurrent)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min. 8 characters)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowNew(!showNew)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Validation Hints */}
          {newPassword.length > 0 && (
            <View style={styles.hintBox}>
              <View style={styles.hintRow}>
                <Ionicons
                  name={hasMinLength ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={hasMinLength ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.hintText, { color: hasMinLength ? '#10B981' : Colors.textMuted }]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.hintRow}>
                <Ionicons
                  name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={passwordsMatch ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.hintText, { color: passwordsMatch ? '#10B981' : Colors.textMuted }]}>
                  Passwords match
                </Text>
              </View>
            </View>
          )}

          {/* Submit Change Password Button */}
          <TouchableOpacity
            style={[styles.primaryButton, (!canSubmitPassword || passwordBusy) && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={!canSubmitPassword || passwordBusy}
            activeOpacity={0.8}
          >
            {passwordBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* CARD 2: Delete Account (GDPR) */}
        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.dangerIconCircle]}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Delete Account (GDPR)</Text>
              <Text style={styles.cardSub}>Permanent anonymization of all personal and learning records</Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color="#B91C1C" style={{ marginTop: 2 }} />
            <Text style={styles.warningText}>
              This action is permanent and irreversible. Your personal identity will be anonymized, your course enrollments
              and certificates will be unlinked, and your active session will be immediately terminated.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm with Current Password</Text>
            <View style={[styles.inputWrapper, { borderColor: '#FECACA' }]}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showDeletePass}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Enter current password to confirm"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowDeletePass(!showDeletePass)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showDeletePass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.dangerButton, (!deletePassword || deleteBusy) && styles.dangerButtonDisabled]}
            onPress={handleDeleteAccount}
            disabled={!deletePassword || deleteBusy}
            activeOpacity={0.8}
          >
            {deleteBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.dangerButtonText}>Permanently Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
    ...cardShadow,
  },
  dangerCard: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFBFB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dangerIconCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMain,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  hintBox: {
    backgroundColor: Colors.canvas,
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 6,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: Colors.signal,
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
    shadowColor: Colors.signal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  dangerButtonDisabled: {
    opacity: 0.5,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
