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
    const imageUrl = item.cover_image_url.startsWith('http')
      ? item.cover_image_url
      : `${API_BASE_URL}${item.cover_image_url}`;

    const durationHours = Math.round(item.duration_minutes / 60);
    const pricing = getCoursePricing(item);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.courseCard, cardShadow(2)]}
        onPress={() => navigation.navigate('CourseDetail', { course: item })}
      >
        <View style={styles.imageWrapper}>
          {Boolean(imageUrl) && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.courseImage}
              resizeMode="cover"
            />
          )}

          {/* Discount Percentage Badge on Top Left */}
          {pricing.hasDiscount && (
            <View style={styles.discountBadgeOverlay}>
              <Ionicons name="flash" size={11} color="#FFFFFF" />
              <Text style={styles.discountBadgeText}>{pricing.discountBadgeText}</Text>
            </View>
          )}

          {/* Price Tag Overlay on Top Right */}
          <View
            style={[
              styles.priceBadgeOverlay,
              pricing.isFree ? styles.priceBadgeFree : styles.priceBadgePaid,
            ]}
          >
            {pricing.hasDiscount && pricing.originalPrice ? (
              <View style={styles.discountPriceRow}>
                <Text style={styles.strikeOriginalPrice}>{pricing.originalPrice}</Text>
                <Text style={styles.priceBadgeTextPaid}>{pricing.displayPrice}</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.priceBadgeText,
                  pricing.isFree ? styles.priceBadgeTextFree : styles.priceBadgeTextPaid,
                ]}
              >
                {pricing.displayPrice}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            {item.eyebrow ? (
              <View style={styles.eyebrowBadge}>
                <Text style={styles.eyebrowText}>{item.eyebrow}</Text>
              </View>
            ) : null}

            {pricing.hasDiscount && (
              <View style={styles.discountPill}>
                <Text style={styles.discountPillText}>{pricing.discountBadgeText}</Text>
              </View>
            )}

            <View
              style={[
                styles.priceInlinePill,
                pricing.isFree ? styles.priceBadgeFree : styles.priceBadgePaid,
              ]}
            >
              <Text
                style={[
                  styles.priceInlinePillText,
                  pricing.isFree ? styles.priceBadgeTextFree : styles.priceBadgeTextPaid,
                ]}
              >
                {pricing.isFree ? 'Free Course' : pricing.displayPrice}
              </Text>
            </View>
          </View>

          <Text style={styles.courseTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.courseDesc} numberOfLines={3}>
            {cleanHtml(item.description_text || item.description)}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={15} color={Colors.signal} />
              <Text style={styles.metaText}>
                {durationHours > 0 ? `${durationHours}h` : `${item.duration_minutes}m`}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="play-circle-outline" size={15} color={Colors.signal} />
              <Text style={styles.metaText}>{item.lessons_count} Lessons</Text>
            </View>

            <View style={styles.enrollStatus}>
              <Text
                style={[
                  styles.statusText,
                  { color: item.is_enrolled ? Colors.emerald : Colors.signal },
                ]}
              >
                {item.is_enrolled ? 'Enrolled' : pricing.isFree ? 'Free' : pricing.displayPrice}
              </Text>
            </View>
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
  courseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 165,
    backgroundColor: Colors.surfaceElevated,
  },
  courseImage: {
    width: '100%',
    height: '100%',
  },
  priceBadgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  priceBadgeFree: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  priceBadgePaid: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: '#334155',
  },
  discountBadgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  discountPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strikeOriginalPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountPill: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountPillText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  priceBadgeTextFree: {
    color: '#059669',
  },
  priceBadgeTextPaid: {
    color: '#FFFFFF',
  },
  cardContent: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  eyebrowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFEFF',
    borderColor: '#A5F3FC',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eyebrowText: {
    color: Colors.signal,
    fontSize: 11,
    fontWeight: '700',
  },
  priceInlinePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priceInlinePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  courseTitle: {
    color: Colors.textMain,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 23,
  },
  courseDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  enrollStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  statusText: {
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