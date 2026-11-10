import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi, API_BASE_URL } from '../api/lmsApi';
import { CourseCatalogItem } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { getCoursePricing } from '../utils/pricing';
import { cleanHtml } from '../utils/text';

export const CourseCatalogScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (user) {
      navigation.navigate('MainTabs', { screen: 'DashboardTab' });
    } else {
      navigation.navigate('Welcome');
    }
  };

  const fetchCourses = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await lmsApi.getCourses();
      setCourses(data);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      void (async () => {
        try {
          const data = await lmsApi.getCourses();
          if (isMounted) setCourses(data);
        } catch {
          if (isMounted) setCourses([]);
        } finally {
          if (isMounted) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchCourses(true);
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.eyebrow && c.eyebrow.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderCourseItem = ({ item }: { item: CourseCatalogItem }) => {
    const imageUrl = item.cover_image_url?.startsWith('http')
      ? item.cover_image_url
      : item.cover_image_url
      ? `${API_BASE_URL}${item.cover_image_url}`
      : null;

    const pricing = getCoursePricing(item);
    const category = item.eyebrow ? item.eyebrow.toUpperCase() : 'MASTERCLASS';
    const lessonsCount = item.lessons_count || 0;
    const durationText = item.duration_minutes > 0 ? `${item.duration_minutes} min` : 'Self-paced';

    const getCtaLabel = () => {
      if (item.is_enrolled) return 'Go to Classroom';
      if (!user) return 'Sign In to Access';
      if (pricing.isFree) return 'Start Learning Free';
      return 'Enroll Now';
    };

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.webCourseCard, cardShadow(2)]}
        onPress={() => navigation.navigate('CourseDetail', { course: item })}
      >
        {/* Cover Image with Web-Style Badges */}
        <View style={styles.webImageWrapper}>
          {Boolean(imageUrl) ? (
            <Image
              source={{ uri: imageUrl! }}
              style={styles.webCourseImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.webImagePlaceholder}>
              <Ionicons name="book-outline" size={44} color="#94A3B8" />
            </View>
          )}

          {/* Top-Left Category Pill (e.g. MASTERCLASS) */}
          <View style={styles.webCategoryPill}>
            <Text style={styles.webCategoryPillText}>{category}</Text>
          </View>

          {/* Bottom-Left Document / Lesson Icon Box */}
          <View style={styles.webDocIconBox}>
            <Ionicons name="newspaper-outline" size={18} color="#0E7490" />
          </View>

          {/* Bottom-Right Lessons Count Pill */}
          <View style={styles.webLessonsPill}>
            <Text style={styles.webLessonsPillText}>{lessonsCount} Lessons</Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.webCardContent}>
          {/* Title */}
          <Text style={styles.webTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* 2-line Description */}
          <Text style={styles.webDesc} numberOfLines={2}>
            {cleanHtml(item.description_text || item.description)}
          </Text>

          {/* Meta Row: Duration, Lessons, Rating */}
          <View style={styles.webMetaRow}>
            <View style={styles.webMetaLeft}>
              <View style={styles.webMetaItem}>
                <Ionicons name="time-outline" size={14} color="#64748B" />
                <Text style={styles.webMetaText}>{durationText}</Text>
              </View>

              <View style={styles.webMetaItem}>
                <Ionicons name="film-outline" size={14} color="#64748B" />
                <Text style={styles.webMetaText}>{lessonsCount} lessons</Text>
              </View>
            </View>

            {/* Rating */}
            <View style={styles.webRatingWrap}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.webRatingText}>4.9</Text>
            </View>
          </View>

          {/* Hairline Divider */}
          <View style={styles.webDivider} />

          {/* Pricing Row */}
          <View style={styles.webPricingRow}>
            <View style={styles.webPriceStack}>
              {pricing.hasDiscount && pricing.originalPrice ? (
                <>
                  <Text style={styles.webStrikePrice}>{pricing.originalPrice}</Text>
                  <Text style={styles.webMainPrice}>{pricing.displayPrice}</Text>
                </>
              ) : (
                <Text style={styles.webMainPrice}>
                  {pricing.isFree ? 'Free' : pricing.displayPrice}
                </Text>
              )}
            </View>

            {/* Right-aligned Badge: Discount / Free */}
            {pricing.hasDiscount ? (
              <View style={styles.webDiscountPill}>
                <Ionicons name="pricetag-outline" size={12} color="#0D9488" />
                <Text style={styles.webDiscountPillText}>
                  Save {pricing.discountPercent ? `${pricing.discountPercent}%` : '34%'}
                </Text>
              </View>
            ) : pricing.isFree ? (
              <View style={styles.webDiscountPill}>
                <Ionicons name="sparkles-outline" size={12} color="#0D9488" />
                <Text style={styles.webDiscountPillText}>Free Access</Text>
              </View>
            ) : null}
          </View>

          {/* Full-Width Action Button */}
          <TouchableOpacity
            style={styles.webCtaButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CourseDetail', { course: item })}
          >
            <Text style={styles.webCtaText}>{getCtaLabel()}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Safe Area Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 16),
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textMain} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.screenTitle}>Explore Courses</Text>
            <Text style={styles.screenSubtitle}>Practical tracks for career advancement</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search courses or topics..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.signal} />
          <Text style={styles.loadingText}>Loading course catalog...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCourseItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.signal}
              colors={[Colors.signal]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Courses Found</Text>
              <Text style={styles.emptyText}>Try searching with a different term.</Text>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  headerTitleWrap: {
    flex: 1,
  },
  screenTitle: {
    color: Colors.textMain,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: Colors.textMain,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  webCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 185,
    backgroundColor: '#0F172A',
  },
  webCourseImage: {
    width: '100%',
    height: '100%',
  },
  webImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webCategoryPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  webCategoryPillText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  webDocIconBox: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  webLessonsPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  webLessonsPillText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  webCardContent: {
    padding: 16,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  webDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    marginBottom: 12,
  },
  webMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  webMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  webMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  webMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  webRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  webRatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  webDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  webPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  webPriceStack: {
    justifyContent: 'center',
  },
  webStrikePrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    marginBottom: 1,
  },
  webMainPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  webDiscountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  webDiscountPillText: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '800',
  },
  webCtaButton: {
    backgroundColor: '#0E7490',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  webCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textMain,
    marginTop: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
});
