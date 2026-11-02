import { Platform, ViewStyle } from 'react-native';

export const Colors = {
  // Backgrounds
  background: '#0B0F19',
  backgroundCard: '#151D2F',
  backgroundElevated: '#1E293B',
  backgroundInput: '#0F172A',

  // Primary Accent & Gradients
  primary: '#6366F1',       // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4338CA',
  secondary: '#8B5CF6',     // Violet
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',

  // Text colors
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0F19',

  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderFocus: '#6366F1',

  // Accents
  badgeBg: 'rgba(99, 102, 241, 0.15)',
  badgeBorder: 'rgba(99, 102, 241, 0.35)',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  errorBg: 'rgba(244, 63, 94, 0.15)',
};

/**
 * Cross-platform Card Elevation / Shadow Helper.
 * Strictly respects iOS Human Interface Guidelines and Android Material Elevation.
 */
export const elevationStyle = (level: 1 | 2 | 3 | 4 = 2): ViewStyle => {
  if (Platform.OS === 'ios') {
    switch (level) {
      case 1:
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 3,
        };
      case 3:
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 8,
        };
      case 4:
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
        };
      case 2:
      default:
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.22,
          shadowRadius: 5,
        };
    }
  } else {
    switch (level) {
      case 1:
        return { elevation: 2 };
      case 3:
        return { elevation: 6 };
      case 4:
        return { elevation: 10 };
      case 2:
      default:
        return { elevation: 4 };
    }
  }
};
