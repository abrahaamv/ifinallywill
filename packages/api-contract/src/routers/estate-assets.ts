/**
 * Estate Assets Router
 *
 * CRUD for user-level assets (shared across documents).
 * Prefixed "estate" to avoid collision with existing platform assets.
 */

import { z } from 'zod';
import { protectedProcedure, protectedMutation, router } from '../trpc';
import { estateAssets, bequests } from '@platform/db';
import { eq, and, sql } from 'drizzle-orm';
import { notFound, badRequest } from '@platform/shared';
import { createAssetSchema, updateAssetSchema } from '../schemas/assets';

export const estateAssetsRouter = router({
	/**
	 * Create a new asset
	 */
	create: protectedMutation
		.input(createAssetSchema)
		.mutation(async ({ ctx, input }) => {
			const [asset] = await ctx.db
				.insert(estateAssets)
				.values({
					userId: ctx.userId,
					tenantId: ctx.tenantId,
					assetClassId: input.assetClassId,
					willType: input.willType,
					details: input.details,
				})
				.returning();

			return asset;
		}),

	/**
	 * Update an asset
	 */
	update: protectedMutation
		.input(updateAssetSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updates } = input;

			const [updated] = await ctx.db
				.update(estateAssets)
				.set({
					...updates,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(estateAssets.id, id),
						eq(estateAssets.userId, ctx.userId),
					),
				)
				.returning();

			if (!updated) {
				throw notFound({ message: 'Asset not found' });
			}

			return updated;
		}),

	/**
	 * Delete an asset (checks for bequest references)
	 */
	delete: protectedMutation
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Check if asset has bequests
			const refs = await ctx.db
				.select({ count: sql<number>`count(*)::int` })
				.from(bequests)
				.where(eq(bequests.assetId, input.id));

			const refCount = refs[0]?.count ?? 0;
			if (refCount > 0) {
				throw badRequest({
					message: 'Cannot delete: this asset has bequests assigned. Remove them first.',
				});
			}

			const [deleted] = await ctx.db
				.delete(estateAssets)
				.where(
					and(
						eq(estateAssets.id, input.id),
						eq(estateAssets.userId, ctx.userId),
					),
				)
				.returning();

			if (!deleted) {
				throw notFound({ message: 'Asset not found' });
			}

			return { deleted: true };
		}),

	/**
	 * List all assets for the current user
	 */
	list: protectedProcedure
		.input(
			z.object({
				willType: z.enum(['primary', 'secondary']).optional(),
			}).optional(),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [eq(estateAssets.userId, ctx.userId)];

			if (input?.willType) {
				conditions.push(eq(estateAssets.willType, input.willType));
			}

			return ctx.db.query.estateAssets.findMany({
				where: and(...conditions),
				with: {
					assetClass: true,
				},
				orderBy: (assets, { desc }) => [desc(assets.createdAt)],
			});
		}),
});
