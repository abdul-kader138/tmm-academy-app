import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';

export const AccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, resendVerification, refreshUser } = useAuth();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar_url]);

  useFocusEffect(
    useCallback(() => {
      refreshUser?.().catch(() => {});
    }, [refreshUser])
  );

  const handleAvatarPress = () => {
    Alert.alert('Profile Photo', 'Choose an option to update your photo:', [
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Please grant photo library access to upload a picture.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
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
              Alert.alert('Permission Denied', 'Please grant camera access to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
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
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload photo.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      const res = await resendVerification();
      if (res.success) {
        Alert.alert('Verification Sent', res.message || 'Verification link sent to your email.');
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
          'Your account records, enrollment history, and certificates package have been generated according to EU GDPR standards.'
        );
      } else {
        Alert.alert('Export Notice', res.error || 'Data export initiated.');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from this device?', [
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
        { paddingTop: insets.top + (Platform.OS === 'ios' ? 14 : 20) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ================================================= */}
      {/* 1. PROFILE IDENTITY CARD (TMS STYLE) */}
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
              {user ? `${user.first_name} ${user.last_name}`.trim() : 'Guest Learner'}
            </Text>
            <View style={styles.tierPill}>
              <Ionicons name="school" size={10} color={Colors.signal} />
              <Text style={styles.tierText}>STUDENT</Text>
            </View>
          </View>

          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email || 'guest@tmminnovation.com'}
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
                style={[styles.editPhotoBtn, { marginLeft: 14 }]}
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
      {/* 2. ACCOUNT SETTINGS MENU (TMS EXACT STRUCTURE) */}
      {/* ================================================= */}
      <Text style={styles.groupHeading}>Account & Security</Text>
      <View style={[styles.menuGroup, cardShadow(2)]}>
        {/* Row 1: Personal Information -> Full Screen EditProfile */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <View style={styles.menuRowLeft}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="person-outline" size={18} color={Colors.signal} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Personal Information</Text>
              <Text style={styles.menuSub}>Update name, phone number, language preference</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Row 2: Security & 2FA -> Full Screen TwoFactor */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TwoFactor')}
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
              <Text style={styles.menuSub} numberOfLines={1}>Google Authenticator (TOTP) & recovery keys</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Row 3: Export Account Data (GDPR) */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={handleExportData}
          disabled={exporting}
        >
          <View style={styles.menuRowLeft}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="download-outline" size={18} color={Colors.signal} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Export Account Data (GDPR)</Text>
              <Text style={styles.menuSub}>
                {exporting ? 'Generating export package…' : 'Download JSON archive of course progress & certificates'}
              </Text>
            </View>
          </View>
          {exporting ? (
            <ActivityIndicator size="small" color={Colors.signal} />
          ) : (
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          )}
        </TouchableOpacity>

        {/* Row 4: Password & Account Security -> Full Screen AccountSecurity */}
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AccountSecurity')}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF1F2' }]}>
              <Ionicons name="key-outline" size={18} color={Colors.rose} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Password & Account Deletion</Text>
              <Text style={styles.menuSub}>Change password or delete account data (GDPR)</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Row 5: Sign Out */}
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

      <View style={{ height: 48 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  // TMS-Style Profile Header Card
  profileHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarMini: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.signal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0F2FE',
    overflow: 'hidden',
  },
  avatarMiniText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 29,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.signal,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    flex: 1,
    marginRight: 8,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.signal,
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  profileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: {
    backgroundColor: Colors.emerald,
  },
  dotAmber: {
    backgroundColor: Colors.amber,
  },
  profileStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  actionLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  editPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
    marginLeft: 4,
  },
  // Menu Group
  groupHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(14, 116, 144, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },
  menuSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextActive: {
    color: Colors.emerald,
  },
  statusBadgeTextInactive: {
    color: Colors.textMuted,
  },
});
