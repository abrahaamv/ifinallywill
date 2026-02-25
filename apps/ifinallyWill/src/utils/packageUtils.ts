/**
 * Package utility functions for registration flow
 * Maps packages to their included document types
 */

export interface PackageDocument {
  name: string;
  type: string;
  description: string;
}

export interface Package {
  id: number;
  name: string;
  description: string;
  price: number;
  features: string[];
}

/**
 * Returns the documents included in a package
 */
export function getPackageDocuments(packageName: string): PackageDocument[] {
  const documentSets: Record<string, PackageDocument[]> = {
    'Basic Will Package': [
      { name: 'Last Will and Testament', type: 'primaryWill', description: 'Your primary will document' },
    ],
    'Complete Estate Package': [
      { name: 'Last Will and Testament', type: 'primaryWill', description: 'Your primary will document' },
      { name: 'Secondary Will', type: 'secondaryWill', description: 'For corporate assets and shares' },
      { name: 'Power of Attorney for Property', type: 'poaProperty', description: 'Financial decision-making authority' },
      { name: 'Power of Attorney for Health', type: 'poaHealth', description: 'Health care decision-making authority' },
    ],
    'Couples Package': [
      { name: 'Last Will and Testament (You)', type: 'primaryWill', description: 'Your primary will' },
      { name: 'Last Will and Testament (Partner)', type: 'spousalWill', description: "Your partner's primary will" },
      { name: 'Secondary Will (You)', type: 'secondaryWill', description: 'Your secondary will' },
      { name: 'Secondary Will (Partner)', type: 'spousalSecondaryWill', description: "Your partner's secondary will" },
      { name: 'POA Property (You)', type: 'poaProperty', description: 'Your property POA' },
      { name: 'POA Property (Partner)', type: 'spousalPoaProperty', description: "Your partner's property POA" },
      { name: 'POA Health (You)', type: 'poaHealth', description: 'Your health POA' },
      { name: 'POA Health (Partner)', type: 'spousalPoaHealth', description: "Your partner's health POA" },
    ],
  };

  return documentSets[packageName] || [];
}

/**
 * Check if a package requires two people (partner info)
 */
export function packageRequiresTwoPeople(packageName: string): boolean {
  return packageName.toLowerCase().includes('couples');
}

/**
 * Default packages for the registration flow
 */
export const DEFAULT_PACKAGES: Package[] = [
  {
    id: 1,
    name: 'Basic Will Package',
    description: 'Essential Will',
    price: 89,
    features: ['Last Will and Testament', 'Legal compliance', 'PDF download'],
  },
  {
    id: 2,
    name: 'Complete Estate Package',
    description: 'Complete Protection',
    price: 189,
    features: ['Last Will and Testament', 'Secondary Will', 'POA for Property', 'POA for Health', 'Save $47'],
  },
  {
    id: 3,
    name: 'Couples Package',
    description: 'Couples Protection',
    price: 299,
    features: ['Two Wills', 'Two Secondary Wills', 'All POAs for both', 'Save $175'],
  },
];

/**
 * Filter packages based on user selections
 * - If user is in a province without secondary wills and has no partner, show basic + reduced complete
 * - If user has a partner, show couples option
 */
export function getAvailablePackages(
  province: string,
  hasPartner: boolean,
  wantsPoa: boolean | null,
  wantsSecondaryWill: boolean | null,
): Package[] {
  let packages = [...DEFAULT_PACKAGES];

  // If no partner, don't show couples package
  if (!hasPartner) {
    packages = packages.filter(p => !p.name.toLowerCase().includes('couples'));
  }

  // TODO: Filter by province (secondary will availability), POA preferences
  // Using params to indicate future use:
  if (wantsPoa === false) {
    packages = packages.filter(p => !p.name.toLowerCase().includes('poa'));
  }
  if (wantsSecondaryWill === false && province) {
    packages = packages.filter(p => !p.name.toLowerCase().includes('secondary'));
  }

  return packages;
}
