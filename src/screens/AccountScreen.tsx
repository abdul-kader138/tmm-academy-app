import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';

export const AccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, resendVerification } = useAuth();
  const [exporting, setExporting] = useState(false);

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

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await lmsApi.exportAccountData();
      if (res.success) {
        Alert.alert(
          'GDPR Data Export',
          'Your account data report has been prepared according to EU GDPR standards. Check your email for full data package.'
        );
      } else {
        Alert.alert('Export Notice', res.error || 'Data export request submitted.');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This will anonymize your records, revoke all course access, and clear your certificates as per EU GDPR compliance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Please contact academy support or confirm account deletion via your registered email.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
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
            <Ionicons name="person" size={30} color={Colors.signal} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user ? `${user.first_name} ${user.last_name}` : 'Learner Account'}
            </Text>
            {user?.email ? (
              <Text style={styles.userEmail}>{user.email}</Text>
            ) : null}

            {user?.email_verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.emerald} />
                <Text style={styles.verifiedText}>Verified Learner</Text>
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
          </View>
        </View>

        {/* Settings Group: Preferences */}
        <Text style={styles.groupHeading}>App Preferences</Text>
        <View style={[styles.settingsGroup, cardShadow(1)]}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="globe-outline" size={18} color={Colors.signal} />
            </View>
            <Text style={styles.settingTitle}>Default Language</Text>
            <Text style={styles.settingValue}>
              {user?.locale === 'bn' ? 'বাংলা (BN)' : user?.locale === 'it' ? 'Italiano (IT)' : 'English (EN)'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="notifications-outline" size={18} color={Colors.signal} />
            </View>
            <Text style={styles.settingTitle}>Course Notifications</Text>
            <Text style={styles.settingValue}>Enabled</Text>
          </View>
        </View>

        {/* Settings Group: Security & Privacy */}
        <Text style={styles.groupHeading}>Security & Compliance</Text>
        <View style={[styles.settingsGroup, cardShadow(1)]}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="key-outline" size={18} color={Colors.signal} />
            </View>
            <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
            <Text
              style={[
                styles.settingValue,
                { color: user?.two_factor_enabled ? Colors.emerald : Colors.textMuted },
              ]}
            >
              {user?.two_factor_enabled ? 'Active' : 'Disabled'}
            </Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={handleExportData}
            disabled={exporting}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="download-outline" size={18} color={Colors.signal} />
            </View>
            <Text style={styles.settingTitle}>Export Account Data (GDPR)</Text>
            {exporting ? (
              <ActivityIndicator size="small" color={Colors.signal} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <View style={[styles.dangerGroup, cardShadow(1)]}>
          <TouchableOpacity
            style={styles.deleteRow}
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.rose} />
            <Text style={styles.deleteText}>Delete / Anonymize Account</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, cardShadow(2)]}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Sign Out from TMM Academy</Text>
        </TouchableOpacity>
      </ScrollView>
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
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
    alignSelf: 'flex-start',
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
  groupHeading: {
    color: Colors.textSecondary,
    fontSize: 13,
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
    marginRight: 10,
  },
  settingTitle: {
    flex: 1,
    color: Colors.textMain,
    fontSize: 14,
    fontWeight: '600',
  },
  settingValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginLeft: 54,
  },
  dangerGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    marginTop: 4,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  deleteText: {
    color: Colors.rose,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.rose,
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
});