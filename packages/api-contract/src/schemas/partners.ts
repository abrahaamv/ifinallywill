/**
 * IFinallyWill: Partners & Discount Codes Zod Schemas
 */

import { z } from 'zod';

export const partnerStatusSchema = z.enum(['active', 'suspended', 'pending']);

export const createPartnerSchema = z.object({
	name: z.string().min(1, 'Partner name is required'),
	subdomain: z
		.string()
		.min(3, 'Subdomain must be at least 3 characters')
		.max(63)
		.regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid subdomain format'),
	contactEmail: z.string().email(),
	contactName: z.string().optional(),
	logoUrl: z.string().url().optional(),
	primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
	defaultDiscountPct: z.number().int().min(0).max(100).default(0),
	revenueSharePct: z.number().int().min(0).max(100).default(0),
});

export const updatePartnerSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).optional(),
	contactEmail: z.string().email().optional(),
	contactName: z.string().nullable().optional(),
	logoUrl: z.string().url().nullable().optional(),
	primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
	status: partnerStatusSchema.optional(),
	defaultDiscountPct: z.number().int().min(0).max(100).optional(),
	revenueSharePct: z.number().int().min(0).max(100).optional(),
});

export const createDiscountCodeSchema = z.object({
	partnerId: z.string().uuid(),
	code: z
		.string()
		.min(3)
		.max(50)
		.regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric'),
	description: z.string().optional(),
	discountPct: z.number().int().min(1).max(100),
	isFree: z.boolean().default(false),
	maxUses: z.number().int().positive().optional(),
	expiresAt: z.string().datetime().optional(),
});

export const updateDiscountCodeSchema = z.object({
	id: z.string().uuid(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
	maxUses: z.number().int().positive().nullable().optional(),
	expiresAt: z.string().datetime().nullable().optional(),
});
