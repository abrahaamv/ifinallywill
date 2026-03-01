/**
 * Common formatting utilities for the iFinallyWill application
 */

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * Format a numeric amount as a currency string.
 *
 * @param amount  - The numeric value to format.
 * @param currency - ISO 4217 currency code (default: "CAD").
 * @returns Locale-formatted currency string, e.g. "$1,234.56".
 */
export function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

type DateFormat = 'short' | 'medium' | 'long' | 'iso';

/**
 * Format a date value for display.
 *
 * @param date   - A Date object or ISO string.
 * @param format - Predefined format name (default: "medium").
 *   - "short"  => "01/15/2026"
 *   - "medium" => "Jan 15, 2026"
 *   - "long"   => "January 15, 2026"
 *   - "iso"    => "2026-01-15"
 * @returns Formatted date string, or empty string if the input is invalid.
 */
export function formatDate(date: Date | string, format: DateFormat = 'medium'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

    case 'medium':
      return d.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

    case 'long':
      return d.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    case 'iso':
      return d.toISOString().slice(0, 10);

    default:
      return d.toLocaleDateString('en-CA');
  }
}

// ---------------------------------------------------------------------------
// Address
// ---------------------------------------------------------------------------

interface AddressParts {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Combine address parts into a single formatted string.
 * Empty/undefined parts are omitted gracefully.
 *
 * @example
 * formatAddress({ street: '123 Main St', city: 'Toronto', province: 'ON', postalCode: 'M5V 1A1' })
 * // => "123 Main St, Toronto, ON M5V 1A1"
 */
export function formatAddress(parts: AddressParts): string {
  const { street, city, province, postalCode, country } = parts;

  const line1 = street ?? '';

  // City and province on the same segment, postal code attached to province
  const cityProvince = [city, province].filter(Boolean).join(', ');
  const line2 = [cityProvince, postalCode].filter(Boolean).join(' ');

  const segments = [line1, line2, country].filter((s) => s && s.trim() !== '');

  return segments.join(', ');
}

// ---------------------------------------------------------------------------
// Phone number
// ---------------------------------------------------------------------------

/**
 * Format a phone number string into a standard North American format.
 * Strips all non-digit characters first, then formats as:
 *   - 10 digits => "(416) 555-1234"
 *   - 11 digits (leading 1) => "+1 (416) 555-1234"
 *   - Otherwise returns the cleaned digits as-is.
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return as-is if it doesn't match expected lengths
  return phone;
}

// ---------------------------------------------------------------------------
// String casing
// ---------------------------------------------------------------------------

/**
 * Capitalize the first character of a string.
 *
 * @example capitalize("hello world") // => "Hello world"
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to Title Case (first letter of each word capitalized).
 *
 * @example toTitleCase("power of attorney") // => "Power Of Attorney"
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}
