import { Platform, ViewStyle } from 'react-native';

/**
 * TMM Academy Official Design System (Precise Ledger)
 * Direct match from https://academy.tmminnovation.com
 */
export const Colors = {
  // Official Precise Ledger Tokens
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  card: '#FFFFFF',

  // Primary & Signals
  signal: '#0E7490',           // Signature Deep Cyan / Teal
  signalHover: '#155E75',
  signalTint: '#ECFEFF',
  signalTintBorder: '#A5F3FC',

  // Backward-compatible color aliases
  primary: '#0E7490',
  primaryLight: '#0284C7',
  primaryDark: '#155E75',
  secondary: '#0891B2',
  cyan: '#06B6D4',
  background: '#F8FAFC',
  backgroundCard: '#FFFFFF',
  backgroundElevated: '#F1F5F9',
  backgroundInput: '#FFFFFF',

  // Text colors
  textMain: '#0F172A',         // Rich Dark Slate
  textPrimary: '#0F172A',
  textSecondary: '#475569',    // Slate 600
  textMuted: '#64748B',        // Slate 500
  textInverse: '#FFFFFF',

  // Accents & Signals
  emerald: '#059669',
  amber: '#D97706',
  rose: '#E11D48',
  star: '#F59E0B',
  badgeBg: '#ECFEFF',
  badgeBorder: '#A5F3FC',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderSubtle: '#E2E8F0',
  borderHover: '#CBD5E1',
  borderActive: '#0E7490',
};

/**
 * Universal Card Shadow / Elevation Helper.
 */
export const cardShadow = (level: 1 | 2 | 3 | 4 = 1): ViewStyle => {
  if (Platform.OS === 'ios') {
    switch (level) {
      case 2:
        return {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        };
      case 3:
      case 4:
        return {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
        };
      case 1:
      default:
        return {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
        };
    }
  } else {
    switch (level) {
      case 2:
        return { elevation: 3 };
      case 3:
      case 4:
        return { elevation: 6 };
      case 1:
      default:
        return { elevation: 1.5 };
    }
  }
};

export const elevationStyle = cardShadow;
