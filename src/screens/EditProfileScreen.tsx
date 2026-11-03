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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, cardShadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { lmsApi } from '../api/lmsApi';
import { PhoneInputField, PhoneValue } from '../components/PhoneInputField';

export const EditProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, refreshUser, updateProfile, resendVerification } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneValue, setPhoneValue] = useState<PhoneValue | null>(null);
  const [locale, setLocale] = useState<'en' | 'it' | 'bn'>((user?.locale as any) || 'en');

  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setLocale((user.locale as any) || 'en');
    }
  }, [user]);

  // Sanitize names: strictly blocks numbers and special characters
  const handleFirstNameChange = (val: string) => {
    setFirstName(val.replace(/[^\p{L}\s]/gu, ''));
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val.replace(/[^\p{L}\s]/gu, ''));
  };

  const handlePickImage = () => {
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
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              await uploadAvatarFile(result.assets[0].uri);
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not access photo library.');
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
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      const res = await resendVerification();
      if (res.success) {
        Alert.alert('Verification Sent', res.message || 'Verification link has been sent to your email.');
      } else {
        Alert.alert('Error', res.error || 'Could not resend verification.');
      }
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSave = async () => {
    // TMS-Wise Form Validations
    if (!firstName.trim() || firstName.trim().length < 2) {
      Alert.alert('Invalid Name', 'First name must contain at least 2 letters.');
      return;
    }
    if (!lastName.trim() || lastName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Last name must contain at least 2 letters.');
      return;
    }

    const namePattern = /^[\p{L}\s'-]+$/u;
    if (!namePattern.test(firstName.trim()) || !namePattern.test(lastName.trim())) {
      Alert.alert('Invalid Name', 'First and last names can only contain alphabetic letters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (phone.trim() && phoneValue && !phoneValue.isValid) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number for the selected country code.');
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        locale,
      });

      if (res.success) {
        await refreshUser();
        Alert.alert('Profile Saved', 'Your personal details have been saved successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Update Failed', res.error || 'Could not save profile details.');
      }
    } finally {
      setSaving(false);
    }
  };

  const initialLetter = (firstName ? firstName[0] : (user?.first_name ? user.first_name[0] : 'L')).toUpperCase();
  const displayName = `${firstName} ${lastName}`.trim() || user?.name || 'Learner Account';

  return (
    <View style={styles.container}>
      {/* Top Header Bar (TMS Style) */}
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
          <Text style={styles.headerTitle}>Personal Information</Text>
          <Text style={styles.headerSubtitle}>Account profile & contact details</Text>
        </View>

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, user?.email_verified ? styles.dotGreen : styles.dotAmber]} />
          <Text style={[styles.statusText, user?.email_verified ? styles.textGreen : styles.textAmber]}>
            {user?.email_verified ? 'Verified' : 'Active'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Compact Profile Header Card */}
          <View style={[styles.profileHeaderCard, cardShadow(2)]}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handlePickImage}
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
                <Ionicons name="camera" size={10} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.profileHeaderInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.tierPill}>
                  <Ionicons name="school" size={10} color={Colors.signal} />
                  <Text style={styles.tierText}>LEARNER</Text>
                </View>
              </View>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email || user?.email || 'No email specified'}
              </Text>
              <TouchableOpacity
                onPress={handlePickImage}
                style={styles.changePhotoRow}
                activeOpacity={0.7}
                disabled={avatarUploading}
              >
                <Ionicons name="camera-outline" size={12} color={Colors.signal} />
                <Text style={styles.changePhotoText}>
                  {avatarUploading ? 'Uploading photo…' : user?.avatar_url ? 'Change photo' : 'Upload photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Card 1: Basic Details */}
          <View style={[styles.card, cardShadow(2)]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="person" size={18} color={Colors.signal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Basic Details</Text>
                <Text style={styles.cardSubtitle}>Your public student identity and contact</Text>
              </View>
            </View>

            {/* First Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>FIRST NAME</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                  placeholder="First name"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Last Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>LAST NAME</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={handleLastNameChange}
                  placeholder="Last name"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                {user?.email_verified ? (
                  <View style={styles.verifiedTag}>
                    <Ionicons name="checkmark-circle" size={12} color={Colors.emerald} />
                    <Text style={styles.verifiedTagText}>Verified</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleResendVerification}
                    disabled={resendingEmail}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.resendLinkText}>
                      {resendingEmail ? 'Sending...' : 'Resend Verification'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone Number with Country Code (TMS Style) */}
            <PhoneInputField
              value={phone}
              onChangePhone={(p) => {
                setPhone(p.fullNumber);
                setPhoneValue(p);
              }}
              label="PHONE NUMBER"
              placeholder="345 678 9012"
              defaultCountry="IT"
            />
          </View>

          {/* Form Card 2: Preferences */}
          <View style={[styles.card, cardShadow(2), { marginTop: 16 }]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="globe" size={18} color={Colors.signal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Preferred Language</Text>
                <Text style={styles.cardSubtitle}>App interface and official notifications</Text>
              </View>
            </View>

            <View style={styles.languageRow}>
              {[
                { code: 'en', label: 'English (EN)' },
                { code: 'bn', label: 'বাংলা (BN)' },
                { code: 'it', label: 'Italiano (IT)' },
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
          </View>

          {/* Action Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, cardShadow(2)]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    gap: 5,
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
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textGreen: {
    color: Colors.emerald,
  },
  textAmber: {
    color: Colors.amber,
  },

  scrollContent: {
    padding: 16,
  },

  /* Compact Profile Header Card */
  profileHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.signal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ECFEFF',
    overflow: 'hidden',
  },
  avatarMiniText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: 15,
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
  changePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
  },

  /* Form Cards */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.emerald,
  },
  resendLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  fieldIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: Colors.textMain,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: Colors.signal,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: Colors.signal,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});