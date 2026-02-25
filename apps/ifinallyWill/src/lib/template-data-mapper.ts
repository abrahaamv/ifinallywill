/**
 * Template data mapper
 * Converts normalized DB data (WillData, PoaData, KeyNames) into
 * the flat template variable format expected by v6 Handlebars templates.
 *
 * This bridges our clean relational model with the legacy template system.
 */

import type { WillData, PoaData, KeyName } from './types';
import type { TemplateData, PersonInfo } from './template-renderer';
import { calculateTrustingAges } from './template-renderer';

// ---------------------------------------------------------------------------
// Person conversion
// ---------------------------------------------------------------------------

function keyNameToPersonInfo(person: KeyName): PersonInfo {
  return {
    fullName: [person.firstName, person.middleName, person.lastName]
      .filter(Boolean)
      .join(' ')
      .trim(),
    firstName: person.firstName,
    middleName: person.middleName ?? undefined,
    lastName: person.lastName,
    city: person.city ?? undefined,
    province: person.province ?? undefined,
    country: person.country ?? undefined,
    phone: person.phone ?? undefined,
    relation: person.relationship,
  };
}

function lookupPerson(id: string | null | undefined, people: KeyName[]): PersonInfo {
  if (!id) return { fullName: '' };
  const p = people.find((k) => k.id === id);
  return p ? keyNameToPersonInfo(p) : { fullName: '' };
}

// ---------------------------------------------------------------------------
// Will template data
// ---------------------------------------------------------------------------

export function mapWillToTemplateData(
  willData: WillData,
  people: KeyName[],
  documentType: string,
): Partial<TemplateData> {
  const pi = willData.personalInfo;
  const spouse = willData.spouseInfo;
  const isMarried = willData.maritalStatus === 'married';
  const isCommon = willData.maritalStatus === 'common_law';
  const children = people.filter((p) => p.relationship === 'child');
  const nonChildren = people.filter((p) => p.relationship !== 'child');

  // Map executors: convert from keyNameId references to name-based format
  const executors = (willData.executors ?? []).map((e, idx) => {
    const person = lookupPerson(e.keyNameId, people);
    return {
      firstName: person.firstName ?? '',
      lastName: person.lastName ?? '',
      priority: e.position === 'primary' ? 0 : e.position === 'alternate' ? 1 : idx + 1,
      city: person.city,
      province: person.province,
      country: person.country,
      phone: person.phone,
    };
  });

  // Map guardians: convert from keyNameId references
  const guardians = (willData.guardians ?? []).map((g) => {
    const person = lookupPerson(g.keyNameId, people);
    return {
      guardian: person.fullName,
      backup: '', // TODO: alternate guardians
      position: g.position === 'primary' ? 0 : 1,
    };
  });

  // Map pets: convert from keyNameId references
  const pets = (willData.pets ?? []).map((pet) => {
    const guardian = lookupPerson(pet.guardianKeyNameId, people);
    const backup = lookupPerson(pet.backupKeyNameId, people);
    return {
      name: pet.name,
      type: pet.type,
      guardian: guardian.fullName,
      backup: backup.fullName || undefined,
      amount: pet.amount ? `$${pet.amount}` : undefined,
      numericAmount: pet.amount ?? undefined,
    };
  });

  // Map trusting
  const trusting = (willData.trusting ?? []).map((t) => {
    const child = lookupPerson(t.childKeyNameId, people);
    return {
      age: t.age,
      shares: t.shares,
      firstName: child.firstName ?? '',
      lastName: child.lastName ?? '',
    };
  });

  const ages = calculateTrustingAges(trusting);

  // Determine will type label
  const willTypeMap: Record<string, string> = {
    primary_will: 'PRIMARY',
    secondary_will: 'SECONDARY',
    spousal_will: 'SPOUSAL',
  };

  return {
    personal: {
      fullName: pi?.fullName ?? '',
      email: pi?.email,
      city: pi?.city,
      province: pi?.province,
      country: pi?.country ?? 'Canada',
      gender: pi?.gender,
      phone: pi?.phone,
    },
    isMarried,
    isCommonRelationship: isCommon,
    spouseInfo: spouse
      ? {
          fullName: `${spouse.firstName ?? ''} ${spouse.lastName ?? ''}`.trim(),
          firstName: spouse.firstName,
          lastName: spouse.lastName,
          city: spouse.city ?? undefined,
          province: spouse.province ?? undefined,
          country: spouse.country ?? undefined,
          phone: spouse.phone ?? undefined,
          relation: 'Spouse',
        }
      : { fullName: '' },
    hasKids: children.length > 0,
    kids: children.map(keyNameToPersonInfo),
    relatives: nonChildren.map((p) => ({
      ...keyNameToPersonInfo(p),
      relative: p.relationship,
    })) as PersonInfo[],
    executors,
    bequests: [], // Bequests are loaded separately via tRPC
    trusting,
    minTrustingAge: ages.min,
    maxTrustingAge: ages.max,
    guardians,
    pets,
    residueInfo: willData.residue
      ? {
          selected: willData.residue.selected,
          beneficiary: willData.residue.beneficiary,
          clause: willData.residue.clause,
        }
      : {},
    wipeoutInfo: willData.wipeout
      ? {
          selectedCategory: willData.wipeout.selectedCategory,
          selectedOption: willData.wipeout.selectedOption,
          table_dataBequest: willData.wipeout.table_dataBequest,
          availableShares: willData.wipeout.availableShares,
        }
      : {},
    additionalInfo: willData.additional
      ? {
          finalRestingPlace: willData.additional.finalRestingPlace ?? undefined,
          customClauseText: willData.additional.customClauseText ?? undefined,
          otherWishes: willData.additional.otherWishes ?? undefined,
          organDonation: willData.additional.organDonation ?? undefined,
        }
      : {},
    willType: willTypeMap[documentType] ?? 'PRIMARY',
    documentType,
  };
}

// ---------------------------------------------------------------------------
// POA template data
// ---------------------------------------------------------------------------

export function mapPoaToTemplateData(
  poaData: PoaData,
  people: KeyName[],
  documentType: string,
): Partial<TemplateData> {
  const pi = poaData.personalInfo;

  const primaryAgent = lookupPerson(poaData.primaryAgent, people);
  const jointAgent = lookupPerson(poaData.jointAgent, people);
  const backupAgents = (poaData.backupAgents ?? []).map((id) => lookupPerson(id, people));

  const base: Partial<TemplateData> = {
    personal: {
      fullName: pi?.fullName ?? '',
      email: pi?.email,
      city: pi?.city,
      province: pi?.province,
      country: pi?.country ?? 'Canada',
      phone: pi?.phone,
    },
    attorneyOne: {
      ...primaryAgent,
      relation: primaryAgent.relation ?? '',
    },
    attorneyJoint: jointAgent.fullName
      ? { ...jointAgent, relation: jointAgent.relation ?? '' }
      : undefined,
    attorneyTwo: backupAgents.length > 0
      ? backupAgents.map((a) => ({ ...a, relation: a.relation ?? '' }))
      : undefined,
    restrictions: poaData.restrictions ?? undefined,
    activationType: poaData.activationType ?? 'immediate',
    documentType,
  };

  // Add health-specific fields
  if (documentType === 'poa_health' && poaData.healthDetails) {
    base.POAInfo = {
      organDonation: poaData.healthDetails.organDonation,
      dnr: poaData.healthDetails.dnr,
    };
    if (poaData.healthDetails.statements) {
      base.statements = {};
      const stmts = poaData.healthDetails.statements;
      if (stmts.terminalCondition) {
        base.statements.terminalCondition = {
          selected: true,
          wishes: stmts.terminalCondition,
        };
      }
      if (stmts.unconsciousCondition) {
        base.statements.unconsciousCondition = {
          selected: true,
          wishes: stmts.unconsciousCondition,
        };
      }
      if (stmts.mentalImpairment) {
        base.statements.mentalImpairment = {
          selected: true,
          wishes: stmts.mentalImpairment,
        };
      }
      if (stmts.otherDirectives) {
        base.statements.otherDirectives = {
          selected: true,
          wishes: stmts.otherDirectives,
        };
      }
    }
  }

  return base;
}
