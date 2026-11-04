import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi } from '../api/lmsApi';
import { CourseCatalogItem, LiveClassItem } from '../api/types';

export const LiveClassesScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [liveClasses, setLiveClasses] = useState<LiveClassItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'upcoming'>('all');
  const [joiningId, setJoiningId] = useState<number | string | null>(null);

  const fetchLiveClasses = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch enrolled courses to aggregate scheduled live classes
      const courses = await lmsApi.getCourses();
      const allLive: LiveClassItem[] = [];

      for (const c of courses) {
        if (c.live_sessions && Array.isArray(c.live_sessions)) {
          c.live_sessions.forEach((s: any) => {
            allLive.push({
              id: s.id,
              course_id: c.id,
              course_slug: c.slug,
              course_title: c.title,
              title: s.title || 'Live Interactive Class',
              description: s.description,
              start_time: s.start_time,
              end_time: s.end_time,
              duration_minutes: s.duration_minutes || 60,
              instructor_name: s.instructor_name || 'Course Instructor',
              instructor_avatar: s.instructor_avatar,
              platform: s.platform || 'zoom',
              join_url: s.join_url,
              is_live_now: Boolean(s.is_live_now),
              status: s.is_live_now ? 'live' : 'upcoming',
            });
          });
        }
      }

      setLiveClasses(allLive);
    } catch {
      setLiveClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveClasses();
  }, [fetchLiveClasses]);

  const handleJoinClass = async (item: LiveClassItem) => {
    setJoiningId(item.id);
    try {
      if (item.course_slug) {
        const res = await lmsApi.joinLiveSession(item.course_slug, item.id);
        const url = res.join_url || item.join_url;
        if (url) {
          await Linking.openURL(url);
          return;
        } else if (res.error) {
          Alert.alert('Live Session', res.error);
          return;
        }
      }

      if (item.join_url) {
        await Linking.openURL(item.join_url);
      } else {
        Alert.alert(
          'Join Window',
          'Live class links are activated 10 minutes before the scheduled start time. Please check back shortly.'
        );
      }
    } catch {
      Alert.alert('Notice', 'Could not open live classroom.');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredList = liveClasses.filter((c) => {
    if (filterTab === 'live') return c.is_live_now || c.status === 'live';
    if (filterTab === 'upcoming') return !c.is_live_now && c.status === 'upcoming';
    return true;
  });

  const liveNowItem = liveClasses.find((c) => c.is_live_now || c.status === 'live');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" animated />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 8 : 12),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textMain} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Live Classes & Webinars</Text>
          <Text style={styles.headerSubtitle}>Real-time learning & workshops</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchLiveClasses}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={Colors.signal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* LIVE NOW BANNER (If any live class is broadcasting) */}
        {liveNowItem && (
          <View style={[styles.liveNowCard, cardShadow(3)]}>
            <View style={styles.liveNowTop}>
              <View style={styles.livePulseBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.livePulseText}>BROADCASTING NOW</Text>
              </View>
              <View style={styles.platformBadge}>
                <Ionicons name="videocam" size={13} color="#FFFFFF" />
                <Text style={styles.platformBadgeText}>
                  {(liveNowItem.platform || 'Live').toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.liveNowCourse}>{liveNowItem.course_title}</Text>
            <Text style={styles.liveNowTitle}>{liveNowItem.title}</Text>

            <View style={styles.liveNowFooter}>
              <View style={styles.liveNowInstructor}>
                <Ionicons name="person-circle" size={20} color="#FFFFFF" />
                <Text style={styles.liveNowInstructorText}>
                  {liveNowItem.instructor_name}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.joinLiveNowBtn}
                onPress={() => void handleJoinClass(liveNowItem)}
                activeOpacity={0.85}
                disabled={joiningId === liveNowItem.id}
              >
                {joiningId === liveNowItem.id ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="enter" size={16} color="#DC2626" />
                    <Text style={styles.joinLiveNowBtnText}>Join Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All Sessions' },
            { key: 'live', label: 'Live Now' },
            { key: 'upcoming', label: 'Upcoming' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterPill,
                filterTab === tab.key && styles.filterPillActive,
              ]}
              onPress={() => setFilterTab(tab.key as any)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterTab === tab.key && styles.filterPillTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.signal} />
            <Text style={styles.loadingText}>Checking scheduled classes...</Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={[styles.emptyCard, cardShadow(1)]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={42} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Live Classes Scheduled</Text>
            <Text style={styles.emptyDesc}>
              Interactive Zoom and Google Meet sessions are announced directly by course instructors. When scheduled, join links will appear here.
            </Text>
            <TouchableOpacity
              style={styles.browseCoursesBtn}
              onPress={() => navigation.navigate('CatalogTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.browseCoursesBtnText}>Explore Available Courses</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.classList}>
            {filteredList.map((item, idx) => {
              const isJoining = joiningId === item.id;
              const formattedDate = item.start_time
                ? new Date(item.start_time).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Date to be confirmed';

              return (
                <View key={item.id || idx} style={[styles.classCard, cardShadow(1)]}>
                  <View style={styles.classCardHeader}>
                    <View style={styles.platformIconCircle}>
                      <Ionicons
                        name={item.platform === 'zoom' ? 'videocam' : 'tv'}
                        size={18}
                        color={Colors.signal}
                      />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.classCourseTag} numberOfLines={1}>
                        {item.course_title}
                      </Text>
                      <Text style={styles.classTitle}>{item.title}</Text>
                    </View>
                    {item.is_live_now ? (
                      <View style={styles.liveIndicatorPill}>
                        <Text style={styles.liveIndicatorText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>

                  {item.description ? (
                    <Text style={styles.classDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.classMetaRow}>
                    <View style={styles.classMetaItem}>
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <Text style={styles.classMetaText}>{formattedDate}</Text>
                    </View>
                    <View style={styles.classMetaItem}>
                      <Ionicons name="hourglass-outline" size={14} color="#64748B" />
                      <Text style={styles.classMetaText}>{item.duration_minutes} min</Text>
                    </View>
                  </View>

                  <View style={styles.classFooter}>
                    <View style={styles.instructorInfo}>
                      <Ionicons name="person-circle-outline" size={18} color="#64748B" />
                      <Text style={styles.instructorName}>{item.instructor_name}</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.joinBtn,
                        item.is_live_now ? styles.joinBtnLive : styles.joinBtnUpcoming,
                      ]}
                      onPress={() => void handleJoinClass(item)}
                      disabled={isJoining}
                      activeOpacity={0.8}
                    >
                      {isJoining ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="videocam"
                            size={14}
                            color={item.is_live_now ? '#FFFFFF' : Colors.signal}
                          />
                          <Text
                            style={[
                              styles.joinBtnText,
                              item.is_live_now
                                ? styles.joinBtnTextLive
                                : styles.joinBtnTextUpcoming,
                            ]}
                          >
                            {item.is_live_now ? 'Join Class Now' : 'Enter Classroom'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  liveNowCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  liveNowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  livePulseText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  platformBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  liveNowCourse: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  liveNowTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginBottom: 14,
  },
  liveNowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveNowInstructor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveNowInstructorText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  joinLiveNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinLiveNowBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#ECFEFF',
    borderColor: Colors.signal,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: Colors.signal,
    fontWeight: '700',
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  browseCoursesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.signal,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseCoursesBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  classList: {
    gap: 12,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  classCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  platformIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  classCourseTag: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  classTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  liveIndicatorPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  classDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  classMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  classMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  classFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  instructorName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  joinBtnLive: {
    backgroundColor: '#EF4444',
  },
  joinBtnUpcoming: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  joinBtnTextLive: {
    color: '#FFFFFF',
  },
  joinBtnTextUpcoming: {
    color: Colors.signal,
  },
});
