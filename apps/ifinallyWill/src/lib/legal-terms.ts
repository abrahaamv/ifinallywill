/**
 * Legal term to plain language mapping
 * Ported from: Willsystem-v6/resources/js/utils/legalTermExplanations.js
 */

export interface LegalTerm {
  term: string;
  plain: string;
  tooltip: string;
}

export const LEGAL_TERMS: Record<string, LegalTerm> = {
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
  executor: {
    term: 'Executor',
    plain: 'Person who carries out your will',
    tooltip:
      'The person you appoint to manage your estate after you pass away. They ensure your wishes are carried out.',
  },
  guardian: {
    term: 'Guardian',
    plain: 'Person who cares for your children',
    tooltip:
      'The person you appoint to care for your minor children if both parents pass away.',
  },
  powerOfAttorney: {
    term: 'Power of Attorney',
    plain: 'Someone who acts on your behalf',
    tooltip:
      'A legal document that gives someone you trust the authority to make decisions for you if you become unable to do so.',
  },
  wipeout: {
    term: 'Wipeout clause',
    plain: 'Backup plan if everyone passes',
    tooltip:
      'Instructions for what happens to your estate if all your named beneficiaries pass away before you.',
  },
};

export function getPlainTerm(key: string): string {
  return LEGAL_TERMS[key]?.plain ?? LEGAL_TERMS[key]?.term ?? key;
}

export function getTooltip(key: string): string | null {
  return LEGAL_TERMS[key]?.tooltip ?? null;
}
