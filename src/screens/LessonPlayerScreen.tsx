import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi, API_BASE_URL } from '../api/lmsApi';
import { LessonDetail, CourseDetail, LessonAttachment } from '../api/types';
import { useAuth } from '../context/AuthContext';

function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([^"&?\/\s]{11})/i.exec(trimmed);
  return match ? match[1] : null;
}

function extractVimeoId(urlOrId?: string | number | null): string | null {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();
  if (/^\d+$/.test(str)) return str;
  const match = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i.exec(str);
  return match ? match[1] : null;
}

export const LessonPlayerScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { courseSlug, lessonId: initialLessonId, courseTitle: initialTitle } = route.params || {};

  const [currentLessonId, setCurrentLessonId] = useState<number | string>(initialLessonId);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Load course details
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (courseSlug) {
        const detail = await lmsApi.getCourseDetail(courseSlug);
        if (isMounted && detail) {
          setCourseDetail(detail);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [courseSlug]);

  // Load specific lesson
  const fetchLesson = useCallback(async (id: number | string) => {
    setLoadingLesson(true);
    try {
      const data = await lmsApi.getLesson(courseSlug, id);
      setLesson(data);
      setIsCompleted(Boolean(data?.is_completed || data?.completed));
      setComments(Array.isArray((data as any)?.comments) ? (data as any).comments : []);
    } catch {
      setLesson(null);
      setComments([]);
    } finally {
      setLoadingLesson(false);
    }
  }, [courseSlug]);

  const handlePostComment = async () => {
    const trimmed = newCommentText.trim();
    if (!trimmed || !courseSlug || !currentLessonId) return;

    setPostingComment(true);
    try {
      const res = await lmsApi.postLessonComment(courseSlug, currentLessonId, trimmed);
      if (res.success && res.data) {
        setComments((prev) => [res.data, ...prev]);
        setNewCommentText('');
      } else {
        Alert.alert('Notice', res.error || 'Could not post comment.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while posting your comment.');
    } finally {
      setPostingComment(false);
    }
  };

  useEffect(() => {
    if (currentLessonId) {
      void fetchLesson(currentLessonId);
    }
  }, [currentLessonId, fetchLesson]);

  // Handle Mark Complete
  const handleMarkComplete = async () => {
    if (!lesson?.id || isCompleted) return;
    setCompleting(true);
    try {
      const res = await lmsApi.markLessonComplete(courseSlug, lesson.id);
      if (res.error) {
        Alert.alert('Notice', res.error);
      } else {
        setIsCompleted(true);
        Alert.alert('Lesson Completed!', 'Great job making progress in this course.');
        if (courseSlug) {
          const updated = await lmsApi.getCourseDetail(courseSlug);
          if (updated) setCourseDetail(updated);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not mark lesson as complete.');
    } finally {
      setCompleting(false);
    }
  };

  // Handle downloading resource / PDF
  const handleDownloadAttachment = async (attachment: LessonAttachment, index: number) => {
    const attachId = attachment.id || `att_${index}`;
    setDownloadingAttachmentId(attachId);

    try {
      const token = user?.token || (await AsyncStorage.getItem('@tmm_academy_auth_token')) || '';
      const safeName = (attachment.title || `Resource_${index + 1}`)
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .toLowerCase();
      const hasExtension = safeName.includes('.');
      const filename = hasExtension ? safeName : `${safeName}.pdf`;
      const targetUri = `${FileSystem.documentDirectory}${filename}`;

      // Build target download URL
      let downloadUrl = attachment.url || attachment.file_url || '';
      if (!downloadUrl && attachment.id && lesson?.id && courseSlug) {
        downloadUrl = lmsApi.getAttachmentDownloadUrl(courseSlug, lesson.id, attachment.id);
      }

      if (!downloadUrl) {
        Alert.alert('Download Unavailable', 'No valid download link found for this resource.');
        return;
      }

      // Prepend base URL if relative
      if (downloadUrl.startsWith('/')) {
        downloadUrl = `${API_BASE_URL}${downloadUrl}`;
      }

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, targetUri, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf,application/octet-stream,*/*',
        },
      });

      if (downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            dialogTitle: `Open ${attachment.title || 'Course Resource'}`,
            UTI: filename.endsWith('.pdf') ? 'com.adobe.pdf' : undefined,
          });
        } else {
          Alert.alert('Downloaded', `Saved successfully to: ${downloadResult.uri}`);
        }
      } else {
        Alert.alert('Download Failed', `Server responded with status: ${downloadResult.status}`);
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Could not download course resource.');
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  // Find all lessons in order
  const allLessons: Array<{ id: number; title: string; duration_minutes?: number; is_completed?: boolean }> = [];
  courseDetail?.sections?.forEach((sec) => {
    sec.lessons?.forEach((l) => {
      allLessons.push(l);
    });
  });

  const currentIndex = allLessons.findIndex((l) => String(l.id) === String(currentLessonId));
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Video source detection: YouTube vs Vimeo vs Direct Video
  const youtubeId = lesson?.youtube_id || extractYouTubeId(lesson?.video_url);
  const vimeoId = lesson?.vimeo_id || extractVimeoId(lesson?.video_url);

  let videoEmbedHtml: string | null = null;
  let videoSourceType: 'youtube' | 'vimeo' | 'direct' | 'none' = 'none';

  if (youtubeId) {
    videoSourceType = 'youtube';
    videoEmbedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { width: 100%; height: 100%; background: #000000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .player-wrap { position: relative; width: 100%; height: 100%; }
            iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
          </style>
        </head>
        <body>
          <div class="player-wrap">
            <iframe
              src="https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&fs=1"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowfullscreen
            ></iframe>
          </div>
        </body>
      </html>
    `;
  } else if (vimeoId) {
    videoSourceType = 'vimeo';
    videoEmbedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { width: 100%; height: 100%; background: #0F172A; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .player-wrap { position: relative; width: 100%; height: 100%; }
            iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
          </style>
        </head>
        <body>
          <div class="player-wrap">
            <iframe
              src="https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0&transparent=0"
              frameborder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        </body>
      </html>
    `;
  } else if (lesson?.video_url && lesson.video_url.startsWith('http')) {
    videoSourceType = 'direct';
    videoEmbedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { width: 100%; height: 100%; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            video { width: 100%; height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <video src="${lesson.video_url}" controls autoplay playsinline></video>
        </body>
      </html>
    `;
  }

  // Collect resources & PDF attachments
  const attachmentsList: LessonAttachment[] = [];
  if (Array.isArray(lesson?.attachments) && lesson.attachments.length > 0) {
    attachmentsList.push(...lesson.attachments);
  }
  if (lesson?.pdf_url) {
    const exists = attachmentsList.some((a) => a.url === lesson.pdf_url || a.file_url === lesson.pdf_url);
    if (!exists) {
      attachmentsList.push({
        title: 'Lesson Guide & Reference PDF',
        url: lesson.pdf_url,
        type: 'pdf',
      });
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" animated />

      {/* Top Navbar */}
      <View
        style={[
          styles.navBar,
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
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navCourseTitle} numberOfLines={1}>
            {courseDetail?.title || initialTitle || 'Classroom'}
          </Text>
          <Text style={styles.navLessonCounter}>
            {currentIndex >= 0 ? `Lesson ${currentIndex + 1} of ${allLessons.length}` : 'Lesson Player'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Video Container (Fixed 16:9 ratio) */}
      <View style={styles.videoPlayerContainer}>
        {loadingLesson ? (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="large" color={Colors.signal} />
            <Text style={styles.loadingText}>Loading lesson video...</Text>
          </View>
        ) : videoEmbedHtml ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: videoEmbedHtml }}
            style={styles.webview}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.noVideoText}>Video player unavailable for this lesson</Text>
          </View>
        )}
      </View>

      {/* Content Scroll View */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson Title & Provider Badge */}
        <View style={[styles.card, cardShadow(2)]}>
          <View style={styles.titleRow}>
            <Text style={styles.lessonTitle}>{lesson?.title || 'Lesson Overview'}</Text>
          </View>

          <View style={styles.metaRow}>
            {/* Video Provider Badge */}
            {videoSourceType === 'youtube' && (
              <View style={[styles.providerBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="logo-youtube" size={13} color="#EF4444" />
                <Text style={[styles.providerBadgeText, { color: '#DC2626' }]}>YouTube</Text>
              </View>
            )}
            {videoSourceType === 'vimeo' && (
              <View style={[styles.providerBadge, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Ionicons name="videocam" size={13} color="#0284C7" />
                <Text style={[styles.providerBadgeText, { color: '#0369A1' }]}>Vimeo</Text>
              </View>
            )}
            {videoSourceType === 'direct' && (
              <View style={[styles.providerBadge, { backgroundColor: '#ECFEFF', borderColor: '#A5F3FC' }]}>
                <Ionicons name="play-circle" size={13} color={Colors.signal} />
                <Text style={[styles.providerBadgeText, { color: Colors.signal }]}>Video Stream</Text>
              </View>
            )}

            {lesson?.duration_minutes ? (
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={14} color={Colors.signal} />
                <Text style={styles.metaPillText}>{lesson.duration_minutes} Minutes</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.statusBadge,
                isCompleted ? styles.statusBadgeDone : styles.statusBadgeActive,
              ]}
            >
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'play-circle'}
                size={14}
                color={isCompleted ? Colors.emerald : Colors.signal}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isCompleted ? Colors.emerald : Colors.signal },
                ]}
              >
                {isCompleted ? 'Completed' : 'In Progress'}
              </Text>
            </View>
          </View>

          {/* Mark Complete CTA */}
          <TouchableOpacity
            style={[
              styles.completeBtn,
              isCompleted ? styles.completeBtnDone : styles.completeBtnActive,
            ]}
            onPress={handleMarkComplete}
            disabled={completing || isCompleted}
            activeOpacity={0.85}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isCompleted ? 'checkmark-done' : 'checkmark-circle-outline'}
                  size={18}
                  color={isCompleted ? Colors.emerald : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.completeBtnText,
                    isCompleted && styles.completeBtnTextDone,
                  ]}
                >
                  {isCompleted ? 'Lesson Completed' : 'Mark as Complete'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Summary */}
          {lesson?.summary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Lesson Summary</Text>
              <Text style={styles.summaryText}>{lesson.summary}</Text>
            </View>
          ) : null}
        </View>

        {/* Lesson Materials & Resources / PDF Section */}
        {attachmentsList.length > 0 && (
          <View style={[styles.materialsCard, cardShadow(2)]}>
            <View style={styles.materialsHeader}>
              <View style={styles.materialsIconCircle}>
                <Ionicons name="document-attach" size={18} color={Colors.signal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.materialsSectionTitle}>Lesson Resources & Materials</Text>
                <Text style={styles.materialsSectionSub}>
                  {attachmentsList.length} downloadable {attachmentsList.length === 1 ? 'file' : 'files'} for this lesson
                </Text>
              </View>
            </View>

            <View style={styles.materialsList}>
              {attachmentsList.map((att, idx) => {
                const attachId = att.id || `att_${idx}`;
                const isDownloading = downloadingAttachmentId === attachId;
                const isPdf =
                  att.type === 'pdf' ||
                  att.title?.toLowerCase().includes('.pdf') ||
                  att.url?.toLowerCase().includes('.pdf');

                return (
                  <View key={attachId} style={styles.attachmentItemRow}>
                    <View
                      style={[
                        styles.attachmentFileIcon,
                        { backgroundColor: isPdf ? '#FEF2F2' : '#F0F9FF' },
                      ]}
                    >
                      <Ionicons
                        name={isPdf ? 'document-text' : 'folder-outline'}
                        size={20}
                        color={isPdf ? '#EF4444' : Colors.signal}
                      />
                    </View>

                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.attachmentTitle} numberOfLines={1}>
                        {att.title || 'Course Material'}
                      </Text>
                      <Text style={styles.attachmentMeta}>
                        {isPdf ? 'PDF Document' : 'Resource File'}
                        {att.size ? ` • ${att.size}` : ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.downloadBtn}
                      activeOpacity={0.8}
                      onPress={() => void handleDownloadAttachment(att, idx)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={Colors.signal} />
                      ) : (
                        <>
                          <Ionicons name="cloud-download-outline" size={15} color={Colors.signal} />
                          <Text style={styles.downloadBtnText}>Open</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Prev & Next Navigation Buttons */}
        <View style={styles.navButtonsRow}>
          {prevLesson ? (
            <TouchableOpacity
              style={[styles.stepBtn, cardShadow(1)]}
              onPress={() => setCurrentLessonId(prevLesson.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.textMain} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.stepBtnSub}>Previous</Text>
                <Text style={styles.stepBtnTitle} numberOfLines={1}>
                  {prevLesson.title}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={{ width: 12 }} />

          {nextLesson ? (
            <TouchableOpacity
              style={[styles.stepBtn, styles.stepBtnNext, cardShadow(1)]}
              onPress={() => setCurrentLessonId(nextLesson.id)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, marginRight: 8, alignItems: 'flex-end' }}>
                <Text style={styles.stepBtnSub}>Next</Text>
                <Text style={styles.stepBtnTitle} numberOfLines={1}>
                  {nextLesson.title}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={Colors.signal} />
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>

        {/* Lesson Discussion & Questions Section */}
        <View style={[styles.discussionSection, cardShadow(1)]}>
          <View style={styles.discussionHeader}>
            <View style={styles.discussionHeaderLeft}>
              <Ionicons name="chatbubbles" size={18} color={Colors.signal} />
              <Text style={styles.discussionTitle}>Lesson Discussion</Text>
            </View>
            <View style={styles.commentCountBadge}>
              <Text style={styles.commentCountText}>{comments.length}</Text>
            </View>
          </View>

          {/* Comment Composer */}
          <View style={styles.commentComposerRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Ask a question about this lesson..."
              placeholderTextColor="#94A3B8"
              value={newCommentText}
              onChangeText={setNewCommentText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.postCommentBtn,
                (!newCommentText.trim() || postingComment) && styles.postCommentBtnDisabled,
              ]}
              onPress={handlePostComment}
              disabled={!newCommentText.trim() || postingComment}
              activeOpacity={0.8}
            >
              {postingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={15} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {comments.length === 0 ? (
            <View style={styles.emptyCommentsBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color="#94A3B8" />
              <Text style={styles.emptyCommentsText}>
                No questions or discussions yet. Have a question? Ask above!
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((c, cIdx) => {
                const authorName = c.user?.name || c.author_name || (c.user_id === user?.id ? user?.name : 'Learner');
                const initial = (authorName || 'U').charAt(0).toUpperCase();
                const isInstructor = Boolean(c.is_instructor || c.user?.is_instructor);

                return (
                  <View key={c.id || cIdx} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{initial}</Text>
                    </View>
                    <View style={styles.commentBodyCol}>
                      <View style={styles.commentAuthorRow}>
                        <Text style={styles.commentAuthorName}>{authorName}</Text>
                        {isInstructor && (
                          <View style={styles.instructorBadge}>
                            <Text style={styles.instructorBadgeText}>Instructor</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.commentBodyText}>{c.body || c.comment || c.message || ''}</Text>

                      {/* Nested Replies */}
                      {c.replies && Array.isArray(c.replies) && c.replies.length > 0 && (
                        <View style={styles.repliesList}>
                          {c.replies.map((r: any, rIdx: number) => {
                            const rAuthor = r.user?.name || r.author_name || 'Instructor';
                            return (
                              <View key={r.id || rIdx} style={styles.replyItem}>
                                <Text style={styles.replyAuthor}>{rAuthor}:</Text>
                                <Text style={styles.replyBody}>{r.body || r.comment || ''}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Course Curriculum Drawer / List */}
        {courseDetail?.sections && courseDetail.sections.length > 0 ? (
          <View style={styles.syllabusSection}>
            <Text style={styles.syllabusHeading}>Course Syllabus</Text>
            {courseDetail.sections.map((section, sIdx) => (
              <View key={section.id || sIdx} style={[styles.sectionCard, cardShadow(1)]}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.lessons?.map((les, lIdx) => {
                  const isCurrent = String(les.id) === String(currentLessonId);
                  return (
                    <TouchableOpacity
                      key={les.id || lIdx}
                      style={[
                        styles.lessonItemRow,
                        isCurrent && styles.lessonItemRowCurrent,
                      ]}
                      onPress={() => setCurrentLessonId(les.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          les.is_completed
                            ? 'checkmark-circle'
                            : isCurrent
                            ? 'play-circle'
                            : 'play-circle-outline'
                        }
                        size={20}
                        color={
                          les.is_completed
                            ? Colors.emerald
                            : isCurrent
                            ? Colors.signal
                            : Colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.lessonItemTitle,
                          isCurrent && styles.lessonItemTitleCurrent,
                        ]}
                        numberOfLines={2}
                      >
                        {les.title}
                      </Text>
                      <Text style={styles.lessonItemTime}>
                        {les.duration_minutes ? `${les.duration_minutes}m` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {courseDetail?.activities && courseDetail.activities.length > 0 ? (
              <View style={[styles.sectionCard, cardShadow(1)]}>
                <Text style={styles.sectionTitle}>Checkpoints & Quizzes</Text>
                {courseDetail.activities.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={styles.lessonItemRow}
                    onPress={() => {
                      navigation.navigate('Quiz', {
                        courseSlug,
                        activityId: act.id,
                        activityTitle: act.title,
                        courseTitle: courseDetail.title,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={act.is_completed ? 'checkmark-circle' : 'help-circle-outline'}
                      size={20}
                      color={act.is_completed ? Colors.emerald : '#F59E0B'}
                    />
                    <Text style={styles.lessonItemTitle} numberOfLines={2}>
                      {act.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0F172A',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  navCourseTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  navLessonCounter: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  loadingText: {
    color: Colors.textMuted,
    marginTop: 10,
    fontSize: 13,
  },
  noVideoText: {
    color: Colors.textMuted,
    marginTop: 10,
    fontSize: 13,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  titleRow: {
    marginBottom: 10,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFEFF',
  },
  statusBadgeDone: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  completeBtnActive: {
    backgroundColor: Colors.signal,
  },
  completeBtnDone: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: Colors.emerald,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  completeBtnTextDone: {
    color: Colors.emerald,
  },
  summaryBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  materialsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  materialsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  materialsIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  materialsSectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  materialsList: {
    gap: 10,
  },
  attachmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  stepBtnNext: {
    borderColor: Colors.signal,
  },
  stepBtnSub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  stepBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginTop: 2,
  },
  syllabusSection: {
    marginTop: 4,
  },
  discussionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  discussionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discussionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  commentCountBadge: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  commentCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.signal,
  },
  commentComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 80,
  },
  postCommentBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.signal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCommentBtnDisabled: {
    opacity: 0.5,
  },
  emptyCommentsBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyCommentsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E7490',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  commentBodyCol: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  instructorBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  instructorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  commentBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  repliesList: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    gap: 6,
  },
  replyItem: {
    flexDirection: 'row',
    gap: 4,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E7490',
  },
  replyBody: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  syllabusHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 10,
  },
  lessonItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: 10,
  },
  lessonItemRowCurrent: {
    backgroundColor: '#ECFEFF',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderTopWidth: 0,
  },
  lessonItemTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  lessonItemTitleCurrent: {
    color: Colors.signal,
    fontWeight: '700',
  },
  lessonItemTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
