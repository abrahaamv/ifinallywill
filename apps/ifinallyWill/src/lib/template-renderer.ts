/**
 * Document template renderer
 * Ported from: Willsystem-v6/resources/js/utils/templateRenderer.js
 *
 * Compiles Handlebars section arrays into HTML strings
 * using registered helpers for legal document generation.
 *
 * This module runs CLIENT-SIDE for preview and server-side for PDF.
 */

import Handlebars from 'handlebars';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  fallback: string;
  content: string;
  keywords: string[];
  children: TemplateSection[];
}

export interface PersonInfo {
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  city?: string;
  province?: string;
  country?: string;
  phone?: string;
  telephone?: string;
  relation?: string;
}

export interface TemplateData {
  personal: {
    fullName: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    city?: string;
    province?: string;
    country?: string;
    gender?: string;
    phone?: string;
  };
  isMarried: boolean;
  isCommonRelationship: boolean;
  spouseInfo: PersonInfo;
  hasKids: boolean;
  kids: PersonInfo[];
  relatives: PersonInfo[];
  executors: Array<{
    firstName: string;
    lastName: string;
    priority: number;
    city?: string;
    province?: string;
    country?: string;
    phone?: string;
  }>;
  bequests: Array<{
    id?: string;
    bequest: string;
    names: string;
    shares?: number;
    backup?: string;
    isCustom?: boolean;
    shared_uuid?: string;
  }>;
  trusting: Array<{
    age: number;
    shares?: number;
    firstName: string;
    lastName: string;
  }>;
  minTrustingAge: number | null;
  maxTrustingAge: number | null;
  guardians: Array<{
    guardian: string;
    backup?: string;
    position: number;
  }>;
  pets: Array<{
    name: string;
    type: string;
    guardian: string;
    backup?: string;
    amount?: string;
    numericAmount?: number;
    isShared?: boolean;
  }>;
  residueInfo: {
    selected?: string;
    beneficiary?: Array<{
      beneficiary: string;
      backup?: string;
      type?: string;
      shares?: number;
      isOrganization?: boolean;
    }>;
    clause?: string;
  };
  wipeoutInfo: {
    selectedCategory?: string;
    selectedOption?: string;
    table_dataBequest?: Array<{
      beneficiary: string;
      backup?: string;
      type?: string;
      shares?: number;
      isOrganization?: boolean;
    }>;
    availableShares?: number;
  };
  additionalInfo: {
    finalRestingPlace?: string;
    customClauseText?: string;
    otherWishes?: string[];
    organDonation?: boolean;
  };
  willType?: string;
  documentType?: string;

  // POA-specific
  attorneyOne?: PersonInfo;
  attorneyJoint?: PersonInfo;
  attorneyTwo?: PersonInfo[];
  restrictions?: string;
  activationType?: string;
  POAInfo?: { organDonation?: boolean; dnr?: boolean };
  statements?: Record<string, { selected?: boolean; wishes?: string }>;
}

// ---------------------------------------------------------------------------
// Person lookup (replaces v6 findPersonInfo)
// ---------------------------------------------------------------------------

function normalizeName(str: string): string {
  return (str ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getFirstLastName(fullName: string): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function buildFullName(p: PersonInfo): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim();
}

export function findPersonInfo(
  name: string,
  relatives: PersonInfo[],
  kids: PersonInfo[],
  spouseInfo: PersonInfo
): PersonInfo & { relation: string; telephone: string } {
  const empty = {
    fullName: name || '',
    city: '',
    province: '',
    country: '',
    relation: '',
    phone: '',
    telephone: '',
  };
  if (!name) return empty;

  const normalizedSearch = normalizeName(name);
  const searchFirstLast = normalizeName(getFirstLastName(name));

  const matchPerson = (p: PersonInfo): boolean => {
    const fl = normalizeName(`${p.firstName ?? ''} ${p.lastName ?? ''}`);
    if (fl === normalizedSearch || fl === searchFirstLast) return true;
    const full = normalizeName(p.fullName ?? buildFullName(p));
    if (full === normalizedSearch) return true;
    return normalizeName(getFirstLastName(full)) === searchFirstLast;
  };

  // Search relatives
  const rel = (relatives ?? []).find(matchPerson);
  if (rel) {
    const phone = rel.phone ?? rel.telephone ?? '';
    return {
      fullName: rel.fullName ?? buildFullName(rel),
      city: rel.city ?? '',
      province: rel.province ?? '',
      country: rel.country ?? '',
      phone,
      telephone: phone,
      relation:
        (rel as PersonInfo & { relative?: string }).relation ??
        (rel as unknown as { relative?: string }).relative ??
        '',
    };
  }

  // Search kids
  const kid = (kids ?? []).find(matchPerson);
  if (kid) {
    const phone = kid.phone ?? kid.telephone ?? '';
    return {
      fullName: kid.fullName ?? buildFullName(kid),
      city: kid.city ?? '',
      province: kid.province ?? '',
      country: kid.country ?? '',
      phone,
      telephone: phone,
      relation: 'Child',
    };
  }

  // Check spouse
  if (spouseInfo?.firstName && spouseInfo?.lastName && matchPerson(spouseInfo)) {
    const phone = spouseInfo.phone ?? spouseInfo.telephone ?? '';
    return {
      fullName: spouseInfo.fullName ?? buildFullName(spouseInfo),
      city: spouseInfo.city ?? '',
      province: spouseInfo.province ?? '',
      country: spouseInfo.country ?? '',
      phone,
      telephone: phone,
      relation: 'Spouse',
    };
  }

  return empty;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export function formatLocation(city?: string, province?: string, country?: string): string {
  const parts = [city, province, country].filter(Boolean);
  return parts.length > 0 ? ` of ${parts.join(', ')}` : '';
}

// ---------------------------------------------------------------------------
// Bequest renderer (replaces v6 renderBequestsImpl)
// ---------------------------------------------------------------------------

export function renderBequests(
  bequests: TemplateData['bequests'],
  relatives: PersonInfo[],
  kids: PersonInfo[],
  spouseInfo: PersonInfo
): string {
  if (!bequests?.length) return '';

  const custom = bequests.filter((b) => b.isCustom);
  const nonCustom = bequests.filter((b) => !b.isCustom);

  // Group by shared_uuid
  const groups = new Map<string, typeof nonCustom>();
  for (const item of nonCustom) {
    const key = item.shared_uuid ?? `single_${item.id ?? Math.random().toString(36).slice(2, 9)}`;
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }

  let html = '';

  for (const group of groups.values()) {
    const first = group[0];
    if (!first) continue;
    if (group.length > 1) {
      html += `<li>I leave my ${(first.bequest ?? '').trim()} to be divided among the following beneficiaries if they survive me:<ul>`;
      for (const item of group) {
        const info = findPersonInfo(item.names, relatives, kids, spouseInfo);
        const loc = formatLocation(info.city, info.province, info.country);
        let backup = '';
        if (item.backup && item.backup !== 'NA') {
          const bInfo = findPersonInfo(item.backup, relatives, kids, spouseInfo);
          const bLoc = formatLocation(bInfo.city, bInfo.province, bInfo.country);
          backup = ` In the event that ${item.names}${loc} does not survive me, I nominate ${item.backup}${bLoc} as the alternate beneficiary.`;
        }
        html += `<li>${item.names}${loc} \u2013 ${item.shares ?? 0} share(s).${backup}</li>`;
      }
      html += '</ul></li>';
    } else {
      const info = findPersonInfo(first.names, relatives, kids, spouseInfo);
      const loc = formatLocation(info.city, info.province, info.country);
      let backup = '';
      if (first.backup && first.backup !== 'NA') {
        const bInfo = findPersonInfo(first.backup, relatives, kids, spouseInfo);
        const bLoc = formatLocation(bInfo.city, bInfo.province, bInfo.country);
        backup = ` In the event that ${first.names}${loc} does not survive me, I nominate ${first.backup}${bLoc} as the alternate beneficiary.`;
      }
      html += `<li>I leave my ${(first.bequest ?? '').trim()} to ${first.names}${loc} if they shall survive me, for their own use absolutely.${backup}</li>`;
    }
  }

  for (const item of custom) {
    html += `<li>${(item.bequest ?? '').trim()}, if they shall survive me, for their own use absolutely.</li>`;
  }

  return html;
}

// ---------------------------------------------------------------------------
// Register all 21 Handlebars helpers (ported from v6 templateRenderer.js)
// ---------------------------------------------------------------------------

let helpersRegistered = false;

function registerHandlebarsHelpers(): void {
  if (helpersRegistered) return;
  helpersRegistered = true;

  // --- String helpers ---

  Handlebars.registerHelper('formatLocation', (city, province, country) => {
    const parts = [city, province, country].filter((p: unknown) => p);
    return new Handlebars.SafeString(parts.length > 0 ? ` of ${parts.join(', ')}` : '');
  });

  Handlebars.registerHelper('capitalLetters', (text) => {
    if (text == null) return '';
    return String(text).toUpperCase();
  });

  Handlebars.registerHelper('concat', (...args: unknown[]) => {
    // Last argument is the Handlebars options object
    return args.slice(0, -1).join('');
  });

  Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);

  // --- Logic helpers ---

  Handlebars.registerHelper('if_eq', function (this: unknown, a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('eq', (a, b) => a === b);

  Handlebars.registerHelper('if_neq', function (this: unknown, a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('if_gt', function (this: unknown, a, b, options) {
    return a > b ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('if_or', function (this: unknown, ...args: unknown[]) {
    const options = args[args.length - 1] as Handlebars.HelperOptions;
    const values = args.slice(0, -1);
    return values.some(Boolean) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('if_and', function (this: unknown, ...args: unknown[]) {
    const options = args[args.length - 1] as Handlebars.HelperOptions;
    const values = args.slice(0, -1);
    return values.every(Boolean) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('unless_eq', function (this: unknown, a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
  });

  // --- Entity helpers ---

  Handlebars.registerHelper('isLawFirm', function (this: unknown, name, options) {
    const lawFirms = ['iFinallyWill'];
    return lawFirms.includes(name) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper(
    'findPersonInfo',
    function (this: unknown, name, relatives, kids, spouseInfo, options) {
      const personInfo = findPersonInfo(name, relatives || [], kids || [], spouseInfo || {});
      return options.fn(personInfo);
    }
  );

  Handlebars.registerHelper('isSpecificRelation', (relation) => {
    const specificRelations = [
      'spouse',
      'brother',
      'sister',
      'son',
      'daughter',
      'mother',
      'father',
      'friend',
    ];
    return specificRelations.includes(relation?.toLowerCase());
  });

  Handlebars.registerHelper('get', (obj, prop) => {
    if (!obj) return '';
    const properties = String(prop).split('.');
    let value: unknown = obj;
    for (const p of properties) {
      if (value === undefined || value === null) return '';
      value = (value as Record<string, unknown>)[p];
    }
    return value === undefined ? '' : value;
  });

  Handlebars.registerHelper('debug', (value) => {
    if (import.meta.env.DEV) {
      console.log('Template Debug:', value);
    }
    return JSON.stringify(value, null, 2);
  });

  // --- Complex helpers ---

  Handlebars.registerHelper('renderBequests', (bequests, relatives, kids, spouseInfo) => {
    if (!bequests) return '';
    return new Handlebars.SafeString(
      renderBequests(bequests, relatives || [], kids || [], spouseInfo || {})
    );
  });

  Handlebars.registerHelper('groupByPriority', function (this: unknown, executors, options) {
    if (!executors || !Array.isArray(executors) || executors.length === 0) {
      return options.inverse(this);
    }

    const grouped: Record<number, unknown[]> = {};
    for (const executor of executors) {
      if (!executor) continue;
      const priority = ((executor as Record<string, unknown>).priority as number) || 0;
      if (!grouped[priority]) grouped[priority] = [];
      grouped[priority].push(executor);
    }

    const sortedGroups = Object.entries(grouped)
      .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
      .map(([, group]) => group);

    return options.fn({ groups: sortedGroups });
  });

  Handlebars.registerHelper('eachGroup', function (this: unknown, options) {
    const ctx = this as Record<string, unknown>;
    const groups = ctx?.groups as unknown[][] | undefined;
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return options.inverse(this);
    }

    let result = '';
    groups.forEach((group, index) => {
      const data = Handlebars.createFrame(options.data || {});
      data.index = index;
      data.first = index === 0;
      data.last = index === groups.length - 1;
      data.root = { groups };
      result += options.fn(group, { data });
    });
    return result;
  });

  Handlebars.registerHelper('prevGroup', function (this: unknown, options) {
    const data = options.data;
    if (!data?.root?.groups) return '';
    const groups = data.root.groups as unknown[][];
    const index = data.index as number;
    if (index > 0 && groups[index - 1]) {
      return options.fn(groups[index - 1]);
    }
    return '';
  });

  Handlebars.registerHelper('groupByPosition', function (this: unknown, guardians, options) {
    if (!guardians || !Array.isArray(guardians) || guardians.length === 0) {
      return options.inverse(this);
    }

    const grouped: Record<number, unknown[]> = {};
    for (const guardian of guardians) {
      if (!guardian) continue;
      const position = ((guardian as Record<string, unknown>).position as number) || 0;
      if (!grouped[position]) grouped[position] = [];
      grouped[position].push(guardian);
    }

    const sortedGroups = Object.entries(grouped)
      .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
      .map(([, group]) => group);

    return options.fn({ groups: sortedGroups });
  });
}

// ---------------------------------------------------------------------------
// Section compiler (converts template section array to a Handlebars string)
// ---------------------------------------------------------------------------

function compileSections(sections: TemplateSection[]): string {
  if (!sections?.length) return '';
  return [...sections]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section) => {
      let html = section.title ?? '';
      html += section.content || section.fallback || '';
      if (section.children?.length) {
        html += compileSections(section.children);
      }
      return html;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a document from template sections and data.
 * Uses real Handlebars with all 21 v6 helpers registered.
 */
export function renderDocument(sections: TemplateSection[], data: Partial<TemplateData>): string {
  const safeData: TemplateData = {
    personal: { fullName: '', city: '', province: '' },
    isMarried: false,
    isCommonRelationship: false,
    spouseInfo: { fullName: '' },
    hasKids: false,
    kids: [],
    relatives: [],
    executors: [],
    bequests: [],
    trusting: [],
    minTrustingAge: null,
    maxTrustingAge: null,
    guardians: [],
    pets: [],
    residueInfo: {},
    wipeoutInfo: {},
    additionalInfo: {},
    ...data,
  };

  // Ensure helpers are registered
  registerHandlebarsHelpers();

  // Compile sections into a single Handlebars template string
  const templateString = compileSections(sections);

  try {
    const compiled = Handlebars.compile(templateString);
    return compiled(safeData);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error rendering template:', error);
    }
    return `<p>Error rendering template: ${error instanceof Error ? error.message : String(error)}</p>`;
  }
}

/**
 * Calculate min/max trusting ages for template variables.
 */
export function calculateTrustingAges(trusting: TemplateData['trusting']): {
  min: number | null;
  max: number | null;
} {
  if (!trusting?.length) return { min: null, max: null };
  const ages = trusting.map((t) => t.age).filter((a) => a > 0);
  if (ages.length === 0) return { min: null, max: null };
  return { min: Math.min(...ages), max: Math.max(...ages) };
}
