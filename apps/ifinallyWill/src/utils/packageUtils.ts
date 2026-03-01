/**
 * Package utility functions for estate planning document management
 * Maps packages to their included document types and handles POA distribution
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface WillDocument {
  id: number;
  docType: string;
  owner: string;
  dataStatus: string;
  willIdentifier: string;
}

export interface POADocument {
  id: number;
  docType: string;
  owner: string;
  dataStatus: string;
  associatedWill: string | null;
}

export type InitializedDocument =
  | WillDocument
  | POADocument
  | {
      docType: string;
      owner: string;
      dataStatus: string;
    };

// ---------------------------------------------------------------------------
// Package document composition map
// ---------------------------------------------------------------------------

/**
 * Maps a package description to the ordered list of document types it contains.
 */
export const packageDocuments: Record<string, string[]> = {
  'One will only': ['primaryWill'],
  'One will and one POA (property)': ['primaryWill', 'poaProperty'],
  'One will and one POA (health)': ['primaryWill', 'poaHealth'],
  'One will and two POAs': ['primaryWill', 'poaProperty', 'poaHealth'],
  'One will and one secondary will': ['primaryWill', 'secondaryWill'],
  'One will and one secondary will and one POA (property)': [
    'primaryWill',
    'secondaryWill',
    'poaProperty',
  ],
  'One will and one secondary will and one POA (health)': [
    'primaryWill',
    'secondaryWill',
    'poaHealth',
  ],
  'One will and one secondary will and two POAs': [
    'primaryWill',
    'secondaryWill',
    'poaProperty',
    'poaHealth',
  ],
  'Two spousal wills only': ['primaryWill', 'spousalWill'],
  'Two spousal wills and one POA (property)': ['primaryWill', 'spousalWill', 'poaProperty'],
  'Two spousal wills and one POA (health)': ['primaryWill', 'spousalWill', 'poaHealth'],
  'Two spousal wills and four POAs': [
    'primaryWill',
    'spousalWill',
    'poaProperty',
    'poaProperty',
    'poaHealth',
    'poaHealth',
  ],
  'Two spousal wills and one secondary will': ['primaryWill', 'spousalWill', 'secondaryWill'],
  'Two spousal wills and one secondary will and two POAs (property)': [
    'primaryWill',
    'spousalWill',
    'secondaryWill',
    'poaProperty',
    'poaProperty',
  ],
  'Two spousal wills and one secondary will and two POAs (health)': [
    'primaryWill',
    'spousalWill',
    'secondaryWill',
    'poaHealth',
    'poaHealth',
  ],
  'Two spousal wills and one secondary will and four POAs': [
    'primaryWill',
    'spousalWill',
    'secondaryWill',
    'poaProperty',
    'poaProperty',
    'poaHealth',
    'poaHealth',
  ],
  'Two spousal wills and two secondary wills': [
    'primaryWill',
    'spousalWill',
    'secondaryWill',
    'secondaryWill',
  ],
  'Two spousal wills and two secondary wills and two POAs (property)': [
    'primaryWill',
    'spousalWill',
    'secondaryWill',
    'secondaryWill',
    'poaProperty',
    'poaProperty',
  ],
  'Two spousal wills and two secondary wills and two POAs (health)': [
    'primaryWill',
    'spousalWill',
    'secondaryWill',
    'secondaryWill',
    'poaHealth',
    'poaHealth',
  ],
  'Two spousal wills and two secondary wills and four POAs': [
    'primaryWill',
    'spousalWill',
    'secondaryWill',
    'secondaryWill',
    'poaProperty',
    'poaProperty',
    'poaHealth',
    'poaHealth',
  ],
  '1 X POA health only (no will)': ['poaHealth'],
  '1 X POA property only (no will)': ['poaProperty'],
  '1 X POA health and POA property (no will)': ['poaProperty', 'poaHealth'],
  '2 X POA health only (no will)': ['poaHealth', 'poaHealth'],
  '2 X POA property only (no will)': ['poaProperty', 'poaProperty'],
  '2 X POA health and POA property (no will)': [
    'poaProperty',
    'poaProperty',
    'poaHealth',
    'poaHealth',
  ],
};

// ---------------------------------------------------------------------------
// Package association rules
// ---------------------------------------------------------------------------

/**
 * Indicates whether POAs in a package should be distributed (associated) to wills.
 * - `false`  => no POAs to associate
 * - `true`   => POAs should be associated with wills
 * - `'poa-only'` => POA-only package (no wills present)
 */
export const packageAssociations: Record<string, boolean | 'poa-only'> = {
  'One will only': false,
  'One will and one POA (property)': true,
  'One will and one POA (health)': true,
  'One will and two POAs': true,
  'One will and one secondary will': false,
  'One will and one secondary will and one POA (property)': true,
  'One will and one secondary will and one POA (health)': true,
  'One will and one secondary will and two POAs': true,
  'Two spousal wills only': false,
  'Two spousal wills and two POAs (property)': true,
  'Two spousal wills and two POAs (health)': true,
  'Two spousal wills and four POAs': true,
  'Two spousal wills and one secondary will': false,
  'Two spousal wills and one secondary will and two POAs (property)': true,
  'Two spousal wills and one secondary will and two POAs (health)': true,
  'Two spousal wills and one secondary will and four POAs': true,
  'Two spousal wills and two secondary wills': false,
  'Two spousal wills and two secondary wills and two POAs (property)': true,
  'Two spousal wills and two secondary wills and two POAs (health)': true,
  'Two spousal wills and two secondary wills and four POAs': true,
  '1 X POA health only (no will)': 'poa-only',
  '1 X POA property only (no will)': 'poa-only',
  '1 X POA health and POA property (no will)': 'poa-only',
  '2 X POA health only (no will)': 'poa-only',
  '2 X POA property only (no will)': 'poa-only',
  '2 X POA health and POA property (no will)': 'poa-only',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a numeric priority for will types (lower = higher priority).
 * Used when distributing POAs to wills.
 */
function getWillPriority(docType: string): number {
  switch (docType) {
    case 'primaryWill':
      return 1;
    case 'spousalWill':
      return 2;
    case 'secondaryWill':
      return 3;
    default:
      return 4;
  }
}

/**
 * Distributes POA documents across available wills.
 * Each will can hold at most one `poaProperty` and one `poaHealth`.
 * Overflow POAs are assigned to the highest-priority will.
 */
function distributePOAs(
  wills: WillDocument[],
  poas: Array<POADocument & { associatedWill: string | null }>
): void {
  if (wills.length === 0) {
    poas.forEach((poa) => {
      poa.associatedWill = 'none';
    });
    return;
  }

  const willAssignments: Record<
    string,
    {
      poaProperty: POADocument | null;
      poaHealth: POADocument | null;
      priority: number;
    }
  > = {};

  wills.forEach((will) => {
    willAssignments[will.willIdentifier] = {
      poaProperty: null,
      poaHealth: null,
      priority: getWillPriority(will.docType),
    };
  });

  const sortedWillIds = Object.keys(willAssignments).sort(
    (a, b) => (willAssignments[a]?.priority ?? 0) - (willAssignments[b]?.priority ?? 0)
  );

  poas.forEach((poa) => {
    let assigned = false;

    for (const willId of sortedWillIds) {
      const assignment = willAssignments[willId];
      if (!assignment) continue;

      if (poa.docType === 'poaProperty' && assignment.poaProperty === null) {
        assignment.poaProperty = poa;
        poa.associatedWill = willId;
        assigned = true;
        break;
      }

      if (poa.docType === 'poaHealth' && assignment.poaHealth === null) {
        assignment.poaHealth = poa;
        poa.associatedWill = willId;
        assigned = true;
        break;
      }
    }

    // Overflow: assign to highest-priority will
    if (!assigned && sortedWillIds.length > 0) {
      poa.associatedWill = sortedWillIds[0] ?? null;
    }
  });
}

// ---------------------------------------------------------------------------
// Public API: document initialization
// ---------------------------------------------------------------------------

/**
 * Initializes documents for a given package, assigning identifiers and
 * distributing POAs to the appropriate wills.
 */
export function initializePackageDocuments(
  availableDocuments: string[],
  packageDescription: string
): InitializedDocument[] {
  const willCounters: Record<string, number> = {};
  const wills: WillDocument[] = [];
  const poas: Array<POADocument & { associatedWill: string | null }> = [];

  const packageAssociation = packageAssociations[packageDescription];
  const distributePOAsAllowed = packageAssociation === true || packageAssociation === 'poa-only';
  const isPOAOnlyPackage = packageAssociation === 'poa-only';

  // Separate wills and POAs
  availableDocuments.forEach((docType, index) => {
    if (docType.toLowerCase().includes('will')) {
      willCounters[docType] = (willCounters[docType] || 0) + 1;
      const willIdentifier = `${docType}_${willCounters[docType]}`;

      wills.push({
        id: index + 1,
        docType,
        owner: 'unknown',
        dataStatus: 'incomplete',
        willIdentifier,
      });
    } else if (docType.toLowerCase().includes('poa')) {
      poas.push({
        id: index + 1,
        docType,
        owner: 'unknown',
        dataStatus: 'incomplete',
        associatedWill: distributePOAsAllowed ? null : 'unknown',
      });
    }
  });

  // Distribute POAs
  if (distributePOAsAllowed) {
    if (isPOAOnlyPackage) {
      poas.forEach((poa) => {
        poa.associatedWill = 'none';
      });
    } else {
      distributePOAs(wills, poas);
    }
  }

  // Reconstruct in original order
  let willIdx = 0;
  let poaIdx = 0;

  return availableDocuments.map((docType): InitializedDocument => {
    if (docType.toLowerCase().includes('will')) {
      const will = wills[willIdx++];
      if (will) return will;
    }
    if (docType.toLowerCase().includes('poa')) {
      const poa = poas[poaIdx++];
      if (poa) return poa;
    }
    return { docType, owner: 'unknown', dataStatus: 'incomplete' };
  });
}

// ---------------------------------------------------------------------------
// Public API: package queries
// ---------------------------------------------------------------------------

/**
 * Returns the documents included in a named package (registration-flow style).
 */
export function getPackageDocuments(packageName: string): PackageDocument[] {
  const documentSets: Record<string, PackageDocument[]> = {
    'Basic Will Package': [
      {
        name: 'Last Will and Testament',
        type: 'primaryWill',
        description: 'Your primary will document',
      },
    ],
    'Complete Estate Package': [
      {
        name: 'Last Will and Testament',
        type: 'primaryWill',
        description: 'Your primary will document',
      },
      {
        name: 'Secondary Will',
        type: 'secondaryWill',
        description: 'For corporate assets and shares',
      },
      {
        name: 'Power of Attorney for Property',
        type: 'poaProperty',
        description: 'Financial decision-making authority',
      },
      {
        name: 'Power of Attorney for Health',
        type: 'poaHealth',
        description: 'Health care decision-making authority',
      },
    ],
    'Couples Package': [
      {
        name: 'Last Will and Testament (You)',
        type: 'primaryWill',
        description: 'Your primary will',
      },
      {
        name: 'Last Will and Testament (Partner)',
        type: 'spousalWill',
        description: "Your partner's primary will",
      },
      { name: 'Secondary Will (You)', type: 'secondaryWill', description: 'Your secondary will' },
      {
        name: 'Secondary Will (Partner)',
        type: 'spousalSecondaryWill',
        description: "Your partner's secondary will",
      },
      { name: 'POA Property (You)', type: 'poaProperty', description: 'Your property POA' },
      {
        name: 'POA Property (Partner)',
        type: 'spousalPoaProperty',
        description: "Your partner's property POA",
      },
      { name: 'POA Health (You)', type: 'poaHealth', description: 'Your health POA' },
      {
        name: 'POA Health (Partner)',
        type: 'spousalPoaHealth',
        description: "Your partner's health POA",
      },
    ],
  };

  return documentSets[packageName] ?? [];
}

/**
 * Determines if a package requires two people (primary + spouse/partner).
 * Returns true when the package contains a spousal will or 2+ of the same POA type.
 */
export function packageRequiresTwoPeople(packageDescription: string): boolean {
  // Check the detailed document map first
  const docs = packageDocuments[packageDescription];
  if (docs) {
    if (docs.includes('spousalWill')) return true;

    const poaPropertyCount = docs.filter((d) => d === 'poaProperty').length;
    const poaHealthCount = docs.filter((d) => d === 'poaHealth').length;
    if (poaPropertyCount >= 2 || poaHealthCount >= 2) return true;

    return false;
  }

  // Fallback: simple name-based check for registration-flow packages
  return packageDescription.toLowerCase().includes('couples');
}

// ---------------------------------------------------------------------------
// Registration-flow packages
// ---------------------------------------------------------------------------

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
    features: [
      'Last Will and Testament',
      'Secondary Will',
      'POA for Property',
      'POA for Health',
      'Save $47',
    ],
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
 * Filter available packages based on user selections.
 */
export function getAvailablePackages(
  province: string,
  hasPartner: boolean,
  wantsPoa: boolean | null,
  wantsSecondaryWill: boolean | null
): Package[] {
  let packages = [...DEFAULT_PACKAGES];

  if (!hasPartner) {
    packages = packages.filter((p) => !p.name.toLowerCase().includes('couples'));
  }

  if (wantsPoa === false) {
    packages = packages.filter((p) => !p.name.toLowerCase().includes('poa'));
  }

  if (wantsSecondaryWill === false && province) {
    packages = packages.filter((p) => !p.name.toLowerCase().includes('secondary'));
  }

  return packages;
}
