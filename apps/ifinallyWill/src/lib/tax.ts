/**
 * Canadian provincial tax calculation
 * Ported from: Willsystem-v6/resources/js/config/canadianTaxRates.js + utils/taxUtils.js
 */

export interface TaxRateInfo {
  province: string;
  type: 'GST' | 'HST' | 'GST+PST' | 'GST+QST';
  gst: number;
  pst: number;
  hst: number;
  totalRate: number;
  displayName: string;
  notes: string;
}

export interface TaxBreakdown {
  province: string;
  type: string;
  displayName: string;
  basePrice: number;
  gstAmount: number;
  pstAmount: number;
  hstAmount: number;
  totalTax: number;
  totalPrice: number;
  totalRate: number;
  taxLabel: string;
  notes: string;
  formatted: {
    basePrice: string;
    taxAmount: string;
    totalPrice: string;
  };
}

const CANADIAN_TAX_RATES: Record<string, TaxRateInfo> = {
  Alberta: {
    province: 'Alberta',
    type: 'GST',
    gst: 0.05,
    pst: 0,
    hst: 0,
    totalRate: 0.05,
    displayName: 'GST',
    notes: 'GST only province',
  },
  'British Columbia': {
    province: 'British Columbia',
    type: 'GST+PST',
    gst: 0.05,
    pst: 0.07,
    hst: 0,
    totalRate: 0.12,
    displayName: 'GST + PST',
    notes: 'Separate GST and PST',
  },
  Manitoba: {
    province: 'Manitoba',
    type: 'GST+PST',
    gst: 0.05,
    pst: 0.07,
    hst: 0,
    totalRate: 0.12,
    displayName: 'GST + PST',
    notes: 'As of July 1, 2019 the PST rate was reduced from 8% to 7%',
  },
  'New Brunswick': {
    province: 'New Brunswick',
    type: 'HST',
    gst: 0,
    pst: 0,
    hst: 0.15,
    totalRate: 0.15,
    displayName: 'HST',
    notes: 'As of July 1, 2016 the HST rate increased from 13% to 15%',
  },
  'Newfoundland and Labrador': {
    province: 'Newfoundland and Labrador',
    type: 'HST',
    gst: 0,
    pst: 0,
    hst: 0.15,
    totalRate: 0.15,
    displayName: 'HST',
    notes: 'As of July 1, 2016 the HST rate increased from 13% to 15%',
  },
  'Northwest Territories': {
    province: 'Northwest Territories',
    type: 'GST',
    gst: 0.05,
    pst: 0,
    hst: 0,
    totalRate: 0.05,
    displayName: 'GST',
    notes: 'GST only territory',
  },
  'Nova Scotia': {
    province: 'Nova Scotia',
    type: 'HST',
    gst: 0,
    pst: 0,
    hst: 0.14,
    totalRate: 0.14,
    displayName: 'HST',
    notes: 'As of April 1, 2025, the HST was reduced from 15% to 14%',
  },
  Nunavut: {
    province: 'Nunavut',
    type: 'GST',
    gst: 0.05,
    pst: 0,
    hst: 0,
    totalRate: 0.05,
    displayName: 'GST',
    notes: 'GST only territory',
  },
  Ontario: {
    province: 'Ontario',
    type: 'HST',
    gst: 0,
    pst: 0,
    hst: 0.13,
    totalRate: 0.13,
    displayName: 'HST',
    notes: 'Harmonized Sales Tax',
  },
  'Prince Edward Island': {
    province: 'Prince Edward Island',
    type: 'HST',
    gst: 0,
    pst: 0,
    hst: 0.15,
    totalRate: 0.15,
    displayName: 'HST',
    notes: 'Harmonized Sales Tax',
  },
  Quebec: {
    province: 'Quebec',
    type: 'GST+QST',
    gst: 0.05,
    pst: 0.09975,
    hst: 0,
    totalRate: 0.14975,
    displayName: 'GST + QST',
    notes: 'GST + Quebec Sales Tax (QST)',
  },
  Saskatchewan: {
    province: 'Saskatchewan',
    type: 'GST+PST',
    gst: 0.05,
    pst: 0.06,
    hst: 0,
    totalRate: 0.11,
    displayName: 'GST + PST',
    notes: 'Separate GST and PST',
  },
  Yukon: {
    province: 'Yukon',
    type: 'GST',
    gst: 0.05,
    pst: 0,
    hst: 0,
    totalRate: 0.05,
    displayName: 'GST',
    notes: 'GST only territory',
  },
};

const DEFAULT_TAX_RATE: TaxRateInfo = {
  province: 'Default',
  type: 'HST',
  gst: 0,
  pst: 0,
  hst: 0.13,
  totalRate: 0.13,
  displayName: 'HST',
  notes: 'Default tax rate (Ontario HST)',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function getTaxRateForProvince(province: string): TaxRateInfo {
  if (!province) return DEFAULT_TAX_RATE;
  if (CANADIAN_TAX_RATES[province]) return CANADIAN_TAX_RATES[province];
  const key = Object.keys(CANADIAN_TAX_RATES).find(
    (k) => k.toLowerCase() === province.toLowerCase()
  );
  return (key ? CANADIAN_TAX_RATES[key] : undefined) ?? DEFAULT_TAX_RATE;
}

export function getTaxLabel(province: string): string {
  const info = getTaxRateForProvince(province);
  return `${info.displayName} (${Math.round(info.totalRate * 100)}%)`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price || 0);
}

export function calculateTax(basePrice: number, province = 'Ontario'): number {
  if (!basePrice || isNaN(basePrice)) return 0;
  const info = getTaxRateForProvince(province);
  return round2(basePrice * info.totalRate);
}

export function calculateTotal(basePrice: number, province = 'Ontario'): number {
  if (!basePrice || isNaN(basePrice)) return 0;
  return round2(basePrice + calculateTax(basePrice, province));
}

export function getTaxBreakdown(basePrice: number, province = 'Ontario'): TaxBreakdown {
  const price = Number.parseFloat(String(basePrice)) || 0;
  const info = getTaxRateForProvince(province);

  const gstAmount = round2(price * info.gst);
  const pstAmount = round2(price * info.pst);
  const hstAmount = round2(price * info.hst);
  const totalTax = round2(price * info.totalRate);
  const totalPrice = round2(price + totalTax);

  return {
    province: info.province,
    type: info.type,
    displayName: info.displayName,
    basePrice: price,
    gstAmount,
    pstAmount,
    hstAmount,
    totalTax,
    totalPrice,
    totalRate: info.totalRate,
    taxLabel: getTaxLabel(province),
    notes: info.notes,
    formatted: {
      basePrice: formatPrice(price),
      taxAmount: formatPrice(totalTax),
      totalPrice: formatPrice(totalPrice),
    },
  };
}

/** Provinces that support secondary wills */
export const SECONDARY_WILL_PROVINCES = ['Ontario', 'British Columbia'] as const;

export function supportsSecondaryWill(province: string): boolean {
  return SECONDARY_WILL_PROVINCES.some((p) => p.toLowerCase() === province.toLowerCase());
}
