import React, { useEffect, useState } from 'react';
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
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi, API_BASE_URL } from '../api/lmsApi';
import { CourseCatalogItem } from '../api/types';
import { useAuth } from '../context/AuthContext';

export const CourseCatalogScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCourses = async () => {
    try {
      const data = await lmsApi.getCourses();
      setCourses(data);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchCourses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchCourses();
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

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.courseCard, cardShadow(2)]}
        onPress={() => navigation.navigate('CourseDetail', { course: item })}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.courseImage}
          resizeMode="cover"
        />

        <View style={styles.cardContent}>
          {item.eyebrow ? (
            <View style={styles.badgeRow}>
              <View style={styles.eyebrowBadge}>
                <Text style={styles.eyebrowText}>{item.eyebrow}</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.courseTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.courseDesc} numberOfLines={3}>
            {item.description}
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
                {item.is_enrolled ? 'Enrolled' : 'Available'}
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
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitlesCol}>
            <Text style={styles.screenTitle}>Explore Courses</Text>
            <Text style={styles.screenSubtitle}>Practical tracks for career advancement</Text>
          </View>
          {!user && (
            <TouchableOpacity
              style={styles.headerSignInBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.headerSignInText}>Sign In</Text>
            </TouchableOpacity>
          )}
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
    marginBottom: 12,
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitlesCol: {
    flex: 1,
  },
  headerSignInBtn: {
    backgroundColor: 'rgba(236, 254, 255, 0.95)',
    borderColor: 'rgba(14, 116, 144, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  headerSignInText: {
    color: Colors.signal,
    fontSize: 13,
    fontWeight: '700',
  },
  screenTitle: {
    color: Colors.textMain,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
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
  courseImage: {
    width: '100%',
    height: 165,
    backgroundColor: Colors.surfaceElevated,
  },
  cardContent: {
    padding: 16,
  },
  badgeRow: {
    marginBottom: 8,
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