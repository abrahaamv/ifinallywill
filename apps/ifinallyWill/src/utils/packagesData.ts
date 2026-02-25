/**
 * Package data and formatting utilities for pricing cards
 */

export interface PricingCardData {
  id: number;
  name: string;
  tagline: string;
  price: string;
  priceNumeric: number;
  features: string[];
  badge?: string;
  recommended?: boolean;
}

export function mapPackageToCardFormat(pkg: {
  id: number;
  name: string;
  description: string;
  price: number;
  features: string[];
}): PricingCardData {
  const badges: Record<string, string> = {
    'Complete Estate Package': 'MOST POPULAR',
    'Couples Package': 'BEST VALUE',
  };

  return {
    id: pkg.id,
    name: pkg.name,
    tagline: pkg.description,
    price: `$${pkg.price}`,
    priceNumeric: pkg.price,
    features: pkg.features,
    badge: badges[pkg.name],
    recommended: pkg.name === 'Complete Estate Package',
  };
}

/**
 * Determine which packages are available based on user selections
 */
export function getPackagesForUser(options: {
  province: string;
  hasPartner: boolean;
  wantsPoa: boolean | null;
  wantsSecondaryWill: boolean | null;
  wantsSpousalPackage: boolean | null;
}): PricingCardData[] {
  // Import default packages inline to avoid circular deps
  const packages = [
    { id: 1, name: 'Basic Will Package', description: 'Essential Will', price: 89, features: ['Last Will and Testament', 'Legal compliance review', 'PDF download', 'Signing instructions'] },
    { id: 2, name: 'Complete Estate Package', description: 'Complete Protection', price: 189, features: ['Last Will and Testament', 'Secondary Will', 'POA for Property', 'POA for Health', 'Save $47 vs individual'] },
    { id: 3, name: 'Couples Package', description: 'Couples Protection', price: 299, features: ['Two Last Wills', 'Two Secondary Wills', 'All 4 POAs', 'Save $175 vs individual'] },
  ];

  let filtered = packages;

  // If user explicitly doesn't want a couples plan
  if (!options.hasPartner || options.wantsSpousalPackage === false) {
    filtered = filtered.filter(p => !p.name.toLowerCase().includes('couples'));
  }

  // If user came from selecting "planning together", jump straight to couples
  if (options.wantsSpousalPackage === true) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes('couples'));
  }

  return filtered.map(mapPackageToCardFormat);
}
