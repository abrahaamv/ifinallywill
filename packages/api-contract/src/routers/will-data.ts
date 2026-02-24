/**
 * Will Data Router
 *
 * Per-section updates for will documents.
 * Each section is a separate jsonb column — only the changed section is written.
 */

import { z } from 'zod';
import { protectedProcedure, protectedMutation, router } from '../trpc';
import { willData, estateDocuments } from '@platform/db';
import { eq, and } from 'drizzle-orm';
import { notFound, badRequest } from '@platform/shared';
import {
	personalInfoSchema,
	spouseInfoSchema,
	executorsSchema,
	residueSchema,
	wipeoutSchema,
	trustingSchema,
	guardiansSchema,
	petsSchema,
	additionalSchema,
	finalDetailsSchema,
	maritalStatusSchema,
} from '../schemas/estate-documents';

const sectionSchemas = {
	personalInfo: personalInfoSchema,
	maritalStatus: maritalStatusSchema,
	spouseInfo: spouseInfoSchema,
	executors: executorsSchema,
	residue: residueSchema,
	wipeout: wipeoutSchema,
	trusting: trustingSchema,
	guardians: guardiansSchema,
	pets: petsSchema,
	additional: additionalSchema,
	finalDetails: finalDetailsSchema,
} as const;

type SectionName = keyof typeof sectionSchemas;

export const willDataRouter = router({
	/**
	 * Get will data for a document
	 */
	get: protectedProcedure
		.input(z.object({ estateDocId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			// Verify ownership via estate_documents
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.estateDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			const data = await ctx.db.query.willData.findFirst({
				where: eq(willData.estateDocId, input.estateDocId),
			});

			if (!data) {
				throw notFound({ message: 'Will data not found' });
			}

			return data;
		}),

	/**
	 * Update a single section of will data
	 * Validates data against section-specific Zod schema
	 */
	updateSection: protectedMutation
		.input(
			z.object({
				estateDocId: z.string().uuid(),
				section: z.enum([
					'personalInfo',
					'maritalStatus',
					'spouseInfo',
					'executors',
					'residue',
					'wipeout',
					'trusting',
					'guardians',
					'pets',
					'additional',
					'finalDetails',
				]),
				data: z.unknown(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.estateDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			if (doc.documentType !== 'primary_will' && doc.documentType !== 'secondary_will') {
				throw badRequest({ message: 'Document is not a will' });
			}

			// Validate section data
			const schema = sectionSchemas[input.section as SectionName];
			if (!schema) {
				throw badRequest({ message: `Unknown section: ${input.section}` });
			}

			const parsed = schema.safeParse(input.data);
			if (!parsed.success) {
				throw badRequest({
					message: `Invalid ${input.section} data: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
				});
			}

			// Get current will data to update completedSteps
			const currentData = await ctx.db.query.willData.findFirst({
				where: eq(willData.estateDocId, input.estateDocId),
			});

			if (!currentData) {
				throw notFound({ message: 'Will data not found' });
			}

			const completedSteps = [...new Set([
				...((currentData.completedSteps as string[] | null) ?? []),
				input.section,
			])];

			// Update only the changed section + completedSteps
			const updatePayload: Record<string, unknown> = {
				[input.section]: parsed.data,
				completedSteps,
				updatedAt: new Date(),
			};

			const [updated] = await ctx.db
				.update(willData)
				.set(updatePayload)
				.where(eq(willData.estateDocId, input.estateDocId))
				.returning();

			// Update completion percentage on the document
			const totalSteps = Object.keys(sectionSchemas).length;
			const completionPct = Math.round((completedSteps.length / totalSteps) * 100);

			await ctx.db
				.update(estateDocuments)
				.set({
					completionPct,
					status: completionPct > 0 ? 'in_progress' : 'draft',
					updatedAt: new Date(),
				})
				.where(eq(estateDocuments.id, input.estateDocId));

			return updated;
		}),

	/**
	 * Get completed steps for a will document
	 */
	getCompletedSteps: protectedProcedure
		.input(z.object({ estateDocId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.estateDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			const data = await ctx.db.query.willData.findFirst({
				where: eq(willData.estateDocId, input.estateDocId),
				columns: { completedSteps: true },
			});

			return {
				completedSteps: (data?.completedSteps as string[] | null) ?? [],
				completionPct: doc.completionPct,
			};
		}),
});
