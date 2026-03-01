/**
 * Template registry with lazy loading
 *
 * Maps (province, docType) to dynamically imported template sections.
 * Uses Vite dynamic imports for code splitting — only the needed
 * template is bundled into the chunk when requested.
 */

import type { TemplateSection } from '../lib/template-renderer';

export type Province =
  | 'alberta'
  | 'british-columbia'
  | 'manitoba'
  | 'new-brunswick'
  | 'newfoundland'
  | 'nova-scotia'
  | 'ontario'
  | 'prince-edward-island'
  | 'saskatchewan';

export type DocType = 'defaultWill' | 'primaryWill' | 'secondaryWill' | 'poaProperty' | 'poaHealth';

/** Map platform document types to template file names */
const DOC_TYPE_MAP: Record<string, DocType> = {
  // Will types
  default_will: 'defaultWill',
  primary_will: 'primaryWill',
  secondary_will: 'secondaryWill',
  // POA types
  poa_property: 'poaProperty',
  poa_health: 'poaHealth',
};

/** Map province strings (as stored in DB) to directory names */
const PROVINCE_MAP: Record<string, Province> = {
  alberta: 'alberta',
  ab: 'alberta',
  'british columbia': 'british-columbia',
  bc: 'british-columbia',
  manitoba: 'manitoba',
  mb: 'manitoba',
  'new brunswick': 'new-brunswick',
  nb: 'new-brunswick',
  newfoundland: 'newfoundland',
  'newfoundland and labrador': 'newfoundland',
  nl: 'newfoundland',
  'nova scotia': 'nova-scotia',
  ns: 'nova-scotia',
  ontario: 'ontario',
  on: 'ontario',
  'prince edward island': 'prince-edward-island',
  pei: 'prince-edward-island',
  pe: 'prince-edward-island',
  saskatchewan: 'saskatchewan',
  sk: 'saskatchewan',
};

// Vite glob import — all template modules, lazy-loaded
const templateModules = import.meta.glob<{ sections: TemplateSection[] }>('./canada/**/*.ts');

/**
 * Resolve a province string (flexible input) to a Province directory key.
 */
export function resolveProvince(input: string): Province | null {
  const normalized = input.trim().toLowerCase();
  return PROVINCE_MAP[normalized] ?? null;
}

/**
 * Resolve a platform document type to the template DocType.
 * Also accepts raw DocType values (defaultWill, etc.).
 */
export function resolveDocType(input: string): DocType | null {
  // Check direct match first (e.g., 'defaultWill')
  const valid: DocType[] = [
    'defaultWill',
    'primaryWill',
    'secondaryWill',
    'poaProperty',
    'poaHealth',
  ];
  if (valid.includes(input as DocType)) return input as DocType;
  // Check mapped names (e.g., 'primary_will')
  return DOC_TYPE_MAP[input] ?? null;
}

/**
 * Load template sections for a given province and document type.
 * Returns null if the combination is invalid or the template doesn't exist.
 *
 * Uses Vite dynamic imports — the template JS is only fetched when needed.
 */
export async function loadTemplate(
  provinceInput: string,
  docTypeInput: string
): Promise<TemplateSection[] | null> {
  const province = resolveProvince(provinceInput);
  const docType = resolveDocType(docTypeInput);

  if (!province || !docType) return null;

  const path = `./canada/${province}/${docType}.ts`;
  const loader = templateModules[path];

  if (!loader) return null;

  const mod = await loader();
  return mod.sections;
}

/**
 * Check which doc types are available for a province.
 * Ontario and BC support secondary wills; others don't.
 */
export function availableDocTypes(provinceInput: string): DocType[] {
  const province = resolveProvince(provinceInput);
  if (!province) return [];

  const base: DocType[] = ['defaultWill', 'poaProperty', 'poaHealth'];

  // ON and BC support primary/secondary will split
  if (province === 'ontario' || province === 'british-columbia') {
    return ['defaultWill', 'primaryWill', 'secondaryWill', 'poaProperty', 'poaHealth'];
  }

  return base;
}
