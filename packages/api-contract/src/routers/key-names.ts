/**
 * Key Names Router (People Pool)
 *
 * CRUD for the shared people pool. People are user-level (not document-level)
 * so the same person can be referenced across wills, POAs, and bequests.
 */

import { z } from 'zod';
import { protectedProcedure, protectedMutation, router } from '../trpc';
import { keyNames, bequests, willData, poaData } from '@platform/db';
import { eq, and, sql } from 'drizzle-orm';
import { notFound, badRequest } from '@platform/shared';
import { createKeyNameSchema, updateKeyNameSchema } from '../schemas/key-names';

export const keyNamesRouter = router({
	/**
	 * Create a new person in the people pool
	 */
	create: protectedMutation
		.input(createKeyNameSchema)
		.mutation(async ({ ctx, input }) => {
			const [person] = await ctx.db
				.insert(keyNames)
				.values({
					userId: ctx.userId,
					tenantId: ctx.tenantId,
					firstName: input.firstName,
					lastName: input.lastName,
					relationship: input.relationship,
					middleName: input.middleName,
					email: input.email,
					phone: input.phone,
					city: input.city,
					province: input.province,
					country: input.country,
					gender: input.gender,
					dateOfBirth: input.dateOfBirth,
					isBlendedFamily: input.isBlendedFamily,
				})
				.returning();

			return person;
		}),

	/**
	 * Update a person
	 */
	update: protectedMutation
		.input(updateKeyNameSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updates } = input;

			const [updated] = await ctx.db
				.update(keyNames)
				.set({
					...updates,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(keyNames.id, id),
						eq(keyNames.userId, ctx.userId),
					),
				)
				.returning();

			if (!updated) {
				throw notFound({ message: 'Person not found' });
			}

			return updated;
		}),

	/**
	 * Delete a person (checks for references first)
	 */
	delete: protectedMutation
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Check if person is referenced in bequests
			const bequestRefs = await ctx.db
				.select({ count: sql<number>`count(*)::int` })
				.from(bequests)
				.where(
					sql`${bequests.shares}::jsonb @> ${JSON.stringify([{ keyNameId: input.id }])}::jsonb`,
				);

			const refCount = bequestRefs[0]?.count ?? 0;
			if (refCount > 0) {
				throw badRequest({
					message: 'Cannot delete: this person is referenced in bequests. Remove those references first.',
				});
			}

			// Check will_data references (executors, guardians, trusting, etc.)
			const willRefs = await ctx.db
				.select({ count: sql<number>`count(*)::int` })
				.from(willData)
				.where(
					sql`(
						${willData.executors}::jsonb @> ${JSON.stringify([{ keyNameId: input.id }])}::jsonb
						OR ${willData.guardians}::jsonb @> ${JSON.stringify([{ keyNameId: input.id }])}::jsonb
						OR ${willData.trusting}::jsonb @> ${JSON.stringify([{ childKeyNameId: input.id }])}::jsonb
					)`,
				);

			const willRefCount = willRefs[0]?.count ?? 0;
			if (willRefCount > 0) {
				throw badRequest({
					message: 'Cannot delete: this person is referenced in will data. Remove those references first.',
				});
			}

			// Check POA references
			const poaRefs = await ctx.db
				.select({ count: sql<number>`count(*)::int` })
				.from(poaData)
				.where(
					sql`${poaData.primaryAgent} = ${input.id}::uuid OR ${poaData.jointAgent} = ${input.id}::uuid`,
				);

			const poaRefCount = poaRefs[0]?.count ?? 0;
			if (poaRefCount > 0) {
				throw badRequest({
					message: 'Cannot delete: this person is referenced as a POA agent. Remove those references first.',
				});
			}

			const [deleted] = await ctx.db
				.delete(keyNames)
				.where(
					and(
						eq(keyNames.id, input.id),
						eq(keyNames.userId, ctx.userId),
					),
				)
				.returning();

			if (!deleted) {
				throw notFound({ message: 'Person not found' });
			}

			return { deleted: true };
		}),

	/**
	 * List all people for the current user
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.query.keyNames.findMany({
			where: eq(keyNames.userId, ctx.userId),
			orderBy: (people, { asc }) => [asc(people.lastName), asc(people.firstName)],
		});
	}),

	/**
	 * Get a single person by ID
	 */
	get: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const person = await ctx.db.query.keyNames.findFirst({
				where: and(
					eq(keyNames.id, input.id),
					eq(keyNames.userId, ctx.userId),
				),
			});

			if (!person) {
				throw notFound({ message: 'Person not found' });
			}

			return person;
		}),
});
