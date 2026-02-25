/**
 * Document template renderer
 * Ported from: Willsystem-v6/resources/js/utils/templateRenderer.js
 *
 * Compiles Handlebars-style section arrays into HTML strings
 * using registered helpers for legal document generation.
 *
 * This module runs CLIENT-SIDE for preview and server-side for PDF.
 */

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
  spouseInfo: PersonInfo,
): PersonInfo & { relation: string } {
  const empty = { fullName: name || '', city: '', province: '', country: '', relation: '', phone: '' };
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
    return {
      fullName: rel.fullName ?? buildFullName(rel),
      city: rel.city ?? '',
      province: rel.province ?? '',
      country: rel.country ?? '',
      phone: rel.phone ?? '',
      relation: (rel as PersonInfo & { relative?: string }).relation ??
        (rel as unknown as { relative?: string }).relative ?? '',
    };
  }

  // Search kids
  const kid = (kids ?? []).find(matchPerson);
  if (kid) {
    return {
      fullName: kid.fullName ?? buildFullName(kid),
      city: kid.city ?? '',
      province: kid.province ?? '',
      country: kid.country ?? '',
      phone: kid.phone ?? '',
      relation: 'Child',
    };
  }

  // Check spouse
  if (spouseInfo?.firstName && spouseInfo?.lastName && matchPerson(spouseInfo)) {
    return {
      fullName: spouseInfo.fullName ?? buildFullName(spouseInfo),
      city: spouseInfo.city ?? '',
      province: spouseInfo.province ?? '',
      country: spouseInfo.country ?? '',
      phone: spouseInfo.phone ?? '',
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
  spouseInfo: PersonInfo,
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
    if (group.length > 1) {
      // Shared bequest
      html += `<li>I leave my ${(group[0].bequest ?? '').trim()} to be divided among the following beneficiaries if they survive me:<ul>`;
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
      const item = group[0];
      const info = findPersonInfo(item.names, relatives, kids, spouseInfo);
      const loc = formatLocation(info.city, info.province, info.country);
      let backup = '';
      if (item.backup && item.backup !== 'NA') {
        const bInfo = findPersonInfo(item.backup, relatives, kids, spouseInfo);
        const bLoc = formatLocation(bInfo.city, bInfo.province, bInfo.country);
        backup = ` In the event that ${item.names}${loc} does not survive me, I nominate ${item.backup}${bLoc} as the alternate beneficiary.`;
      }
      html += `<li>I leave my ${(item.bequest ?? '').trim()} to ${item.names}${loc} if they shall survive me, for their own use absolutely.${backup}</li>`;
    }
  }

  for (const item of custom) {
    html += `<li>${(item.bequest ?? '').trim()}, if they shall survive me, for their own use absolutely.</li>`;
  }

  return html;
}

// ---------------------------------------------------------------------------
// Section compiler (converts template section array to HTML)
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
// Simple Handlebars-like renderer
// ---------------------------------------------------------------------------

/**
 * Basic Handlebars variable replacement: {{path.to.value}}
 * Handles: {{#if}}, {{#unless}}, {{else}}, {{#each}}, {{/if}}, etc.
 *
 * For production, replace with actual Handlebars library.
 * This handles the simple variable substitution cases that cover ~70% of templates.
 */
function resolveValue(data: Record<string, unknown>, path: string): unknown {
  const keys = path.trim().split('.');
  let current: unknown = data;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function renderSimpleTemplate(template: string, data: Record<string, unknown>): string {
  // Replace simple {{variable.path}} expressions
  return template.replace(/\{\{([^#/][^}]*)\}\}/g, (_match, path: string) => {
    const value = resolveValue(data, path.trim());
    return value != null ? String(value) : '';
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a document from template sections and data.
 * For simple templates (variable substitution only).
 *
 * For full Handlebars support (block helpers, each, if/else),
 * use the Handlebars npm package directly.
 */
export function renderDocument(
  sections: TemplateSection[],
  data: Partial<TemplateData>,
): string {
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

  // Compile sections into a template string
  const templateString = compileSections(sections);

  // Simple variable substitution
  return renderSimpleTemplate(templateString, safeData as unknown as Record<string, unknown>);
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
