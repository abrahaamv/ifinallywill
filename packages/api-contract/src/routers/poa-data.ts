/**
 * POA Data Router
 *
 * Per-section updates for Power of Attorney documents.
 * Supports both POA Property and POA Health (with health details extension).
 */

import { z } from 'zod';
import { protectedProcedure, protectedMutation, router } from '../trpc';
import { poaData, poaHealthDetails, estateDocuments } from '@platform/db';
import { eq, and } from 'drizzle-orm';
import { notFound, badRequest } from '@platform/shared';
import { personalInfoSchema } from '../schemas/estate-documents';
import { poaAgentsSchema, poaHealthDetailsSchema } from '../schemas/poa';

const poaSectionSchemas = {
	personalInfo: personalInfoSchema,
	agents: poaAgentsSchema,
	healthDetails: poaHealthDetailsSchema,
} as const;

export const poaDataRouter = router({
	/**
	 * Get POA data for a document
	 */
	get: protectedProcedure
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

			const data = await ctx.db.query.poaData.findFirst({
				where: eq(poaData.estateDocId, input.estateDocId),
				with: {
					healthDetails: true,
					primaryAgentPerson: true,
					jointAgentPerson: true,
				},
			});

			if (!data) {
				throw notFound({ message: 'POA data not found' });
			}

			return data;
		}),

	/**
	 * Update a section of POA data
	 */
	updateSection: protectedMutation
		.input(
			z.object({
				estateDocId: z.string().uuid(),
				section: z.enum(['personalInfo', 'agents', 'restrictions', 'activationType']),
				data: z.unknown(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.estateDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			if (doc.documentType !== 'poa_property' && doc.documentType !== 'poa_health') {
				throw badRequest({ message: 'Document is not a POA' });
			}

			const currentData = await ctx.db.query.poaData.findFirst({
				where: eq(poaData.estateDocId, input.estateDocId),
			});

			if (!currentData) {
				throw notFound({ message: 'POA data not found' });
			}

			let updatePayload: Record<string, unknown> = {};

			switch (input.section) {
				case 'personalInfo': {
					const parsed = personalInfoSchema.safeParse(input.data);
					if (!parsed.success) {
						throw badRequest({
							message: `Invalid personalInfo: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
						});
					}
					updatePayload = { personalInfo: parsed.data };
					break;
				}
				case 'agents': {
					const parsed = poaAgentsSchema.safeParse(input.data);
					if (!parsed.success) {
						throw badRequest({
							message: `Invalid agents: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
						});
					}
					updatePayload = {
						primaryAgent: parsed.data.primaryAgent,
						jointAgent: parsed.data.jointAgent,
						backupAgents: parsed.data.backupAgents,
						restrictions: parsed.data.restrictions,
						activationType: parsed.data.activationType,
					};
					break;
				}
				case 'restrictions': {
					const parsed = z.string().nullable().safeParse(input.data);
					if (!parsed.success) {
						throw badRequest({ message: 'Invalid restrictions data' });
					}
					updatePayload = { restrictions: parsed.data };
					break;
				}
				case 'activationType': {
					const parsed = z.enum(['immediate', 'incapacity']).safeParse(input.data);
					if (!parsed.success) {
						throw badRequest({ message: 'Invalid activationType' });
					}
					updatePayload = { activationType: parsed.data };
					break;
				}
			}

			const completedSteps = [...new Set([
				...((currentData.completedSteps as string[] | null) ?? []),
				input.section,
			])];

			updatePayload.completedSteps = completedSteps;
			updatePayload.updatedAt = new Date();

			const [updated] = await ctx.db
				.update(poaData)
				.set(updatePayload)
				.where(eq(poaData.estateDocId, input.estateDocId))
				.returning();

			// Update completion on parent document
			const totalSteps = doc.documentType === 'poa_health' ? 5 : 4;
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
	 * Update health details (POA Health only)
	 */
	updateHealthDetails: protectedMutation
		.input(
			z.object({
				estateDocId: z.string().uuid(),
				data: poaHealthDetailsSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const doc = await ctx.db.query.estateDocuments.findFirst({
				where: and(
					eq(estateDocuments.id, input.estateDocId),
					eq(estateDocuments.userId, ctx.userId),
				),
			});

			if (!doc) {
				throw notFound({ message: 'Document not found' });
			}

			if (doc.documentType !== 'poa_health') {
				throw badRequest({ message: 'Document is not a POA Health' });
			}

			const poa = await ctx.db.query.poaData.findFirst({
				where: eq(poaData.estateDocId, input.estateDocId),
			});

			if (!poa) {
				throw notFound({ message: 'POA data not found' });
			}

			// Upsert health details
			const existing = await ctx.db.query.poaHealthDetails.findFirst({
				where: eq(poaHealthDetails.poaDataId, poa.id),
			});

			if (existing) {
				const [updated] = await ctx.db
					.update(poaHealthDetails)
					.set({
						organDonation: input.data.organDonation,
						dnr: input.data.dnr,
						statements: input.data.statements,
						updatedAt: new Date(),
					})
					.where(eq(poaHealthDetails.poaDataId, poa.id))
					.returning();
				return updated;
			}

			const [created] = await ctx.db
				.insert(poaHealthDetails)
				.values({
					poaDataId: poa.id,
					organDonation: input.data.organDonation,
					dnr: input.data.dnr,
					statements: input.data.statements,
				})
				.returning();

			// Mark healthDetails step as complete
			const completedSteps = [...new Set([
				...((poa.completedSteps as string[] | null) ?? []),
				'healthDetails',
			])];

			await ctx.db
				.update(poaData)
				.set({ completedSteps, updatedAt: new Date() })
				.where(eq(poaData.id, poa.id));

			return created;
		}),

	/**
	 * Get completed steps for a POA document
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

			const data = await ctx.db.query.poaData.findFirst({
				where: eq(poaData.estateDocId, input.estateDocId),
				columns: { completedSteps: true },
			});

			return {
				completedSteps: (data?.completedSteps as string[] | null) ?? [],
				completionPct: doc.completionPct,
			};
		}),
});
