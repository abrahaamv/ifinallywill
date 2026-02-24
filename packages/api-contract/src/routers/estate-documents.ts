/**
 * Estate Documents Router
 *
 * CRUD for the top-level estate document entity (wills, POAs).
 * Each user has a "document portfolio" of independent estate documents.
 */

import { z } from 'zod';
import { protectedProcedure, protectedMutation, router } from '../trpc';
import { estateDocuments, willData, poaData } from '@platform/db';
import { eq, and } from 'drizzle-orm';
import { badRequest, notFound } from '@platform/shared';

export const estateDocumentsRouter = router({
	/**
	 * Create a new estate document
	 */
	create: protectedMutation
		.input(
			z.object({
				documentType: z.enum(['primary_will', 'secondary_will', 'poa_property', 'poa_health']),
				province: z.string().min(1),
				country: z.string().default('Canada'),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [doc] = await ctx.db
				.insert(estateDocuments)
				.values({
					userId: ctx.userId,
					tenantId: ctx.tenantId,
					documentType: input.documentType,
					province: input.province,
					country: input.country,
					status: 'draft',
					completionPct: 0,
				})
				.returning();

			// Initialize corresponding data table
			if (input.documentType === 'primary_will' || input.documentType === 'secondary_will') {
				await ctx.db.insert(willData).values({
					estateDocId: doc!.id,
					tenantId: ctx.tenantId,
				});
			} else {
				await ctx.db.insert(poaData).values({
					estateDocId: doc!.id,
					tenantId: ctx.tenantId,
				});
			}

			return doc;
		}),

	/**
	 * Get a single estate document by ID
	 */
	get: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.id),
					eq(estateDocuments.userId, ctx.userId),
				),
				with: {
					willData: true,
					poaData: true,
				},
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			return doc;
		}),

	/**
	 * List all estate documents for the current user
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.query.estateDocuments.findMany({
			where: eq(estateDocuments.userId, ctx.userId),
			orderBy: (docs, { desc }) => [desc(docs.createdAt)],
		});
	}),

	/**
	 * Update document status
	 */
	updateStatus: protectedMutation
		.input(
			z.object({
				id: z.string().uuid(),
				status: z.enum(['draft', 'in_progress', 'complete', 'expired']),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await ctx.db
				.update(estateDocuments)
				.set({
					status: input.status,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(estateDocuments.id, input.id),
						eq(estateDocuments.userId, ctx.userId),
					),
				)
				.returning();

			if (!updated) {
				throw notFound({ message: 'Document not found' });
			}

			return updated;
		}),

	/**
	 * Get completion progress for a document
	 */
	getProgress: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.id),
					eq(estateDocuments.userId, ctx.userId),
				),
				with: {
					willData: true,
					poaData: true,
				},
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			const isWill = doc.documentType === 'primary_will' || doc.documentType === 'secondary_will';
			const completedSteps = isWill
				? (doc.willData?.completedSteps as string[] | null) ?? []
				: (doc.poaData?.completedSteps as string[] | null) ?? [];

			return {
				documentId: doc.id,
				documentType: doc.documentType,
				status: doc.status,
				completionPct: doc.completionPct,
				completedSteps,
			};
		}),

	/**
	 * Link two documents as a couple pair
	 */
	linkCouple: protectedMutation
		.input(
			z.object({
				docId: z.string().uuid(),
				coupleDocId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.docId === input.coupleDocId) {
				throw badRequest({ message: 'Cannot link a document to itself' });
			}

			// Verify both documents exist and belong to the tenant
			const [docA, docB] = await Promise.all([
				ctx.db.query.estateDocuments.findFirst({
					where: and(
						eq(estateDocuments.id, input.docId),
						eq(estateDocuments.tenantId, ctx.tenantId),
					),
				}),
				ctx.db.query.estateDocuments.findFirst({
					where: and(
						eq(estateDocuments.id, input.coupleDocId),
						eq(estateDocuments.tenantId, ctx.tenantId),
					),
				}),
			]);

			if (!docA || !docB) {
				throw notFound({ message: 'One or both documents not found' });
			}

			if (docA.documentType !== docB.documentType) {
				throw badRequest({ message: 'Coupled documents must be the same type' });
			}

			// Link both directions
			await ctx.db
				.update(estateDocuments)
				.set({ coupleDocId: input.coupleDocId, updatedAt: new Date() })
				.where(eq(estateDocuments.id, input.docId));

			await ctx.db
				.update(estateDocuments)
				.set({ coupleDocId: input.docId, updatedAt: new Date() })
				.where(eq(estateDocuments.id, input.coupleDocId));

			return { linked: true };
		}),

	/**
	 * Create a mirror document for spouse
	 * Copies relevant data with executors swapped
	 */
	mirrorForSpouse: protectedMutation
		.input(
			z.object({
				sourceDocId: z.string().uuid(),
				spouseUserId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const sourceDoc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.sourceDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
				with: {
					willData: true,
					poaData: true,
				},
			});

			if (!sourceDoc) {
				throw notFound({ message: 'Source document not found' });
			}

			// Create mirror document for spouse
			const [mirrorDoc] = await ctx.db
				.insert(estateDocuments)
				.values({
					userId: input.spouseUserId,
					tenantId: ctx.tenantId,
					coupleDocId: sourceDoc.id,
					documentType: sourceDoc.documentType,
					province: sourceDoc.province,
					country: sourceDoc.country,
					status: 'draft',
					completionPct: 0,
				})
				.returning();

			// Link back
			await ctx.db
				.update(estateDocuments)
				.set({ coupleDocId: mirrorDoc!.id, updatedAt: new Date() })
				.where(eq(estateDocuments.id, sourceDoc.id));

			// Initialize data table for mirror
			const isWill =
				sourceDoc.documentType === 'primary_will' ||
				sourceDoc.documentType === 'secondary_will';

			if (isWill) {
				await ctx.db.insert(willData).values({
					estateDocId: mirrorDoc!.id,
					tenantId: ctx.tenantId,
				});
			} else {
				await ctx.db.insert(poaData).values({
					estateDocId: mirrorDoc!.id,
					tenantId: ctx.tenantId,
				});
			}

			return mirrorDoc;
		}),
});
