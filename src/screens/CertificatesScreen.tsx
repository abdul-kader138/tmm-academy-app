import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi } from '../api/lmsApi';
import { CertificateItem } from '../api/types';
import { useAuth } from '../context/AuthContext';

export const CertificatesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCertificates = async () => {
    try {
      const certs = await lmsApi.getCertificates();
      setCertificates(certs);
    } catch {
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      void fetchCertificates();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDownload = async (cert: CertificateItem) => {
    const downloadUrl = lmsApi.getCertificateDownloadUrl(cert.id);
    try {
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Download Link', downloadUrl);
      }
    } catch {
      Alert.alert('Download Error', 'Could not open certificate download link.');
    }
  };

  if (!user) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 40 : 50),
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View style={[styles.guestCard, cardShadow(2)]}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="ribbon-outline" size={48} color={Colors.emerald} />
          </View>
          <Text style={styles.guestTitle}>Earned Certificates</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to view, verify, and download your accredited course certificates.
          </Text>
          <TouchableOpacity
            style={styles.guestSignInBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate?.('Login')}
          >
            <Text style={styles.guestSignInBtnText}>Sign In</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderCertItem = ({ item }: { item: CertificateItem }) => (
    <View style={[styles.certCard, cardShadow(2)]}>
      <View style={styles.ribbonBadge}>
        <Ionicons name="ribbon" size={26} color={Colors.emerald} />
      </View>

      <View style={styles.certBody}>
        <Text style={styles.courseTitle}>{item.course_title || 'Course Certificate'}</Text>
        <Text style={styles.certNumber}>ID: {item.certificate_number}</Text>
        <Text style={styles.issuedDate}>Issued: {item.issued_at}</Text>
      </View>

      <TouchableOpacity
        style={styles.downloadBtn}
        onPress={() => handleDownload(item)}
        activeOpacity={0.8}
      >
        <Ionicons name="download-outline" size={16} color="#FFFFFF" />
        <Text style={styles.downloadText}>PDF</Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.screenTitle}>My Certificates</Text>
        <Text style={styles.screenSub}>Verified credentials & course completions</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.signal} />
          <Text style={styles.loadingText}>Fetching certificates...</Text>
        </View>
      ) : (
        <FlatList
          data={certificates}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCertItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          ListEmptyComponent={
            <View style={[styles.emptyCard, cardShadow(1)]}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="ribbon-outline" size={40} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Certificates Yet</Text>
              <Text style={styles.emptyDesc}>
                Complete all course curriculum lessons and exercises to earn your verified certificates.
              </Text>
              {navigation && (
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => navigation.navigate('CatalogTab')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.browseBtnText}>Explore Courses</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
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
  },
  screenSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  ribbonBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  certBody: {
    flex: 1,
  },
  courseTitle: {
    color: Colors.textMain,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  certNumber: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  issuedDate: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.signal,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.signal,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  guestCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  guestIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(236, 254, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 10,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.signal,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});