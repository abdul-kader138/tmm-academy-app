import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Keyboard,
  Platform,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cardShadow } from '../theme/colors';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface FloatingSnackbarProps {
  toast: ToastOptions | null;
  onDismiss: () => void;
}

export const FloatingSnackbar: React.FC<FloatingSnackbarProps> = ({ toast, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<any>(null);

  // Keyboard elevation handling
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Animation on toast change
  useEffect(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (toast) {
      // Animate In
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = toast.duration ?? 3200;
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      // Animate Out
      handleDismiss();
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [toast]);

  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  // Swipe down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 40 || gestureState.vy > 0.5) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!toast) return null;

  const type = toast.type || 'info';

  const config = {
    error: {
      accentColor: '#DC2626',
      badgeBg: '#FEE2E2',
      iconName: 'alert-circle' as const,
      defaultTitle: 'Notice',
    },
    success: {
      accentColor: '#059669',
      badgeBg: '#D1FAE5',
      iconName: 'checkmark-circle' as const,
      defaultTitle: 'Success',
    },
    warning: {
      accentColor: '#D97706',
      badgeBg: '#FEF3C7',
      iconName: 'warning' as const,
      defaultTitle: 'Warning',
    },
    info: {
      accentColor: '#2563EB',
      badgeBg: '#DBEAFE',
      iconName: 'information-circle' as const,
      defaultTitle: 'Notice',
    },
  }[type];

  // Dynamic bottom offset
  const bottomOffset = keyboardHeight > 0
    ? keyboardHeight + 12
    : Math.max(16, insets.bottom + 12);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.container,
          cardShadow(4),
          { borderLeftColor: config.accentColor },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.iconBadge, { backgroundColor: config.badgeBg }]}>
          <Ionicons name={config.iconName} size={22} color={config.accentColor} />
        </View>

        <View style={styles.textContainer}>
          {Boolean(toast.title) && (
            <Text style={[styles.title, { color: config.accentColor }]} numberOfLines={1}>
              {toast.title}
            </Text>
          )}
          <Text style={styles.message} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999999,
    elevation: 999999,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1E293B',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
