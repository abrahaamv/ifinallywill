/**
 * PDF Service — orchestrates document generation
 *
 * Uses template-renderer for Handlebars compilation and
 * template-data-mapper for data transformation.
 * PDF generation happens server-side via tRPC; this service
 * handles the client-side preview and download flow.
 */

import { mapPoaToTemplateData, mapWillToTemplateData } from '../lib/template-data-mapper';
import { type TemplateData, type TemplateSection, renderDocument } from '../lib/template-renderer';
import type { KeyName, PoaData, WillData } from '../lib/types';

/** Supported document types for generation */
export type GeneratableDocument =
  | 'primary_will'
  | 'secondary_will'
  | 'spousal_will'
  | 'poa_property'
  | 'poa_health';

interface GenerateOptions {
  documentType: GeneratableDocument;
  province: string;
  willData?: WillData;
  poaData?: PoaData;
  people: KeyName[];
}

interface GenerateResult {
  html: string;
  templateData: Partial<TemplateData>;
}

/**
 * Maps GeneratableDocument to the template file name convention.
 */
const DOCUMENT_TYPE_TO_TEMPLATE: Record<GeneratableDocument, string> = {
  primary_will: 'primaryWill',
  secondary_will: 'secondaryWill',
  spousal_will: 'defaultWill',
  poa_property: 'poaProperty',
  poa_health: 'poaHealth',
};

/**
 * Generate a document preview as HTML.
 * Uses the Handlebars template engine client-side for preview.
 */
export async function generateDocumentPreview(options: GenerateOptions): Promise<GenerateResult> {
  const { documentType, province, willData, poaData, people } = options;

  let templateData: Partial<TemplateData>;

  if (documentType === 'poa_property' || documentType === 'poa_health') {
    if (!poaData) throw new Error('POA data required for POA documents');
    templateData = mapPoaToTemplateData(poaData, people, documentType);
  } else {
    if (!willData) throw new Error('Will data required for will documents');
    templateData = mapWillToTemplateData(willData, people, documentType);
  }

  // Load the template for the province and document type
  const sections = await loadTemplate(province, documentType);
  const html = renderDocument(sections, templateData);

  return { html, templateData };
}

/**
 * Dynamic template loader — imports provincial templates.
 * Each template file exports `sections: TemplateSection[]`.
 */
async function loadTemplate(
  province: string,
  documentType: GeneratableDocument
): Promise<TemplateSection[]> {
  const slug = province.toLowerCase().replace(/\s+/g, '-');
  const templateName = DOCUMENT_TYPE_TO_TEMPLATE[documentType];

  try {
    const templateModule = await import(`../templates/canada/${slug}/${templateName}.ts`);
    return templateModule.sections ?? [];
  } catch {
    // Fallback to Ontario templates
    try {
      const fallback = await import(`../templates/canada/ontario/${templateName}.ts`);
      return fallback.sections ?? [];
    } catch {
      return [];
    }
  }
}

/**
 * Download a generated PDF via tRPC.
 * The actual PDF rendering happens server-side.
 */
export async function downloadDocumentPdf(
  documentId: string,
  documentType: GeneratableDocument
): Promise<Blob> {
  const response = await fetch(`/api/documents/${documentId}/pdf?type=${documentType}`, {
    method: 'GET',
    headers: { Accept: 'application/pdf' },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate PDF: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Trigger a file download in the browser.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
