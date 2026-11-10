import React, { useState, useCallback } from 'react';
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
    const category = item.eyebrow?.trim() ? item.eyebrow.toUpperCase() : null;
    const lessonsCount = item.lessons_count || 0;
    const durationHours = Math.round((item.duration_minutes || 0) / 60);
    const durationText =
      durationHours > 0
        ? `${durationHours}h`
        : item.duration_minutes > 0
        ? `${item.duration_minutes}m`
        : null;
    const ratingValue = (item as any).rating || (item as any).average_rating || (item as any).reviews_avg_rating;
    const discountText = pricing.discountPercent ? `Save ${pricing.discountPercent}%` : pricing.discountBadgeText;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.saasCard, cardShadow(1)]}
        onPress={() => navigation.navigate('CourseDetail', { course: item })}
      >
        {/* Cover Image */}
        <View style={styles.imageContainer}>
          {Boolean(imageUrl) ? (
            <Image
              source={{ uri: imageUrl! }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="book-outline" size={36} color="#94A3B8" />
            </View>
          )}

          {/* Category Pill on Image Top-Left (Only if provided by API) */}
          {Boolean(category) && (
            <View style={styles.imageTag}>
              <Text style={styles.imageTagText}>{category}</Text>
            </View>
          )}
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Top Meta Line: Lessons, Duration, Rating */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <View style={styles.metaBadge}>
                <Ionicons name="film-outline" size={12} color="#64748B" />
                <Text style={styles.metaBadgeText}>{lessonsCount} Lessons</Text>
              </View>

              {durationText ? (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaBadge}>
                    <Ionicons name="time-outline" size={12} color="#64748B" />
                    <Text style={styles.metaBadgeText}>{durationText}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {Boolean(ratingValue) && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{ratingValue}</Text>
              </View>
            )}
          </View>

          {/* Course Title */}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {cleanHtml(item.description_text || item.description)}
          </Text>

          {/* Hairline Divider */}
          <View style={styles.divider} />

          {/* SaaS Footer: Pricing on Left + Action Button on Right */}
          <View style={styles.footerRow}>
            <View style={styles.pricingLeft}>
              {pricing.hasDiscount && pricing.originalPrice ? (
                <View>
                  <View style={styles.discountRow}>
                    <Text style={styles.originalPrice}>{pricing.originalPrice}</Text>
                    {Boolean(discountText) && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>{discountText}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.currentPrice}>{pricing.displayPrice}</Text>
                </View>
              ) : (
                <View>
                  {pricing.isFree ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE ACCESS</Text>
                    </View>
                  ) : (
                    <Text style={styles.currentPrice}>{pricing.displayPrice}</Text>
                  )}
                </View>
              )}
            </View>

            {/* Compact Action Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                item.is_enrolled && styles.actionBtnEnrolled,
              ]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CourseDetail', { course: item })}
            >
              <Text style={styles.actionBtnText}>
                {item.is_enrolled ? 'Classroom' : 'View Course'}
              </Text>
              <Ionicons
                name={item.is_enrolled ? 'play-circle' : 'arrow-forward'}
                size={14}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
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
  saasCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 155,
    backgroundColor: '#0F172A',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metaDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#64748B',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingLeft: {
    justifyContent: 'center',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  originalPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  freeBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  freeBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionBtn: {
    backgroundColor: '#0E7490',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionBtnEnrolled: {
    backgroundColor: '#059669',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
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
