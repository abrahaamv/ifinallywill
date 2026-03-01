/**
 * Document type definitions for IFinallyWill
 */

export const DOCUMENT_TYPES = [
  {
    type: 'primary_will' as const,
    name: 'Last Will & Testament',
    description: 'Protect your family and distribute your estate',
    price: 89,
    icon: '📄',
  },
  {
    type: 'secondary_will' as const,
    name: 'Secondary Will',
    description: 'For private company shares and specific assets',
    price: 69,
    icon: '📋',
  },
  {
    type: 'poa_property' as const,
    name: 'Power of Attorney for Property',
    description: "Choose someone to manage your finances if you can't",
    price: 49,
    icon: '🏦',
  },
  {
    type: 'poa_health' as const,
    name: 'Power of Attorney for Health',
    description: 'Choose someone to make health care decisions for you',
    price: 49,
    icon: '🏥',
  },
] as const;

export const BUNDLE_PRICE = 189;
export const BUNDLE_SAVINGS = DOCUMENT_TYPES.reduce((sum, d) => sum + d.price, 0) - BUNDLE_PRICE;
