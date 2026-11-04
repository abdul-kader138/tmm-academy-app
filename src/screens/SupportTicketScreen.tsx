import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi } from '../api/lmsApi';
import { SupportTicket, CourseCatalogItem } from '../api/types';
import { useAuth } from '../context/AuthContext';

export const SupportTicketScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal: Create Ticket
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Expanded Ticket / Detail Modal
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await lmsApi.getSupportTickets();
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const list = await lmsApi.getCourses();
      setCourses(list.filter((c) => c.is_enrolled));
    } catch {
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
    void fetchCourses();
  }, [fetchTickets, fetchCourses]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchTickets();
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim()) {
      Alert.alert('Subject Required', 'Please enter a brief subject for your ticket.');
      return;
    }
    if (!newMessage.trim()) {
      Alert.alert('Message Required', 'Please describe the problem or question in detail.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await lmsApi.createSupportTicket({
        subject: newSubject.trim(),
        message: newMessage.trim(),
        priority: newPriority,
        course_id: selectedCourseId,
      });

      if (res.success) {
        Alert.alert('Ticket Submitted', 'Your ticket has been logged. Our team will review and reply promptly.');
        setCreateModalVisible(false);
        setNewSubject('');
        setNewMessage('');
        setSelectedCourseId(null);
        setNewPriority('normal');
        void fetchTickets();
      } else {
        Alert.alert('Error', res.error || 'Could not submit support ticket.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await lmsApi.replySupportTicket(activeTicket.id, replyText.trim());
      if (res.success) {
        setReplyText('');
        // Refresh active ticket details
        const updated = await lmsApi.getSupportTicket(activeTicket.id);
        if (updated) {
          setActiveTicket(updated);
        } else {
          // Fallback append local reply
          const newReplies = [
            ...(activeTicket.replies || []),
            {
              id: Date.now(),
              user_name: user?.first_name ? `${user.first_name} ${user.last_name}` : 'You',
              is_staff: false,
              message: replyText.trim(),
              created_at: new Date().toISOString(),
            },
          ];
          setActiveTicket({ ...activeTicket, replies: newReplies, status: 'open' });
        }
        void fetchTickets();
      } else {
        Alert.alert('Notice', res.error || 'Could not post reply.');
      }
    } catch {
      Alert.alert('Error', 'An error occurred while sending your reply.');
    } finally {
      setReplying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return { bg: '#ECFEFF', text: Colors.signal, border: '#A5F3FC' };
      case 'pending':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'resolved':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'closed':
      default:
        return { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return { bg: '#FEF2F2', text: '#EF4444' };
      case 'normal':
        return { bg: '#F0F9FF', text: '#0284C7' };
      case 'low':
      default:
        return { bg: '#F8FAFC', text: '#64748B' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" animated />

      {/* Top Header */}
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
          <Text style={styles.headerTitle}>Support & Help</Text>
          <Text style={styles.headerSubtitle}>Learner inquiries & assistance</Text>
        </View>

        <TouchableOpacity
          style={styles.newTicketHeaderBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newTicketHeaderText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Fast Contact Options */}
        <View style={[styles.contactCard, cardShadow(1)]}>
          <View style={styles.contactIconCircle}>
            <Ionicons name="mail" size={20} color={Colors.signal} />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.contactCardTitle}>Direct Support Email</Text>
            <Text style={styles.contactCardDesc}>support@tmminnovation.com</Text>
          </View>
          <TouchableOpacity
            style={styles.contactActionBtn}
            onPress={() => void Linking.openURL('mailto:support@tmminnovation.com')}
            activeOpacity={0.8}
          >
            <Text style={styles.contactActionBtnText}>Email Us</Text>
            <Ionicons name="open-outline" size={13} color={Colors.signal} />
          </TouchableOpacity>
        </View>

        {/* Tickets Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Support Tickets</Text>
          <TouchableOpacity onPress={handleRefresh} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={Colors.signal} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.signal} />
            <Text style={styles.loadingText}>Loading support tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View style={[styles.emptyCard, cardShadow(1)]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Support Tickets Yet</Text>
            <Text style={styles.emptyDesc}>
              Have questions regarding course access, quizzes, certificates, or account settings? Our support team is ready to help.
            </Text>
            <TouchableOpacity
              style={styles.createTicketBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.createTicketBtnText}>Create Support Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {tickets.map((t, idx) => {
              const status = getStatusColor(t.status);
              const priority = getPriorityColor(t.priority);
              const ticketNum = t.ticket_number || `TMM-${t.id}`;

              return (
                <TouchableOpacity
                  key={t.id || idx}
                  style={[styles.ticketCard, cardShadow(1)]}
                  activeOpacity={0.8}
                  onPress={() => setActiveTicket(t)}
                >
                  <View style={styles.ticketCardTop}>
                    <View style={styles.ticketNumBadge}>
                      <Text style={styles.ticketNumText}>#{ticketNum}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <View style={[styles.priorityPill, { backgroundColor: priority.bg }]}>
                        <Text style={[styles.priorityPillText, { color: priority.text }]}>
                          {(t.priority || 'normal').toUpperCase()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: status.bg, borderColor: status.border },
                        ]}
                      >
                        <Text style={[styles.statusPillText, { color: status.text }]}>
                          {(t.status || 'open').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.ticketSubject} numberOfLines={2}>
                    {t.subject}
                  </Text>

                  {t.message ? (
                    <Text style={styles.ticketPreview} numberOfLines={2}>
                      {t.message}
                    </Text>
                  ) : null}

                  <View style={styles.ticketFooter}>
                    <View style={styles.ticketDateRow}>
                      <Ionicons name="time-outline" size={13} color="#94A3B8" />
                      <Text style={styles.ticketDateText}>
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'}
                      </Text>
                    </View>

                    <View style={styles.viewDetailLink}>
                      <Text style={styles.viewDetailText}>View Conversation</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.signal} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODAL: CREATE TICKET */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>New Support Ticket</Text>
              <Text style={styles.modalSubtitle}>We usually respond within 24 hours</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setCreateModalVisible(false)}
            >
              <Ionicons name="close" size={20} color={Colors.textMain} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Subject Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Question about Lesson 3 quiz or certificate"
                placeholderTextColor="#94A3B8"
                value={newSubject}
                onChangeText={setNewSubject}
              />
            </View>

            {/* Course Selector (if enrolled courses available) */}
            {courses.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Related Course (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  <TouchableOpacity
                    style={[
                      styles.courseChip,
                      selectedCourseId === null && styles.courseChipActive,
                    ]}
                    onPress={() => setSelectedCourseId(null)}
                  >
                    <Text
                      style={[
                        styles.courseChipText,
                        selectedCourseId === null && styles.courseChipTextActive,
                      ]}
                    >
                      General / Account
                    </Text>
                  </TouchableOpacity>

                  {courses.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.courseChip,
                        selectedCourseId === c.id && styles.courseChipActive,
                      ]}
                      onPress={() => setSelectedCourseId(c.id)}
                    >
                      <Text
                        style={[
                          styles.courseChipText,
                          selectedCourseId === c.id && styles.courseChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Priority Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.prioritySelectorRow}>
                {(['low', 'normal', 'high'] as const).map((p) => {
                  const isSelected = newPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.prioritySelectBtn,
                        isSelected && styles.prioritySelectBtnActive,
                      ]}
                      onPress={() => setNewPriority(p)}
                    >
                      <Text
                        style={[
                          styles.prioritySelectBtnText,
                          isSelected && styles.prioritySelectBtnTextActive,
                        ]}
                      >
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Message Area */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe your issue or question in detail..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={newMessage}
                onChangeText={setNewMessage}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitTicketBtn}
              onPress={handleCreateTicket}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
                  <Text style={styles.submitTicketBtnText}>Submit Support Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: VIEW TICKET CONVERSATION */}
      <Modal
        visible={Boolean(activeTicket)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveTicket(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {activeTicket?.subject}
              </Text>
              <Text style={styles.modalSubtitle}>
                Ticket #{activeTicket?.ticket_number || `TMM-${activeTicket?.id}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setActiveTicket(null)}
            >
              <Ionicons name="close" size={20} color={Colors.textMain} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Original message card */}
            <View style={[styles.messageCard, styles.originalMessageCard]}>
              <View style={styles.messageAuthorRow}>
                <View style={styles.authorBadge}>
                  <Text style={styles.authorBadgeText}>You (Student)</Text>
                </View>
                <Text style={styles.messageDate}>
                  {activeTicket?.created_at
                    ? new Date(activeTicket.created_at).toLocaleString()
                    : 'Created'}
                </Text>
              </View>
              <Text style={styles.messageBody}>{activeTicket?.message}</Text>
            </View>

            {/* Replies thread */}
            {activeTicket?.replies && activeTicket.replies.length > 0 && (
              <View style={{ marginVertical: 14 }}>
                <Text style={styles.repliesHeading}>Replies & Updates</Text>
                {activeTicket.replies.map((reply, rIdx) => (
                  <View
                    key={reply.id || rIdx}
                    style={[
                      styles.messageCard,
                      reply.is_staff ? styles.staffMessageCard : styles.studentReplyCard,
                    ]}
                  >
                    <View style={styles.messageAuthorRow}>
                      <View
                        style={[
                          styles.authorBadge,
                          reply.is_staff ? styles.staffAuthorBadge : styles.authorBadge,
                        ]}
                      >
                        <Ionicons
                          name={reply.is_staff ? 'shield-checkmark' : 'person'}
                          size={12}
                          color={reply.is_staff ? '#FFFFFF' : Colors.signal}
                        />
                        <Text
                          style={[
                            styles.authorBadgeText,
                            reply.is_staff && { color: '#FFFFFF' },
                          ]}
                        >
                          {reply.is_staff ? `${reply.user_name || 'Staff'}` : 'You'}
                        </Text>
                      </View>
                      <Text style={styles.messageDate}>
                        {reply.created_at ? new Date(reply.created_at).toLocaleString() : ''}
                      </Text>
                    </View>
                    <Text style={styles.messageBody}>{reply.message}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Reply Input Box */}
            <View style={styles.replyBox}>
              <Text style={styles.replyBoxTitle}>Send a Follow-up Message</Text>
              <TextInput
                style={[styles.textInput, styles.replyTextArea]}
                placeholder="Type your response or update here..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity
                style={styles.sendReplyBtn}
                onPress={handleSendReply}
                disabled={replying || !replyText.trim()}
                activeOpacity={0.8}
              >
                {replying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color="#FFFFFF" />
                    <Text style={styles.sendReplyBtnText}>Send Reply</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  newTicketHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.signal,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  newTicketHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  contactIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactCardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  contactActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
  createTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.signal,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ticketList: {
    gap: 12,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketNumBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
    marginBottom: 6,
  },
  ticketPreview: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ticketDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketDateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
    padding: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 110,
  },
  chipRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  courseChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  courseChipActive: {
    backgroundColor: '#ECFEFF',
    borderColor: Colors.signal,
  },
  courseChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  courseChipTextActive: {
    color: Colors.signal,
    fontWeight: '700',
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prioritySelectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  prioritySelectBtnActive: {
    backgroundColor: Colors.signal,
    borderColor: Colors.signal,
  },
  prioritySelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  prioritySelectBtnTextActive: {
    color: '#FFFFFF',
  },
  submitTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.signal,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  submitTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  messageCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  originalMessageCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  staffMessageCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  studentReplyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  messageAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  staffAuthorBadge: {
    backgroundColor: Colors.signal,
  },
  authorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.signal,
  },
  messageDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  messageBody: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  repliesHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  replyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 40,
  },
  replyBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  replyTextArea: {
    minHeight: 70,
    marginBottom: 10,
  },
  sendReplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.signal,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
  },
  sendReplyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
