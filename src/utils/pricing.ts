import { CourseCatalogItem } from '../api/types';

export interface CoursePricingInfo {
  isFree: boolean;
  hasDiscount: boolean;
  displayPrice: string;
  originalPrice?: string;
  discountPercent?: number;
  discountBadgeText?: string;
  currencySymbol: string;
}

export function formatEuros(cents: number, symbol: string = '€'): string {
  const amount = cents / 100;
  if (amount % 1 === 0) {
    return `${symbol}${amount.toLocaleString('en-US')}`;
  }
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCoursePricing(item?: CourseCatalogItem | null): CoursePricingInfo {
  const defaultFree: CoursePricingInfo = {
    isFree: true,
    hasDiscount: false,
    displayPrice: 'FREE',
    currencySymbol: '€',
  };

  if (!item) return defaultFree;

  const symbol =
    item.currency === 'USD'
      ? '$'
      : item.currency === 'GBP'
      ? '£'
      : item.currency === 'BDT'
      ? '৳'
      : '€';

  if (item.is_free === true) {
    return {
      isFree: true,
      hasDiscount: false,
      displayPrice: 'FREE',
      currencySymbol: symbol,
    };
  }

  // Check cents-based pricing from modern LMS API
  const regularCents =
    typeof item.price_cents === 'number'
      ? item.price_cents
      : typeof item.price === 'number'
      ? item.price * 100
      : null;

  const discountCents =
    typeof item.discount_price_cents === 'number' && item.discount_price_cents > 0
      ? item.discount_price_cents
      : null;

  const displayCents =
    typeof item.display_price_cents === 'number' && item.display_price_cents > 0
      ? item.display_price_cents
      : discountCents || regularCents;

  if (displayCents === null || displayCents === 0) {
    return {
      isFree: true,
      hasDiscount: false,
      displayPrice: 'FREE',
      currencySymbol: symbol,
    };
  }

  const hasDiscount = Boolean(
    item.has_discount ||
      (regularCents !== null && discountCents !== null && regularCents > discountCents) ||
      (regularCents !== null && displayCents !== null && regularCents > displayCents)
  );

  if (hasDiscount && regularCents && regularCents > displayCents) {
    const percent = Math.max(1, Math.round(((regularCents - displayCents) / regularCents) * 100));
    return {
      isFree: false,
      hasDiscount: true,
      displayPrice: formatEuros(displayCents, symbol),
      originalPrice: formatEuros(regularCents, symbol),
      discountPercent: percent,
      discountBadgeText: `${percent}% OFF`,
      currencySymbol: symbol,
    };
  }

  return {
    isFree: false,
    hasDiscount: false,
    displayPrice: formatEuros(displayCents, symbol),
    currencySymbol: symbol,
  };
}
