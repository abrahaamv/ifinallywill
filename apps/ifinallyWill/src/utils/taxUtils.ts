/**
 * Canadian tax calculations for iFinallyWill
 * Province-specific HST/GST/PST rates
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaxBreakdown {
  subtotal: number;
  gst: number;
  pst: number;
  hst: number;
  total: number;
  taxLabel: string;
  taxRate: number;
}

export interface DetailedTaxBreakdown extends TaxBreakdown {
  province: string;
  taxType: string;
  displayName: string;
  notes: string;
  formattedSubtotal: string;
  formattedTax: string;
  formattedTotal: string;
}

interface ProvinceTaxRate {
  type: 'hst' | 'gst+pst' | 'gst';
  hst?: number;
  gst?: number;
  pst?: number;
  displayName: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Tax rate data (percentages, not decimals)
// ---------------------------------------------------------------------------

const PROVINCE_TAX_RATES: Record<string, ProvinceTaxRate> = {
  Ontario: { type: 'hst', hst: 13, displayName: 'HST', notes: 'Harmonized Sales Tax' },
  'New Brunswick': {
    type: 'hst',
    hst: 15,
    displayName: 'HST',
    notes: 'HST increased to 15% as of July 1, 2016',
  },
  'Newfoundland and Labrador': {
    type: 'hst',
    hst: 15,
    displayName: 'HST',
    notes: 'HST increased to 15% as of July 1, 2016',
  },
  'Nova Scotia': {
    type: 'hst',
    hst: 14,
    displayName: 'HST',
    notes: 'HST reduced from 15% to 14% as of April 1, 2025',
  },
  'Prince Edward Island': {
    type: 'hst',
    hst: 15,
    displayName: 'HST',
    notes: 'Harmonized Sales Tax',
  },
  'British Columbia': {
    type: 'gst+pst',
    gst: 5,
    pst: 7,
    displayName: 'GST + PST',
    notes: 'Separate GST and PST',
  },
  Manitoba: {
    type: 'gst+pst',
    gst: 5,
    pst: 7,
    displayName: 'GST + PST',
    notes: 'PST reduced from 8% to 7% as of July 1, 2019',
  },
  Saskatchewan: {
    type: 'gst+pst',
    gst: 5,
    pst: 6,
    displayName: 'GST + PST',
    notes: 'Separate GST and PST',
  },
  Quebec: {
    type: 'gst+pst',
    gst: 5,
    pst: 9.975,
    displayName: 'GST + QST',
    notes: 'GST + Quebec Sales Tax (QST)',
  },
  Alberta: { type: 'gst', gst: 5, displayName: 'GST', notes: 'GST only province' },
  'Northwest Territories': { type: 'gst', gst: 5, displayName: 'GST', notes: 'GST only territory' },
  Nunavut: { type: 'gst', gst: 5, displayName: 'GST', notes: 'GST only territory' },
  Yukon: { type: 'gst', gst: 5, displayName: 'GST', notes: 'GST only territory' },
};

/** Default tax rate when province is unknown (Ontario HST). */
const DEFAULT_TAX_RATE: ProvinceTaxRate = {
  type: 'gst',
  gst: 5,
  displayName: 'GST',
  notes: 'Default GST rate for unknown province',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveRates(province: string): ProvinceTaxRate {
  if (PROVINCE_TAX_RATES[province]) {
    return PROVINCE_TAX_RATES[province];
  }

  // Case-insensitive fallback
  const key = Object.keys(PROVINCE_TAX_RATES).find(
    (k) => k.toLowerCase() === province.toLowerCase()
  );

  return (key ? PROVINCE_TAX_RATES[key] : undefined) ?? DEFAULT_TAX_RATE;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a full tax breakdown for a given subtotal and province.
 */
export function getTaxBreakdown(subtotal: number, province: string): TaxBreakdown {
  const rates = resolveRates(province);

  if (rates.type === 'hst') {
    const hst = round2(subtotal * (rates.hst! / 100));
    return {
      subtotal,
      gst: 0,
      pst: 0,
      hst,
      total: round2(subtotal + hst),
      taxLabel: `HST (${rates.hst}%)`,
      taxRate: rates.hst!,
    };
  }

  if (rates.type === 'gst+pst') {
    const gst = round2(subtotal * (rates.gst! / 100));
    const pst = round2(subtotal * (rates.pst! / 100));
    return {
      subtotal,
      gst,
      pst,
      hst: 0,
      total: round2(subtotal + gst + pst),
      taxLabel: `GST (${rates.gst}%) + PST (${rates.pst}%)`,
      taxRate: rates.gst! + rates.pst!,
    };
  }

  // GST only
  const gst = round2(subtotal * (rates.gst! / 100));
  return {
    subtotal,
    gst,
    pst: 0,
    hst: 0,
    total: round2(subtotal + gst),
    taxLabel: `GST (${rates.gst}%)`,
    taxRate: rates.gst!,
  };
}

/**
 * Compute a detailed tax breakdown including formatted strings and metadata.
 */
export function getDetailedTaxBreakdown(subtotal: number, province: string): DetailedTaxBreakdown {
  const basic = getTaxBreakdown(subtotal, province);
  const rates = resolveRates(province);

  return {
    ...basic,
    province,
    taxType: rates.type,
    displayName: rates.displayName,
    notes: rates.notes,
    formattedSubtotal: formatPrice(basic.subtotal),
    formattedTax: formatPrice(round2(basic.gst + basic.pst + basic.hst)),
    formattedTotal: formatPrice(basic.total),
  };
}

/**
 * Get a human-readable tax label for a province, e.g. "HST (13%)".
 */
export function getTaxLabel(province: string): string {
  const rates = resolveRates(province);
  let totalPercent: number;

  if (rates.type === 'hst') totalPercent = rates.hst!;
  else if (rates.type === 'gst+pst') totalPercent = rates.gst! + rates.pst!;
  else totalPercent = rates.gst!;

  return `${rates.displayName} (${totalPercent}%)`;
}

/**
 * List of all supported Canadian provinces and territories.
 */
export function getAvailableProvinces(): string[] {
  return Object.keys(PROVINCE_TAX_RATES).sort();
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a dollar amount for display (e.g. "$199.00").
 */
export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format a value in cents as dollars (e.g. 19900 => "$199.00").
 */
export function formatPriceFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format using Intl.NumberFormat for full locale-aware CAD display.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
