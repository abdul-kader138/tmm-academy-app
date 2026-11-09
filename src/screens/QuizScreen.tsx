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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, cardShadow } from '../theme/colors';
import { lmsApi } from '../api/lmsApi';
import { ActivityDetail } from '../api/types';

export const QuizScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { courseSlug, activityId, activityTitle: initialTitle, courseTitle } = route.params || {};

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score?: number; passed?: boolean; message?: string } | null>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const data = await lmsApi.getActivity(courseSlug, activityId);
      setActivity(data);
    } catch {
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [courseSlug, activityId]);

  useEffect(() => {
    if (courseSlug && activityId) {
      void fetchActivity();
    }
  }, [courseSlug, activityId, fetchActivity]);

  const questions = activity?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isCurrentAnswered = selectedAnswers[currentIndex] !== undefined;

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  const handleSubmit = () => {
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < totalQuestions) {
      Alert.alert(
        'Incomplete Quiz',
        `You have answered ${answeredCount} of ${totalQuestions} questions. Do you still want to submit?`,
        [
          { text: 'Review Questions', style: 'cancel' },
          { text: 'Submit Anyway', onPress: () => void executeSubmit() },
        ]
      );
    } else {
      Alert.alert('Submit Quiz', 'Are you ready to submit your test for scoring?', [
        { text: 'Review', style: 'cancel' },
        { text: 'Submit Now', onPress: () => void executeSubmit() },
      ]);
    }
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const answerPayload: Record<string, number> = {};
      Object.entries(selectedAnswers).forEach(([qIdx, optIdx]) => {
        answerPayload[qIdx] = optIdx;
      });

      const res = await lmsApi.submitQuizAnswers(courseSlug, activityId, answerPayload);
      if (res.success) {
        setResult({
          score: res.score,
          passed: res.passed,
          message: res.message,
        });
      } else {
        Alert.alert('Submission Failed', res.error || 'Could not submit answers.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" animated />

      {/* Modern Top Header */}
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
          <Text style={styles.headerCourseTitle} numberOfLines={1}>
            {courseTitle || 'Course Checkpoint'}
          </Text>
          <Text style={styles.headerActivityTitle} numberOfLines={1}>
            {activity?.title || initialTitle || 'Quiz / Exam'}
          </Text>
        </View>

        <View style={styles.headerRightBadge}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.signal} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.signal} />
          <Text style={styles.loadingText}>Loading checkpoint...</Text>
        </View>
      ) : result ? (
        /* Results View */
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={[styles.resultCard, cardShadow(2)]}>
            <View
              style={[
                styles.resultIconCircle,
                { backgroundColor: result.passed ? '#ECFDF5' : '#FEF2F2' },
              ]}
            >
              <Ionicons
                name={result.passed ? 'trophy' : 'alert-circle'}
                size={48}
                color={result.passed ? Colors.emerald : '#EF4444'}
              />
            </View>

            <Text style={styles.resultTitle}>
              {result.passed ? 'Quiz Passed!' : 'Needs Review'}
            </Text>

            <Text style={styles.resultMessage}>
              {result.message ||
                (result.passed
                  ? 'Great work! You have satisfied this checkpoint requirement.'
                  : 'You did not achieve the required score on this attempt. You can review the course material and try again.')}
            </Text>

            {typeof result.score === 'number' && (
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>Final Score</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    { color: result.passed ? Colors.emerald : '#EF4444' },
                  ]}
                >
                  {result.score}%
                </Text>
                {activity?.passing_score ? (
                  <View style={styles.passingPill}>
                    <Text style={styles.scoreSub}>
                      Passing Requirement: {activity.passing_score}%
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.returnBtnText}>Return to Course</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : totalQuestions === 0 ? (
        /* No questions */
        <View style={styles.centerBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="document-text-outline" size={44} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Checkpoint Details</Text>
          <Text style={styles.emptyDesc}>
            {activity?.instructions ||
              activity?.description ||
              'This checkpoint is managed by course instructors. No multiple-choice questions are required at this time.'}
          </Text>
          {activity?.passing_score ? (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>Passing score: {activity.passing_score}%</Text>
            </View>
          ) : null}
        </View>
      ) : (
        /* Active Quiz Screen */
        <View style={styles.stepperContainer}>
          {/* Creative Progress Bar & Interactive Question Navigator */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeaderRow}>
              <View style={styles.progressBarWrapper}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${((currentIndex + 1) / totalQuestions) * 100}%` },
                  ]}
                />
              </View>
              <View style={styles.progressCounterBadge}>
                <Text style={styles.progressCounterCurrent}>{currentIndex + 1}</Text>
                <Text style={styles.progressCounterDivider}>/</Text>
                <Text style={styles.progressCounterTotal}>{totalQuestions}</Text>
              </View>
            </View>

            {/* Question Quick Jump Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.questionPillsContainer}
            >
              {questions.map((_, qIdx) => {
                const isAnswered = selectedAnswers[qIdx] !== undefined;
                const isCurrent = qIdx === currentIndex;
                return (
                  <TouchableOpacity
                    key={qIdx}
                    onPress={() => setCurrentIndex(qIdx)}
                    style={[
                      styles.stepPill,
                      isCurrent
                        ? styles.stepPillActive
                        : isAnswered
                        ? styles.stepPillAnswered
                        : styles.stepPillDefault,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.stepPillText,
                        isCurrent
                          ? styles.stepPillTextActive
                          : isAnswered
                          ? styles.stepPillTextAnswered
                          : styles.stepPillTextDefault,
                      ]}
                    >
                      Q{qIdx + 1}
                    </Text>
                    {isAnswered && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={isCurrent ? '#FFFFFF' : '#059669'}
                        style={styles.stepPillCheck}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.questionScrollView}
            contentContainerStyle={styles.questionContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Friendly Instructions Banner */}
            {activity?.instructions ? (
              <View style={styles.instructionsBanner}>
                <View style={styles.instructionsIconCircle}>
                  <Ionicons name="bulb-outline" size={16} color={Colors.signal} />
                </View>
                <Text style={styles.instructionsText}>{activity.instructions}</Text>
              </View>
            ) : null}

            {/* Creative Question Card */}
            <View style={[styles.questionCard, cardShadow(2)]}>
              <View style={styles.questionCardTop}>
                <View style={styles.questionTag}>
                  <Ionicons name="help-circle" size={14} color={Colors.signal} />
                  <Text style={styles.questionTagText}>
                    QUESTION {currentIndex + 1 < 10 ? `0${currentIndex + 1}` : currentIndex + 1}
                  </Text>
                </View>
                {activity?.passing_score ? (
                  <View style={styles.passBadge}>
                    <Text style={styles.passBadgeText}>Pass: {activity.passing_score}%</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.questionPrompt}>
                {currentQuestion.prompt ||
                  (currentQuestion as any).question ||
                  (currentQuestion as any).title ||
                  ''}
              </Text>
            </View>

            {/* Choose the best answer header */}
            <View style={styles.optionsHeaderRow}>
              <Text style={styles.optionsSectionTitle}>Select the correct option:</Text>
            </View>

            {/* Options List */}
            <View style={styles.optionsList}>
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                const optionLabel =
                  typeof option === 'string'
                    ? option
                    : (option as any)?.text ||
                      (option as any)?.label ||
                      (option as any)?.option ||
                      String(option);

                return (
                  <TouchableOpacity
                    key={optIdx}
                    style={[
                      styles.optionCard,
                      isSelected ? styles.optionCardSelected : styles.optionCardDefault,
                    ]}
                    onPress={() => handleSelectOption(optIdx)}
                    activeOpacity={0.85}
                  >
                    {/* Letter Badge (A, B, C, D) */}
                    <View
                      style={[
                        styles.letterBadge,
                        isSelected ? styles.letterBadgeSelected : styles.letterBadgeDefault,
                      ]}
                    >
                      <Text
                        style={[
                          styles.letterBadgeText,
                          isSelected ? styles.letterBadgeTextSelected : styles.letterBadgeTextDefault,
                        ]}
                      >
                        {letter}
                      </Text>
                    </View>

                    {/* Option Text */}
                    <Text
                      style={[
                        styles.optionText,
                        isSelected ? styles.optionTextSelected : styles.optionTextDefault,
                      ]}
                    >
                      {optionLabel}
                    </Text>

                    {/* Radio Checkbox Indicator */}
                    <View
                      style={[
                        styles.radioIndicator,
                        isSelected ? styles.radioIndicatorSelected : styles.radioIndicatorDefault,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Stepper Footer Action Bar */}
          <View
            style={[
              styles.footer,
              cardShadow(3),
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 },
            ]}
          >
            <TouchableOpacity
              style={[styles.prevBtn, currentIndex === 0 && styles.prevBtnDisabled]}
              onPress={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={currentIndex === 0 ? '#94A3B8' : Colors.textMain}
              />
              <Text
                style={[
                  styles.prevBtnText,
                  currentIndex === 0 && styles.prevBtnTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            {currentIndex < totalQuestions - 1 ? (
              <TouchableOpacity
                style={[
                  styles.nextBtn,
                  !isCurrentAnswered && styles.nextBtnPending,
                ]}
                onPress={() => setCurrentIndex((p) => Math.min(totalQuestions - 1, p + 1))}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Next Question</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Submit Quiz</Text>
                    <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerCourseTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  headerActivityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  headerRightBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoPill: {
    marginTop: 16,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  infoPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.signal,
  },
  stepperContainer: {
    flex: 1,
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  progressBarWrapper: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.signal,
    borderRadius: 4,
  },
  progressCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressCounterCurrent: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.signal,
  },
  progressCounterDivider: {
    fontSize: 12,
    color: '#94A3B8',
    marginHorizontal: 3,
  },
  progressCounterTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  questionPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  stepPillDefault: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  stepPillActive: {
    backgroundColor: Colors.signal,
    borderColor: Colors.signal,
  },
  stepPillAnswered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepPillTextDefault: {
    color: '#64748B',
  },
  stepPillTextActive: {
    color: '#FFFFFF',
  },
  stepPillTextAnswered: {
    color: '#059669',
  },
  stepPillCheck: {
    marginLeft: 3,
  },
  questionScrollView: {
    flex: 1,
  },
  questionContent: {
    padding: 18,
    paddingBottom: 40,
  },
  instructionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  instructionsIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '500',
    lineHeight: 18,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  questionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  questionTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.signal,
    letterSpacing: 0.6,
  },
  passBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  passBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  questionPrompt: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
  },
  optionsHeaderRow: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  optionsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionCardDefault: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  optionCardSelected: {
    backgroundColor: '#F0FDFA', // Crisp solid mint tint (no Android shadow box glitch)
    borderWidth: 2,
    borderColor: Colors.signal,
    borderLeftWidth: 5,
    borderLeftColor: Colors.signal,
  },
  letterBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  letterBadgeDefault: {
    backgroundColor: '#F1F5F9',
  },
  letterBadgeSelected: {
    backgroundColor: Colors.signal,
  },
  letterBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  letterBadgeTextDefault: {
    color: '#475569',
  },
  letterBadgeTextSelected: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    marginRight: 10,
  },
  optionTextDefault: {
    color: '#1E293B',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  radioIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioIndicatorDefault: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  radioIndicatorSelected: {
    backgroundColor: Colors.signal,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  prevBtnDisabled: {
    opacity: 0.45,
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  prevBtnTextDisabled: {
    color: '#94A3B8',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: Colors.signal,
    elevation: 2,
    shadowColor: Colors.signal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  nextBtnPending: {
    opacity: 0.88,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#059669',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultContainer: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  passingPill: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoreSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.signal,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
