/**
 * Package definitions and document initialization
 * Ported from: Willsystem-v6/resources/js/Components/PDF/Content/packagesData.js
 *              Willsystem-v6/resources/js/utils/packageUtils.js
 *
 * v6 had 6 packages split by secondary will availability (ON/BC only).
 * We keep the same package structure but with proper types.
 */

export type DocumentType =
  | 'primaryWill'
  | 'spousalWill'
  | 'secondaryWill'
  | 'poaProperty'
  | 'poaHealth';

export type PackageKey =
  | 'basicWillNoSecondary'
  | 'basicWillWithSecondary'
  | 'completePlanNoSecondary'
  | 'completePlanWithSecondary'
  | 'couplesPlanNoSecondary'
  | 'couplesPlanWithSecondary';

export interface PackageDocument {
  docType: DocumentType;
  owner: string;
  willIdentifier: string;
  dataStatus: 'incomplete' | 'complete';
  associatedWill: string;
}

export interface PackageDefinition {
  key: PackageKey;
  name: string;
  price: number;
  wasPrice: number | null;
  description: string;
  isSignatureRequired: boolean;
  requiresSecondaryProvince: boolean;
  isCouples: boolean;
  documents: DocumentType[];
}

const SECONDARY_WILL_PROVINCES: readonly string[] = ['ON', 'BC'];

export function provinceSupportsSecondaryWill(provinceCode: string): boolean {
  return SECONDARY_WILL_PROVINCES.includes(provinceCode.toUpperCase());
}

export const PACKAGES: PackageDefinition[] = [
  {
    key: 'basicWillNoSecondary',
    name: 'Basic Will',
    price: 89,
    wasPrice: null,
    description: 'A single last will and testament',
    isSignatureRequired: false,
    requiresSecondaryProvince: false,
    isCouples: false,
    documents: ['primaryWill'],
  },
  {
    key: 'basicWillWithSecondary',
    name: 'Basic Will',
    price: 89,
    wasPrice: null,
    description: 'A last will and testament with secondary will',
    isSignatureRequired: false,
    requiresSecondaryProvince: true,
    isCouples: false,
    documents: ['primaryWill', 'secondaryWill'],
  },
  {
    key: 'completePlanNoSecondary',
    name: 'Complete Plan',
    price: 159,
    wasPrice: null,
    description: 'Will + Power of Attorney for Property + Power of Attorney for Health',
    isSignatureRequired: false,
    requiresSecondaryProvince: false,
    isCouples: false,
    documents: ['primaryWill', 'poaProperty', 'poaHealth'],
  },
  {
    key: 'completePlanWithSecondary',
    name: 'Complete Plan',
    price: 159,
    wasPrice: null,
    description:
      'Will + Secondary Will + Power of Attorney for Property + Power of Attorney for Health',
    isSignatureRequired: false,
    requiresSecondaryProvince: true,
    isCouples: false,
    documents: ['primaryWill', 'secondaryWill', 'poaProperty', 'poaHealth'],
  },
  {
    key: 'couplesPlanNoSecondary',
    name: 'Couples Plan',
    price: 249,
    wasPrice: 349,
    description: '2 Wills + 4 Powers of Attorney',
    isSignatureRequired: false,
    requiresSecondaryProvince: false,
    isCouples: true,
    documents: [
      'primaryWill',
      'spousalWill',
      'poaProperty',
      'poaHealth',
      'poaProperty',
      'poaHealth',
    ],
  },
  {
    key: 'couplesPlanWithSecondary',
    name: 'Couples Plan',
    price: 249,
    wasPrice: 349,
    description: '2 Wills + 2 Secondary Wills + 4 Powers of Attorney',
    isSignatureRequired: false,
    requiresSecondaryProvince: true,
    isCouples: true,
    documents: [
      'primaryWill',
      'spousalWill',
      'secondaryWill',
      'secondaryWill',
      'poaProperty',
      'poaHealth',
      'poaProperty',
      'poaHealth',
    ],
  },
];

export function getPackagesForProvince(provinceCode: string): PackageDefinition[] {
  const hasSecondary = provinceSupportsSecondaryWill(provinceCode);
  return PACKAGES.filter((pkg) =>
    hasSecondary ? pkg.requiresSecondaryProvince : !pkg.requiresSecondaryProvince
  );
}

export function initializePackageDocuments(
  pkg: PackageDefinition,
  primaryEmail: string,
  spouseEmail?: string
): PackageDocument[] {
  const halfPoint = Math.ceil(pkg.documents.length / 2);
  return pkg.documents.map((docType, idx) => {
    const isSpousalDoc = docType === 'spousalWill' || (pkg.isCouples && idx >= halfPoint);
    const owner = isSpousalDoc && spouseEmail ? spouseEmail : primaryEmail;
    const willIdentifier =
      docType === 'spousalWill'
        ? 'spousalWill'
        : docType === 'secondaryWill'
          ? 'secondaryWill'
          : docType;
    const associatedWill = ['poaProperty', 'poaHealth'].includes(docType)
      ? isSpousalDoc
        ? 'spousalWill'
        : 'primaryWill'
      : docType;

    return {
      docType,
      owner,
      willIdentifier,
      dataStatus: 'incomplete' as const,
      associatedWill,
    };
  });
}

export function getDocumentCount(pkg: PackageDefinition): number {
  return pkg.documents.length;
}

export function determinePackageKey(opts: {
  province: string;
  hasCouples: boolean;
  wantsPOA: boolean;
}): PackageKey {
  const hasSecondary = provinceSupportsSecondaryWill(opts.province);
  if (opts.hasCouples) {
    return hasSecondary ? 'couplesPlanWithSecondary' : 'couplesPlanNoSecondary';
  }
  if (opts.wantsPOA) {
    return hasSecondary ? 'completePlanWithSecondary' : 'completePlanNoSecondary';
  }
  return hasSecondary ? 'basicWillWithSecondary' : 'basicWillNoSecondary';
}

export function getPackageByKey(key: PackageKey): PackageDefinition | undefined {
  return PACKAGES.find((p) => p.key === key);
}
