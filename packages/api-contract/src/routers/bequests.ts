/**
 * Bequests Router
 *
 * Manage gift assignments: which assets go to which people, with share percentages.
 * Bequests are per-document (not user-level).
 */

import { z } from 'zod';
import { protectedProcedure, protectedMutation, router } from '../trpc';
import { bequests, estateDocuments } from '@platform/db';
import { eq, and } from 'drizzle-orm';
import { notFound, badRequest } from '@platform/shared';
import { setBequestSchema } from '../schemas/assets';

export const bequestsRouter = router({
	/**
	 * Set (upsert) a bequest for an asset in a document
	 * Replaces any existing bequest for the same asset+doc combo
	 */
	set: protectedMutation
		.input(setBequestSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify document ownership
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.estateDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			// Validate shares total <= 100
			const totalPct = input.shares.reduce((sum, s) => sum + s.percentage, 0);
			if (totalPct > 100) {
				throw badRequest({ message: 'Share percentages cannot exceed 100%' });
			}

			// Check for existing bequest for this asset+doc
			const existing = await ctx.db.query.bequests.findFirst({
				where: and(
					eq(bequests.estateDocId, input.estateDocId),
					eq(bequests.assetId, input.assetId),
				),
			});

			const sharesData = input.shares as Array<{ keyNameId: string; percentage: number }>;

			if (existing) {
				// Update existing
				const [updated] = await ctx.db
					.update(bequests)
					.set({
						shares: sharesData,
						updatedAt: new Date(),
					})
					.where(eq(bequests.id, existing.id))
					.returning();

				return updated;
			}

			// Create new
			const [created] = await ctx.db
				.insert(bequests)
				.values({
					estateDocId: input.estateDocId,
					assetId: input.assetId,
					tenantId: ctx.tenantId,
					shares: sharesData,
				})
				.returning();

			return created;
		}),

	/**
	 * Delete a bequest
	 */
	delete: protectedMutation
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Verify ownership via document
			const bequest = await ctx.db.query.bequests.findFirst({
				where: eq(bequests.id, input.id),
				with: { estateDocument: true },
			});

			if (!bequest) {
				throw notFound({ message: 'Bequest not found' });
			}

			if (bequest.estateDocument.userId !== ctx.userId) {
				throw notFound({ message: 'Bequest not found' });
			}

			await ctx.db.delete(bequests).where(eq(bequests.id, input.id));

			return { deleted: true };
		}),

	/**
	 * List all bequests for a document
	 */
	listByDoc: protectedProcedure
		.input(z.object({ estateDocId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			// Verify document ownership
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.estateDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			return ctx.db.query.bequests.findMany({
				where: eq(bequests.estateDocId, input.estateDocId),
				with: {
					asset: {
						with: {
							assetClass: true,
						},
					},
				},
				orderBy: (b, { desc }) => [desc(b.createdAt)],
			});
		}),
});
