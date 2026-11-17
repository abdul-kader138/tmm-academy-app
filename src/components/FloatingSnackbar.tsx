import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { cardShadow } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface FloatingSnackbarProps {
  toast: ToastOptions | null;
  onDismiss: () => void;
}

/**
 * Modern Pop-up Modal Dialog (Option 3 style):
 * - Clean centered modal card with soft rounded corners (20px)
 * - Translucent backdrop overlay (dark slate blur)
 * - Bold dark title & high-legibility slate description
 * - Modern styled brand blue action button
 * - Smooth spring pop-in & fade animation
 */
export const FloatingSnackbar: React.FC<FloatingSnackbarProps> = ({ toast, onDismiss }) => {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      scale.setValue(0.88);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 75,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toast]);

  const handleDismiss = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
      if (callback) {
        callback();
      }
    });
  };

  if (!toast) return null;

  const defaultTitle = {
    error: 'Notice',
    success: 'Success',
    warning: 'Warning',
    info: 'Notice',
  }[toast.type || 'info'];

  const titleText = toast.title || defaultTitle;

  return (
    <Animated.View style={[styles.backdrop, { opacity }]}>
      {/* Backdrop touch to dismiss */}
      <TouchableWithoutFeedback onPress={() => handleDismiss(toast.onCancel)}>
        <View style={styles.backdropTouchArea} />
      </TouchableWithoutFeedback>

      {/* Centered Modal Card */}
      <Animated.View
        style={[
          styles.dialogCard,
          cardShadow(4),
          {
            transform: [{ scale }],
          },
        ]}
      >
        {/* Modal Title */}
        <Text style={styles.title} numberOfLines={2}>
          {titleText}
        </Text>

        {/* Modal Message */}
        <Text style={styles.message}>
          {toast.message}
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {Boolean(toast.cancelText) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleDismiss(toast.onCancel)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{toast.cancelText}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => handleDismiss(toast.onConfirm)}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              {toast.confirmText || 'OK'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 999999,
    elevation: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdropTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 310,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 22,
    borderWidth: Platform.OS === 'android' ? 0.5 : 0,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: '#475569',
    lineHeight: 20,
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  confirmButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
