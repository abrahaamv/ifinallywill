/**
 * IFinallyWill: Document Generation Router
 * Generates estate documents from templates + user data.
 *
 * Uses Handlebars-style template compilation with a data mapper
 * that transforms normalized DB data into template variables.
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure, protectedMutation } from '../trpc';
import {
  generatedDocuments,
  documentOrders,
  documentOrderItems,
  templateVersions,
  estateDocuments,
  willData as willDataTable,
  poaData as poaDataTable,
  keyNames,
} from '@platform/db';

/**
 * Simple Handlebars-like variable substitution.
 * Replaces {{variable.path}} with values from a data object.
 * For production, replace with actual Handlebars library.
 */
function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const keys = path.trim().split('.');
    let value: unknown = data;
    for (const key of keys) {
      if (value == null || typeof value !== 'object') return '';
      value = (value as Record<string, unknown>)[key];
    }
    return value != null ? String(value) : '';
  });
}

/**
 * Map DB data to flat template variables for will documents
 */
function mapWillTemplateData(
  doc: Record<string, unknown>,
  willRecord: Record<string, unknown>,
  people: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const personalInfo = willRecord.personalInfo as Record<string, string> | undefined;
  const executors = willRecord.executors as Record<string, unknown> | undefined;
  const residue = willRecord.residue as Record<string, unknown> | undefined;

  const getPersonName = (id: string | null | undefined) => {
    if (!id) return '';
    const p = people.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : '';
  };

  return {
    personalInfo: {
      fullName: personalInfo?.fullName ?? '',
      city: personalInfo?.city ?? '',
      province: personalInfo?.province ?? '',
      country: personalInfo?.country ?? 'Canada',
    },
    executors: {
      primary: getPersonName(executors?.primaryExecutor as string | undefined),
      backup: getPersonName(executors?.backupExecutor as string | undefined),
    },
    residue: {
      selected: (residue as Record<string, unknown>)?.selected ?? '',
    },
    province: doc.province ?? '',
    documentType: doc.documentType ?? '',
    generatedDate: new Date().toLocaleDateString('en-CA'),
  };
}

/**
 * Map DB data to flat template variables for POA documents
 */
function mapPoaTemplateData(
  doc: Record<string, unknown>,
  poaRecord: Record<string, unknown>,
  people: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const personalInfo = poaRecord.personalInfo as Record<string, string> | undefined;

  const getPersonName = (id: string | null | undefined) => {
    if (!id) return '';
    const p = people.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : '';
  };

  return {
    personalInfo: {
      fullName: personalInfo?.fullName ?? '',
      city: personalInfo?.city ?? '',
      province: personalInfo?.province ?? '',
    },
    primaryAgent: getPersonName(poaRecord.primaryAgent as string | undefined),
    jointAgent: getPersonName(poaRecord.jointAgent as string | undefined),
    backupAgents: ((poaRecord.backupAgents as string[]) ?? []).map(getPersonName).filter(Boolean),
    restrictions: poaRecord.restrictions ?? null,
    activationType: poaRecord.activationType ?? 'immediate',
    province: doc.province ?? '',
    documentType: doc.documentType ?? '',
    generatedDate: new Date().toLocaleDateString('en-CA'),
  };
}

/**
 * Wrap HTML content in a full document with print-ready styling
 */
function wrapHtmlForPdf(htmlContent: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: letter; margin: 1in; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 6.5in;
      margin: 0 auto;
      padding: 0;
    }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 24pt; text-transform: uppercase; }
    h2 { font-size: 14pt; margin-top: 18pt; margin-bottom: 12pt; }
    h3 { font-size: 12pt; margin-top: 12pt; margin-bottom: 8pt; }
    p { margin-bottom: 8pt; text-align: justify; }
    ol, ul { margin-bottom: 8pt; padding-left: 24pt; }
    li { margin-bottom: 4pt; }
    .signature-line {
      border-bottom: 1px solid #000;
      width: 250px;
      display: inline-block;
      margin-top: 36pt;
    }
    .signature-block { margin-top: 48pt; }
    .witness-block { margin-top: 36pt; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;
}

export const documentGenerationRouter = router({
  /** Generate a document for a specific order item */
  generate: protectedMutation
    .input(z.object({
      orderId: z.string().uuid(),
      estateDocId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify order belongs to user and is paid
      const order = await ctx.db.query.documentOrders.findFirst({
        where: and(
          eq(documentOrders.id, input.orderId),
          eq(documentOrders.tenantId, ctx.tenantId),
        ),
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'paid' && order.status !== 'generated') {
        throw new Error('Order must be paid before generating documents');
      }

      // Get order item
      const orderItem = await ctx.db.query.documentOrderItems.findFirst({
        where: and(
          eq(documentOrderItems.orderId, input.orderId),
          eq(documentOrderItems.estateDocId, input.estateDocId),
        ),
      });

      if (!orderItem) throw new Error('Document not found in this order');

      // Get the estate document
      const doc = await ctx.db.query.estateDocuments.findFirst({
        where: and(
          eq(estateDocuments.id, input.estateDocId),
          eq(estateDocuments.tenantId, ctx.tenantId),
        ),
      });

      if (!doc) throw new Error('Estate document not found');

      // Get active template
      const template = await ctx.db
        .select()
        .from(templateVersions)
        .where(
          and(
            eq(templateVersions.documentTypeId, orderItem.documentTypeId),
            eq(templateVersions.isActive, true),
          ),
        )
        .then((rows) => rows[0]);

      if (!template) throw new Error('No active template found for this document type');

      // Fetch user's people
      const people = await ctx.db
        .select()
        .from(keyNames)
        .where(eq(keyNames.userId, ctx.userId));

      // Build template data based on document type
      const isPoaDoc = doc.documentType === 'poa_property' || doc.documentType === 'poa_health';
      let templateData: Record<string, unknown>;

      if (isPoaDoc) {
        const poaRecord = await ctx.db.query.poaData.findFirst({
          where: eq(poaDataTable.estateDocId, input.estateDocId),
        });
        templateData = mapPoaTemplateData(
          doc as unknown as Record<string, unknown>,
          (poaRecord ?? {}) as Record<string, unknown>,
          people as unknown as Array<Record<string, unknown>>,
        );
      } else {
        const willRecord = await ctx.db.query.willData.findFirst({
          where: eq(willDataTable.estateDocId, input.estateDocId),
        });
        templateData = mapWillTemplateData(
          doc as unknown as Record<string, unknown>,
          (willRecord ?? {}) as Record<string, unknown>,
          people as unknown as Array<Record<string, unknown>>,
        );
      }

      // Render template
      const htmlContent = renderTemplate(template.content, templateData);

      // Store generated document
      const [generated] = await ctx.db
        .insert(generatedDocuments)
        .values({
          orderId: input.orderId,
          documentTypeId: orderItem.documentTypeId,
          estateDocId: input.estateDocId,
          tenantId: ctx.tenantId,
          htmlContent,
          fileKey: null, // PDF file key set after PDF generation
        })
        .returning();

      // Update order status to generated
      await ctx.db
        .update(documentOrders)
        .set({ status: 'generated' })
        .where(eq(documentOrders.id, input.orderId));

      return generated;
    }),

  /** Generate a PDF from a generated document's HTML content */
  generatePdf: protectedMutation
    .input(z.object({ generatedDocId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Get the generated document
      const genDoc = await ctx.db.query.generatedDocuments.findFirst({
        where: eq(generatedDocuments.id, input.generatedDocId),
      });

      if (!genDoc) throw new Error('Generated document not found');

      // Verify ownership via order
      const order = await ctx.db.query.documentOrders.findFirst({
        where: and(
          eq(documentOrders.id, genDoc.orderId),
          eq(documentOrders.tenantId, ctx.tenantId),
        ),
      });

      if (!order) throw new Error('Access denied');

      const htmlContent = (genDoc as Record<string, unknown>).htmlContent as string;
      if (!htmlContent) throw new Error('No HTML content available');

      // Generate PDF using Puppeteer
      try {
        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.default.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        const fullHtml = wrapHtmlForPdf(htmlContent, 'Estate Document');
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
          format: 'letter',
          margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' },
          printBackground: true,
        });

        await browser.close();

        // Convert to base64 for transport
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

        return { pdfBase64 };
      } catch (err) {
        // If Puppeteer is not available, return the HTML for client-side printing
        const fullHtml = wrapHtmlForPdf(htmlContent, 'Estate Document');
        return { htmlFallback: fullHtml };
      }
    }),

  /** List generated documents for the current user */
  list: protectedProcedure
    .input(z.object({ orderId: z.string().uuid().optional() }).optional())
    .query(async ({ input, ctx }) => {
      // Get all user orders first
      const userOrders = await ctx.db
        .select()
        .from(documentOrders)
        .where(
          and(
            eq(documentOrders.userId, ctx.userId),
            eq(documentOrders.tenantId, ctx.tenantId),
          ),
        );

      const orderIds = userOrders.map((o) => o.id);
      if (orderIds.length === 0) return [];

      if (input?.orderId) {
        if (!orderIds.includes(input.orderId)) return [];
        return ctx.db
          .select()
          .from(generatedDocuments)
          .where(eq(generatedDocuments.orderId, input.orderId));
      }

      // Return all generated docs across all user orders
      const results: Array<Record<string, unknown>> = [];
      for (const oid of orderIds) {
        const docs = await ctx.db
          .select()
          .from(generatedDocuments)
          .where(eq(generatedDocuments.orderId, oid));
        results.push(...(docs as unknown as Array<Record<string, unknown>>));
      }

      return results;
    }),

  /** Get a single generated document (for download/preview) */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const doc = await ctx.db.query.generatedDocuments.findFirst({
        where: eq(generatedDocuments.id, input.id),
      });

      if (!doc) throw new Error('Generated document not found');

      // Verify ownership via order
      const order = await ctx.db.query.documentOrders.findFirst({
        where: and(
          eq(documentOrders.id, doc.orderId),
          eq(documentOrders.tenantId, ctx.tenantId),
        ),
      });

      if (!order) throw new Error('Access denied');

      return doc;
    }),
});
