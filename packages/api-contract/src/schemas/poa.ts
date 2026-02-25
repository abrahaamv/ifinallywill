/**
 * IFinallyWill: POA Zod Schemas
 *
 * Validation schemas for Power of Attorney data.
 */

import { z } from 'zod';

// ==================== POA AGENTS ====================

export const poaAgentsSchema = z.object({
	primaryAgent: z.string().uuid(),
	jointAgent: z.string().uuid().nullable(),
	backupAgents: z.array(z.string().uuid()),
	restrictions: z.string().nullable(),
	activationType: z.enum(['immediate', 'incapacity']),
});

// ==================== POA HEALTH DETAILS ====================

export const poaHealthStatementsSchema = z.object({
	terminalCondition: z.string().optional(),
	unconsciousCondition: z.string().optional(),
	mentalImpairment: z.string().optional(),
	violentBehavior: z.string().optional(),
	painManagement: z.string().optional(),
	otherDirectives: z.string().optional(),
});

export const poaHealthDetailsSchema = z.object({
	organDonation: z.boolean().default(false),
	dnr: z.boolean().default(false),
	statements: poaHealthStatementsSchema.optional(),
});

// ==================== POA DATA UPDATE (per-section) ====================

export const updatePoaSectionSchema = z.object({
	estateDocId: z.string().uuid(),
	section: z.enum([
		'personalInfo',
		'agents',
		'restrictions',
		'activationType',
		'healthDetails',
	]),
	data: z.unknown(), // Validated per-section in router
});
