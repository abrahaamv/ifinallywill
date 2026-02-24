/**
 * IFinallyWill: Template Versions Router
 * Manages HTML templates for document generation (admin only for writes).
 */

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { templateVersions, documentTypes } from '@platform/db';

export const templateVersionsRouter = router({
  /** List all templates (with optional filter by document type) */
  list: protectedProcedure
    .input(z.object({ documentTypeId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      if (input?.documentTypeId) {
        return ctx.db
          .select()
          .from(templateVersions)
          .where(eq(templateVersions.documentTypeId, input.documentTypeId))
          .orderBy(desc(templateVersions.version));
      }
      return ctx.db.select().from(templateVersions).orderBy(desc(templateVersions.version));
    }),

  /** Get the active template for a document type */
  getActive: protectedProcedure
    .input(z.object({ documentTypeId: z.number() }))
    .query(async ({ input, ctx }) => {
      const [active] = await ctx.db
        .select()
        .from(templateVersions)
        .where(
          and(
            eq(templateVersions.documentTypeId, input.documentTypeId),
            eq(templateVersions.isActive, true),
          ),
        )
        .limit(1);

      return active ?? null;
    }),

  /** Create a new template version (admin only) */
  create: adminProcedure
    .input(z.object({
      documentTypeId: z.number(),
      content: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get next version number
      const existing = await ctx.db
        .select()
        .from(templateVersions)
        .where(eq(templateVersions.documentTypeId, input.documentTypeId))
        .orderBy(desc(templateVersions.version))
        .limit(1);

      const nextVersion = (existing[0]?.version ?? 0) + 1;

      const [created] = await ctx.db
        .insert(templateVersions)
        .values({
          documentTypeId: input.documentTypeId,
          content: input.content,
          version: nextVersion,
          isActive: false,
        })
        .returning();

      return created;
    }),

  /** Activate a specific template version (deactivates others for same type) */
  activate: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const template = await ctx.db
        .select()
        .from(templateVersions)
        .where(eq(templateVersions.id, input.id))
        .then((rows) => rows[0]);

      if (!template) throw new Error('Template not found');

      // Deactivate all other versions of same type
      await ctx.db
        .update(templateVersions)
        .set({ isActive: false })
        .where(eq(templateVersions.documentTypeId, template.documentTypeId));

      // Activate this one
      const [activated] = await ctx.db
        .update(templateVersions)
        .set({ isActive: true })
        .where(eq(templateVersions.id, input.id))
        .returning();

      return activated;
    }),

  /** List all document types (for template management UI) */
  listDocumentTypes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(documentTypes);
  }),
});
