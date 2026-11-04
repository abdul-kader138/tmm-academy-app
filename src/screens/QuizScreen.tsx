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
      Alert.alert('Submit Answers', 'Are you ready to submit your test for scoring?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => void executeSubmit() },
      ]);
    }
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      // Map zero-based question index to option index
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

      {/* Top Navbar */}
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
          <Ionicons name="arrow-back" size={22} color={Colors.textMain} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerCourseTitle} numberOfLines={1}>
            {courseTitle || 'Course Checkpoint'}
          </Text>
          <Text style={styles.headerActivityTitle} numberOfLines={1}>
            {activity?.title || initialTitle || 'Quiz / Exam'}
          </Text>
        </View>

        <View style={{ width: 40 }} />
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
                { backgroundColor: result.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' },
              ]}
            >
              <Ionicons
                name={result.passed ? 'trophy' : 'alert-circle'}
                size={48}
                color={result.passed ? Colors.emerald : '#EF4444'}
              />
            </View>

            <Text style={styles.resultTitle}>
              {result.passed ? 'Congratulations!' : 'Keep Practicing!'}
            </Text>

            <Text style={styles.resultMessage}>
              {result.message ||
                (result.passed
                  ? 'You have successfully satisfied this checkpoint requirement.'
                  : 'You did not achieve the required passing score on this attempt.')}
            </Text>

            {typeof result.score === 'number' && (
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>Final Score</Text>
                <Text style={styles.scoreValue}>{result.score}%</Text>
                {activity?.passing_score ? (
                  <Text style={styles.scoreSub}>
                    Required Passing Score: {activity.passing_score}%
                  </Text>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.returnBtnText}>Back to Course</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : totalQuestions === 0 ? (
        /* No questions / Project deliverable notice */
        <View style={styles.centerBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="document-text-outline" size={44} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Checkpoint Details</Text>
          <Text style={styles.emptyDesc}>
            {activity?.description ||
              'This checkpoint is managed by course instructors. No automated multiple-choice questions are required at this time.'}
          </Text>
          {activity?.passing_score ? (
            <Text style={styles.infoPill}>Passing threshold: {activity.passing_score}%</Text>
          ) : null}
        </View>
      ) : (
        /* Questions Stepper */
        <View style={styles.stepperContainer}>
          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${((currentIndex + 1) / totalQuestions) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {totalQuestions}
            </Text>
          </View>

          <ScrollView
            style={styles.questionScrollView}
            contentContainerStyle={styles.questionContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Question Text */}
            <View style={[styles.questionCard, cardShadow(1)]}>
              <Text style={styles.questionNumberText}>Question {currentIndex + 1}</Text>
              <Text style={styles.questionPrompt}>{currentQuestion.question}</Text>
            </View>

            {/* Options List */}
            <View style={styles.optionsList}>
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                return (
                  <TouchableOpacity
                    key={optIdx}
                    style={[
                      styles.optionCard,
                      cardShadow(1),
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => handleSelectOption(optIdx)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.optionLetterBadge,
                        isSelected && styles.optionLetterBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLetterText,
                          isSelected && styles.optionLetterTextSelected,
                        ]}
                      >
                        {letter}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.optionTitle,
                        isSelected && styles.optionTitleSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Stepper Footer */}
          <View
            style={[
              styles.footer,
              cardShadow(3),
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 },
            ]}
          >
            <TouchableOpacity
              style={[styles.stepNavBtn, currentIndex === 0 && { opacity: 0.4 }]}
              onPress={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.textMain} />
              <Text style={styles.stepNavBtnText}>Previous</Text>
            </TouchableOpacity>

            {currentIndex < totalQuestions - 1 ? (
              <TouchableOpacity
                style={styles.stepNextBtn}
                onPress={() => setCurrentIndex((p) => Math.min(totalQuestions - 1, p + 1))}
                activeOpacity={0.85}
              >
                <Text style={styles.stepNextBtnText}>Next Question</Text>
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
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
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
    backgroundColor: Colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerCourseTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  headerActivityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
    marginTop: 2,
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
    color: Colors.textMuted,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoPill: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepperContainer: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.signal,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  questionScrollView: {
    flex: 1,
  },
  questionContent: {
    padding: 20,
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.signal,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  questionPrompt: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textMain,
    lineHeight: 26,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
  },
  optionCardSelected: {
    borderColor: Colors.signal,
    backgroundColor: 'rgba(2, 132, 199, 0.04)',
  },
  optionLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionLetterBadgeSelected: {
    backgroundColor: Colors.signal,
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },
  optionLetterTextSelected: {
    color: '#FFFFFF',
  },
  optionTitle: {
    flex: 1,
    fontSize: 15,
    color: Colors.textMain,
    fontWeight: '500',
    lineHeight: 22,
  },
  optionTitleSelected: {
    color: Colors.signal,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  stepNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  stepNavBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMain,
  },
  stepNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Colors.signal,
  },
  stepNextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Colors.emerald,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultContainer: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  resultIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 14,
    width: '100%',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.signal,
    marginTop: 4,
  },
  scoreSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
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
