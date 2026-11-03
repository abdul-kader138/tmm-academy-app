import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  parsePhoneNumberFromString,
  CountryCode,
  getCountryCallingCode,
} from 'libphonenumber-js';
import { Colors } from '../theme/colors';

export interface PhoneValue {
  fullNumber: string; // E.164 format e.g. +393456789012 or +8801614280290
  countryCode: CountryCode;
  callingCode: string; // e.g. +39 or +880
  nationalNumber: string; // e.g. 3456789012
  formatted: string; // e.g. +39 345 678 9012
  isValid: boolean;
}

interface PhoneInputFieldProps {
  value?: string;
  onChangePhone: (phone: PhoneValue) => void;
  defaultCountry?: CountryCode;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export interface CountryMeta {
  code: CountryCode;
  name: string;
  callingCode: string;
  callingDigits: string;
  flag: string;
}

const COUNTRY_MAX_DIGITS: Record<string, number> = {
  IT: 11,
  BD: 10,
  GB: 10,
  US: 10,
  CA: 10,
  AE: 9,
  SA: 9,
  QA: 8,
  IN: 10,
  PK: 10,
  FR: 9,
  DE: 11,
  ES: 9,
  MY: 10,
  SG: 8,
  TR: 10,
  AU: 9,
  CH: 9,
  NL: 9,
  SE: 9,
};

export const COUNTRIES_LIST: CountryMeta[] = [
  { code: 'IT', name: 'Italy', callingCode: '+39', callingDigits: '39', flag: '🇮🇹' },
  { code: 'BD', name: 'Bangladesh', callingCode: '+880', callingDigits: '880', flag: '🇧🇩' },
  { code: 'GB', name: 'United Kingdom', callingCode: '+44', callingDigits: '44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', callingCode: '+1', callingDigits: '1', flag: '🇺🇸' },
  { code: 'DE', name: 'Germany', callingCode: '+49', callingDigits: '49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', callingCode: '+33', callingDigits: '33', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', callingCode: '+34', callingDigits: '34', flag: '🇪🇸' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '+971', callingDigits: '971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '+966', callingDigits: '966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', callingCode: '+974', callingDigits: '974', flag: '🇶🇦' },
  { code: 'IN', name: 'India', callingCode: '+91', callingDigits: '91', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', callingCode: '+92', callingDigits: '92', flag: '🇵🇰' },
  { code: 'CA', name: 'Canada', callingCode: '+1', callingDigits: '1', flag: '🇨🇦' },
  { code: 'CH', name: 'Switzerland', callingCode: '+41', callingDigits: '41', flag: '🇨🇭' },
  { code: 'NL', name: 'Netherlands', callingCode: '+31', callingDigits: '31', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', callingCode: '+46', callingDigits: '46', flag: '🇸🇪' },
  { code: 'AU', name: 'Australia', callingCode: '+61', callingDigits: '61', flag: '🇦🇺' },
  { code: 'MY', name: 'Malaysia', callingCode: '+60', callingDigits: '60', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', callingCode: '+65', callingDigits: '65', flag: '🇸🇬' },
  { code: 'TR', name: 'Turkey', callingCode: '+90', callingDigits: '90', flag: '🇹🇷' },
];

export function sanitizeNationalDigits(input: string, countryCode: string, callingDigits: string): string {
  if (!input) return '';
  let digits = input.replace(/\D/g, '');
  // Strip calling code if user entered it (e.g. 39 or 880)
  if (callingDigits && digits.startsWith(callingDigits)) {
    digits = digits.slice(callingDigits.length);
  }
  // Strip leading national trunk 0s
  digits = digits.replace(/^0+/, '');
  // Strict clamp to country max digits
  const max = COUNTRY_MAX_DIGITS[countryCode] || 11;
  return digits.slice(0, max);
}

export function formatNationalForDisplay(digits: string, countryCode: string): string {
  if (!digits) return '';
  if (countryCode === 'BD') {
    // 1XXX XXX XXX
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (countryCode === 'IT') {
    // 3XX XXX XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function detectCountryFromPhone(phoneStr: string): CountryMeta | null {
  if (!phoneStr) return null;
  const cleaned = phoneStr.trim();
  // Check against countries sorted by longest callingDigits first
  const sorted = [...COUNTRIES_LIST].sort((a, b) => b.callingDigits.length - a.callingDigits.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.callingCode) || cleaned.startsWith(`+${c.callingDigits}`)) {
      return c;
    }
  }
  return null;
}

export const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  value = '',
  onChangePhone,
  defaultCountry = 'IT',
  label = 'Phone number',
  placeholder = '345 678 9012',
  required = false,
  error,
  disabled = false,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    if (value) {
      const detected = detectCountryFromPhone(value);
      if (detected) return detected.code;
    }
    return defaultCountry;
  });

  const [rawNational, setRawNational] = useState('');
  const [formattedDisplay, setFormattedDisplay] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTouched, setIsTouched] = useState(false);
  const isInternalChange = useRef(false);

  const currentCountry = useMemo(() => {
    const found = COUNTRIES_LIST.find((c) => c.code === selectedCountry);
    if (found) return found;
    try {
      const code = getCountryCallingCode(selectedCountry);
      return {
        code: selectedCountry,
        name: selectedCountry,
        callingCode: `+${code}`,
        callingDigits: String(code),
        flag: '🌐',
      };
    } catch {
      return {
        code: selectedCountry,
        name: selectedCountry,
        callingCode: '+39',
        callingDigits: '39',
        flag: '🇮🇹',
      };
    }
  }, [selectedCountry]);

  // Synchronize when value changes externally
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (!value) {
      setRawNational('');
      setFormattedDisplay('');
      return;
    }

    const detected = detectCountryFromPhone(value);
    const countryToUse = detected ? detected.code : selectedCountry;
    if (detected && detected.code !== selectedCountry) {
      setSelectedCountry(detected.code);
    }

    const callingDigits = detected ? detected.callingDigits : currentCountry.callingDigits;
    const clean = sanitizeNationalDigits(value, countryToUse, callingDigits);
    setRawNational(clean);
    setFormattedDisplay(formatNationalForDisplay(clean, countryToUse));
  }, [value]);

  const validatePhone = (digits: string, country: CountryMeta): { isValid: boolean; fullNumber: string } => {
    if (!digits) {
      return { isValid: false, fullNumber: '' };
    }

    const fullNumber = `${country.callingCode}${digits}`;
    let isValid = false;
    let finalE164 = fullNumber;

    try {
      const parsed = parsePhoneNumberFromString(fullNumber, country.code);
      if (parsed) {
        isValid = parsed.isValid();
        if (parsed.number) finalE164 = parsed.number;
      }
    } catch {}

    // Dedicated high-confidence checks for primary operating countries
    if (country.code === 'BD') {
      isValid = digits.length === 10 && digits.startsWith('1');
    } else if (country.code === 'IT') {
      isValid = (digits.length === 9 || digits.length === 10) && digits.startsWith('3');
    }

    return { isValid, fullNumber: finalE164 };
  };

  const handleTextChange = (text: string) => {
    setIsTouched(true);
    isInternalChange.current = true;

    const cleanDigits = sanitizeNationalDigits(text, selectedCountry, currentCountry.callingDigits);
    setRawNational(cleanDigits);

    if (!cleanDigits) {
      setFormattedDisplay('');
      onChangePhone({
        fullNumber: '',
        countryCode: selectedCountry,
        callingCode: currentCountry.callingCode,
        nationalNumber: '',
        formatted: '',
        isValid: false,
      });
      return;
    }

    const formatted = formatNationalForDisplay(cleanDigits, selectedCountry);
    setFormattedDisplay(formatted);

    const { isValid, fullNumber } = validatePhone(cleanDigits, currentCountry);

    onChangePhone({
      fullNumber,
      countryCode: selectedCountry,
      callingCode: currentCountry.callingCode,
      nationalNumber: cleanDigits,
      formatted: `${currentCountry.callingCode} ${formatted}`,
      isValid,
    });
  };

  const handleSelectCountry = (country: CountryMeta) => {
    setIsTouched(true);
    isInternalChange.current = true;
    setSelectedCountry(country.code);
    setCountryPickerOpen(false);

    if (rawNational) {
      const clean = sanitizeNationalDigits(rawNational, country.code, country.callingDigits);
      setRawNational(clean);
      const formatted = formatNationalForDisplay(clean, country.code);
      setFormattedDisplay(formatted);

      const { isValid, fullNumber } = validatePhone(clean, country);

      onChangePhone({
        fullNumber,
        countryCode: country.code,
        callingCode: country.callingCode,
        nationalNumber: clean,
        formatted: `${country.callingCode} ${formatted}`,
        isValid,
      });
    }
  };

  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRIES_LIST;
    return COUNTRIES_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.callingCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const validationResult = useMemo(() => {
    if (!rawNational) return null;
    return validatePhone(rawNational, currentCountry);
  }, [rawNational, currentCountry]);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label} {required && <Text style={styles.requiredAsterisk}>*</Text>}
          </Text>
          {validationResult && (
            <View style={styles.statusIndicator}>
              <Ionicons
                name={validationResult.isValid ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={validationResult.isValid ? Colors.emerald : Colors.rose}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: validationResult.isValid ? Colors.emerald : Colors.rose },
                ]}
              >
                {validationResult.isValid ? 'Valid format' : 'Invalid number for ' + currentCountry.name}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Main Input Row */}
      <View
        style={[
          styles.inputRow,
          !!error && styles.inputRowError,
          isTouched && validationResult && !validationResult.isValid && styles.inputRowError,
        ]}
      >
        {/* Country Code Picker Button */}
        <TouchableOpacity
          style={styles.countryPickerBtn}
          onPress={() => setCountryPickerOpen(!countryPickerOpen)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.countryFlag}>{currentCountry.flag}</Text>
          <Text style={styles.callingCodeText}>{currentCountry.callingCode}</Text>
          <Ionicons
            name={countryPickerOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.textMuted}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* National Number Input Field */}
        <TextInput
          style={styles.textInput}
          value={formattedDisplay}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          editable={!disabled}
          autoCorrect={false}
          maxLength={
            COUNTRY_MAX_DIGITS[selectedCountry]
              ? COUNTRY_MAX_DIGITS[selectedCountry] + 4
              : 15
          }
        />

        {rawNational.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => handleTextChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Expandable Country Selector Dropdown */}
      {countryPickerOpen && (
        <View style={styles.dropdownCard}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color={Colors.signal} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code (+39, +880)..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{ maxHeight: 220 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filteredCountries.map((item) => {
              const isSelected = item.code === selectedCountry;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.countryItem, isSelected && styles.countryItemActive]}
                  onPress={() => handleSelectCountry(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.itemFlag}>{item.flag}</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCode}>{item.callingCode}</Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={Colors.signal}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMain,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredAsterisk: {
    color: Colors.rose,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 48,
    paddingHorizontal: 12,
  },
  inputRowError: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  countryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 6,
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 6,
  },
  callingCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: 8,
  },
  textInput: {
    flex: 1,
    color: Colors.textMain,
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 6,
  },
  errorText: {
    fontSize: 11,
    color: Colors.rose,
    marginTop: 4,
    marginLeft: 2,
  },

  /* Dropdown Country List */
  dropdownCard: {
    marginTop: 6,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: Colors.textMain,
    fontSize: 13,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  countryItemActive: {
    backgroundColor: '#ECFEFF',
    borderRadius: 6,
  },
  itemFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMain,
  },
  itemCode: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.signal,
  },
});
