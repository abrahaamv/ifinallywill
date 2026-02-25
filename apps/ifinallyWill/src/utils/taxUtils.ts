/**
 * Canadian tax calculations for IFinallyWill
 * Province-specific HST/GST/PST rates
 */

interface TaxBreakdown {
  subtotal: number;
  gst: number;
  pst: number;
  hst: number;
  total: number;
  taxLabel: string;
  taxRate: number;
}

const PROVINCE_TAX_RATES: Record<string, { type: 'hst' | 'gst+pst' | 'gst'; hst?: number; gst?: number; pst?: number }> = {
  'Ontario': { type: 'hst', hst: 13 },
  'New Brunswick': { type: 'hst', hst: 15 },
  'Newfoundland and Labrador': { type: 'hst', hst: 15 },
  'Nova Scotia': { type: 'hst', hst: 15 },
  'Prince Edward Island': { type: 'hst', hst: 15 },
  'British Columbia': { type: 'gst+pst', gst: 5, pst: 7 },
  'Manitoba': { type: 'gst+pst', gst: 5, pst: 7 },
  'Saskatchewan': { type: 'gst+pst', gst: 5, pst: 6 },
  'Quebec': { type: 'gst+pst', gst: 5, pst: 9.975 },
  'Alberta': { type: 'gst', gst: 5 },
  'Northwest Territories': { type: 'gst', gst: 5 },
  'Nunavut': { type: 'gst', gst: 5 },
  'Yukon': { type: 'gst', gst: 5 },
};

export function getTaxBreakdown(subtotal: number, province: string): TaxBreakdown {
  const rates = PROVINCE_TAX_RATES[province];

  if (!rates) {
    // Default to GST only if province not found
    const gst = subtotal * 0.05;
    return {
      subtotal,
      gst,
      pst: 0,
      hst: 0,
      total: subtotal + gst,
      taxLabel: 'GST (5%)',
      taxRate: 5,
    };
  }

  if (rates.type === 'hst') {
    const hst = subtotal * (rates.hst! / 100);
    return {
      subtotal,
      gst: 0,
      pst: 0,
      hst,
      total: subtotal + hst,
      taxLabel: `HST (${rates.hst}%)`,
      taxRate: rates.hst!,
    };
  }

  if (rates.type === 'gst+pst') {
    const gst = subtotal * (rates.gst! / 100);
    const pst = subtotal * (rates.pst! / 100);
    return {
      subtotal,
      gst,
      pst,
      hst: 0,
      total: subtotal + gst + pst,
      taxLabel: `GST (${rates.gst}%) + PST (${rates.pst}%)`,
      taxRate: rates.gst! + rates.pst!,
    };
  }

  // GST only
  const gst = subtotal * (rates.gst! / 100);
  return {
    subtotal,
    gst,
    pst: 0,
    hst: 0,
    total: subtotal + gst,
    taxLabel: `GST (${rates.gst}%)`,
    taxRate: rates.gst!,
  };
}

export function formatPrice(cents: number): string {
  return `$${(cents).toFixed(2)}`;
}

export function formatPriceFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
