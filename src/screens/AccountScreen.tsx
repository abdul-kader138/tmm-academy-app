import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, elevationStyle } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export const AccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

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
      >
        {/* User Card */}
        <View style={[styles.userCard, elevationStyle(3)]}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color={Colors.primaryLight} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user ? `${user.first_name} ${user.last_name}` : 'Learner Account'}
            </Text>
            <Text style={styles.userEmail}>{user?.email || 'learner@tmmacademy.com'}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.emerald} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Group: Preferences */}
        <Text style={styles.groupHeading}>App Preferences</Text>
        <View style={[styles.settingsGroup, elevationStyle(2)]}>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingIcon}>
              <Ionicons name="language" size={18} color={Colors.cyan} />
            </View>
            <Text style={styles.settingTitle}>Interface Language</Text>
            <Text style={styles.settingValue}>বাংলা (BN)</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingIcon}>
              <Ionicons name="notifications" size={18} color={Colors.primaryLight} />
            </View>
            <Text style={styles.settingTitle}>Course Notifications</Text>
            <Text style={styles.settingValue}>Enabled</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Settings Group: Security */}
        <Text style={styles.groupHeading}>Security & Compliance</Text>
        <View style={[styles.settingsGroup, elevationStyle(2)]}>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingIcon}>
              <Ionicons name="key" size={18} color={Colors.amber} />
            </View>
            <Text style={styles.settingTitle}>Two-Factor Authentication (2FA)</Text>
            <Text style={styles.settingValue}>
              {user?.two_factor_enabled ? 'Active' : 'Disabled'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingIcon}>
              <Ionicons name="download" size={18} color={Colors.emerald} />
            </View>
            <Text style={styles.settingTitle}>Export Account Data (GDPR)</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, elevationStyle(2)]}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.rose} />
          <Text style={styles.logoutText}>Sign Out from TMM Academy</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.backgroundInput,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1,
    borderColor: Colors.badgeBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    color: Colors.emerald,
    fontSize: 10,
    fontWeight: '700',
  },
  groupHeading: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  settingsGroup: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  settingValue: {
    color: Colors.textMuted,
    fontSize: 12,
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 60,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    color: Colors.rose,
    fontSize: 14,
    fontWeight: '700',
  },
});
