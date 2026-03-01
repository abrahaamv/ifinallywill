/**
 * Legal term to plain language mapping
 * Definitions used throughout the estate planning application
 */

export interface LegalTerm {
  term: string;
  plain: string;
  tooltip: string;
}

export const LEGAL_TERMS: Record<string, LegalTerm> = {
  executor: {
    term: 'Executor',
    plain: 'Person who carries out your will',
    tooltip:
      'The person you appoint to manage your estate after you pass away. They ensure your wishes are carried out.',
  },
  beneficiary: {
    term: 'Beneficiary',
    plain: 'Person who receives from your estate',
    tooltip:
      'A person or organization you name to receive assets, money, or property from your estate.',
  },
  testator: {
    term: 'Testator',
    plain: 'The person making the will',
    tooltip:
      'The legal term for the person who creates and signs a will. If female, sometimes called a testatrix.',
  },
  bequest: {
    term: 'Bequest',
    plain: 'Assign assets to recipients',
    tooltip: 'A gift or item you leave to someone in your will.',
  },
  residue: {
    term: 'Residue',
    plain: "What's left",
    tooltip:
      "Assets you haven't specifically assigned to someone. These go to the beneficiaries you choose for what's left.",
  },
  guardian: {
    term: 'Guardian',
    plain: 'Person who cares for your children',
    tooltip: 'The person you appoint to care for your minor children if both parents pass away.',
  },
  powerOfAttorney: {
    term: 'Power of Attorney',
    plain: 'Someone who acts on your behalf',
    tooltip:
      'A legal document that gives someone you trust the authority to make decisions for you if you become unable to do so.',
  },
  poaProperty: {
    term: 'Power of Attorney for Property',
    plain: 'Someone who manages your finances',
    tooltip:
      'A legal document that authorizes a trusted person to manage your financial affairs and property if you are unable to do so.',
  },
  poaHealth: {
    term: 'Power of Attorney for Personal Care',
    plain: 'Someone who makes health decisions for you',
    tooltip:
      'A legal document that authorizes a trusted person to make healthcare and personal care decisions on your behalf if you are incapable.',
  },
  testamentaryTrust: {
    term: 'Testamentary trust',
    plain: 'A trust set up in your will',
    tooltip:
      'A trust that is created by your will and takes effect after you pass away. It can help manage assets for beneficiaries like children.',
  },
  perStirpes: {
    term: 'Per stirpes',
    plain: 'Within family branches',
    tooltip:
      'If a beneficiary passes away before you, their share goes to their children (their branch of the family).',
  },
  perCapita: {
    term: 'Per capita',
    plain: 'Equally among survivors',
    tooltip:
      'Your beneficiaries share equally. If one passes away before you, their share is divided among the remaining beneficiaries.',
  },
  wipeout: {
    term: 'Wipeout clause',
    plain: 'Backup plan if everyone passes',
    tooltip:
      'Instructions for what happens to your estate if all your named beneficiaries pass away before you.',
  },
  codicil: {
    term: 'Codicil',
    plain: 'An amendment to your will',
    tooltip:
      'A legal document that modifies, adds to, or partially revokes an existing will without replacing it entirely.',
  },
  intestate: {
    term: 'Intestate',
    plain: 'Dying without a valid will',
    tooltip:
      'When someone passes away without a valid will, the provincial government determines how the estate is distributed according to law.',
  },
  probate: {
    term: 'Probate',
    plain: 'Court validation of your will',
    tooltip:
      'The legal process where a court confirms that a will is valid and grants the executor authority to administer the estate.',
  },
  estateAdministrationTax: {
    term: 'Estate Administration Tax',
    plain: 'Probate fees',
    tooltip:
      'A tax paid to the provincial government when a will goes through probate. The amount is based on the total value of the estate.',
  },
  secondaryWill: {
    term: 'Secondary Will',
    plain: 'A separate will for specific assets',
    tooltip:
      'A second will used to deal with assets that do not require probate (e.g. shares in a private corporation), potentially reducing estate administration tax.',
  },
  trustee: {
    term: 'Trustee',
    plain: 'Person who manages a trust',
    tooltip:
      'The person or institution responsible for managing the assets held in a trust according to the terms set out in the will or trust document.',
  },
};

/**
 * Get the plain-language equivalent of a legal term.
 * Falls back to the original key if the term is not found.
 */
export function getPlainTerm(key: string): string {
  return LEGAL_TERMS[key]?.plain ?? LEGAL_TERMS[key]?.term ?? key;
}

/**
 * Get the tooltip explanation for a legal term.
 * Returns null if the term is not found.
 */
export function getTooltip(key: string): string | null {
  return LEGAL_TERMS[key]?.tooltip ?? null;
}

/**
 * Get all legal term keys.
 */
export function getAllTermKeys(): string[] {
  return Object.keys(LEGAL_TERMS);
}

/**
 * Search legal terms by partial match on term name, plain text, or tooltip.
 */
export function searchTerms(query: string): LegalTerm[] {
  const lower = query.toLowerCase();
  return Object.values(LEGAL_TERMS).filter(
    (entry) =>
      entry.term.toLowerCase().includes(lower) ||
      entry.plain.toLowerCase().includes(lower) ||
      entry.tooltip.toLowerCase().includes(lower)
  );
}
