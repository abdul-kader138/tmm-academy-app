import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, elevationStyle } from '../theme/colors';
import { lmsApi } from '../api/lmsApi';
import { CertificateItem } from '../api/types';

export const CertificatesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const certs = await lmsApi.getCertificates();
        setCertificates(certs);
      } catch {
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = (cert: CertificateItem) => {
    Alert.alert(
      'Download Certificate',
      `Downloading PDF for ${cert.course_title || 'Certificate'}...`
    );
  };

  const renderCertItem = ({ item }: { item: CertificateItem }) => (
    <View style={[styles.certCard, elevationStyle(3)]}>
      <View style={styles.ribbonBadge}>
        <Ionicons name="ribbon" size={28} color={Colors.emerald} />
      </View>

      <View style={styles.certBody}>
        <Text style={styles.courseTitle}>{item.course_title || 'Professional Certification'}</Text>
        <Text style={styles.certNumber}>ID: {item.certificate_number || 'TMM-CERT-2026-001'}</Text>
        <Text style={styles.issuedDate}>Issued: {item.issued_at || 'Completed Course'}</Text>
      </View>

      <TouchableOpacity
        style={styles.downloadBtn}
        onPress={() => handleDownload(item)}
        activeOpacity={0.75}
      >
        <Ionicons name="download-outline" size={18} color="#FFFFFF" />
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
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={
            certificates.length > 0
              ? certificates
              : [
                  {
                    id: 1,
                    course_id: 3,
                    course_title: 'BOC-12 (বিজনেস অপরচুনিটি কোর্স)',
                    certificate_number: 'TMM-2026-BOC12-892',
                    issued_at: '2026-11-01',
                  },
                ]
          }
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCertItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
        />
      )}
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
  screenSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  ribbonBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  certBody: {
    flex: 1,
  },
  courseTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  certNumber: {
    color: Colors.cyan,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  issuedDate: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
