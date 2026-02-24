/**
 * IFinallyWill: Assets & Bequests Zod Schemas
 */

import { z } from 'zod';

export const willTypeSchema = z.enum(['primary', 'secondary']);

export const createAssetSchema = z.object({
	assetClassId: z.number().int().positive(),
	willType: willTypeSchema.default('primary'),
	details: z.record(z.unknown()).optional(),
});

export const updateAssetSchema = z.object({
	id: z.string().uuid(),
	assetClassId: z.number().int().positive().optional(),
	willType: willTypeSchema.optional(),
	details: z.record(z.unknown()).optional(),
});

export const bequestShareSchema = z.object({
	keyNameId: z.string().uuid(),
	percentage: z.number().min(0).max(100),
});

export const setBequestSchema = z.object({
	estateDocId: z.string().uuid(),
	assetId: z.string().uuid(),
	shares: z.array(bequestShareSchema).min(1),
});

export const deleteBequestSchema = z.object({
	id: z.string().uuid(),
});
