/**
 * IFinallyWill: Key Names (People Pool) Zod Schemas
 */

import { z } from 'zod';

export const relationshipSchema = z.enum([
	'spouse',
	'child',
	'sibling',
	'parent',
	'grandparent',
	'nibling',
	'pibling',
	'cousin',
	'friend',
	'other',
]);

export const keyNameSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string().min(1),
	middleName: z.string().nullable().optional(),
	lastName: z.string().min(1),
	relationship: relationshipSchema,
	email: z.string().email().nullable().optional(),
	phone: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	province: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	gender: z.string().nullable().optional(),
	dateOfBirth: z.string().nullable().optional(),
	isBlendedFamily: z.boolean().default(false),
});

export const createKeyNameSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	relationship: relationshipSchema,
	middleName: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	phone: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	province: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	gender: z.string().nullable().optional(),
	dateOfBirth: z.string().nullable().optional(),
	isBlendedFamily: z.boolean().default(false),
});

export const updateKeyNameSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string().min(1).optional(),
	middleName: z.string().nullable().optional(),
	lastName: z.string().min(1).optional(),
	relationship: relationshipSchema.optional(),
	email: z.string().email().nullable().optional(),
	phone: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	province: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	gender: z.string().nullable().optional(),
	dateOfBirth: z.string().nullable().optional(),
	isBlendedFamily: z.boolean().optional(),
});
