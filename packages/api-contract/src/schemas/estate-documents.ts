/**
 * IFinallyWill: Estate Document Zod Schemas
 *
 * Shared validation schemas for will data sections.
 * Used by both tRPC routers (server) and react-hook-form (client).
 */

import { z } from 'zod';

// ==================== PERSONAL INFO ====================

export const personalInfoSchema = z.object({
	fullName: z.string().min(1, 'Full name is required'),
	email: z.string().email('Invalid email'),
	city: z.string().min(1, 'City is required'),
	province: z.string().min(1, 'Province is required'),
	country: z.string().default('Canada'),
	phone: z.string().optional(),
	gender: z.enum(['male', 'female', 'other']).optional(),
	dateOfBirth: z.string().optional(),
});

// ==================== SPOUSE INFO ====================

export const spouseInfoSchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	city: z.string().optional(),
	province: z.string().optional(),
	country: z.string().optional(),
});

// ==================== EXECUTORS ====================

export const executorEntrySchema = z.object({
	keyNameId: z.string().uuid(),
	position: z.enum(['primary', 'alternate', 'backup']),
});

export const executorsSchema = z.array(executorEntrySchema).min(1, 'At least one executor is required');

// ==================== RESIDUE ====================
// v6: 3 modes — bloodline string, custom clause, or specific beneficiaries

export const residueBeneficiarySchema = z.object({
	beneficiary: z.string().min(1), // Name or keyNameId
	backup: z.string().optional(),
	type: z.enum(['per_stirpes', 'per_capita']).optional(),
	shares: z.number().int().min(1).optional(),
	isOrganization: z.boolean().optional(),
});

export const residueSchema = z.object({
	selected: z.string().min(1), // Bloodline option text, "Custom Clause", or "Specific Beneficiaries"
	beneficiary: z.array(residueBeneficiarySchema).optional(), // For "Specific Beneficiaries"
	clause: z.string().optional(), // For "Custom Clause"
});

// ==================== WIPEOUT ====================
// v6: 4 modes — 2 family options (dynamic), specific beneficiary, or TBD

export const wipeoutBeneficiarySchema = z.object({
	beneficiary: z.string().min(1),
	backup: z.string().optional(),
	type: z.enum(['per_stirpes', 'per_capita']).optional(),
	shares: z.number().int().min(1).optional(),
	isOrganization: z.boolean().optional(),
});

export const wipeoutSchema = z.object({
	selectedCategory: z.string().optional(), // Family option text or "specific" or "tbd"
	selectedOption: z.string().optional(), // The display text of the selected option
	table_dataBequest: z.array(wipeoutBeneficiarySchema).optional(),
	availableShares: z.number().int().min(0).max(100).optional(),
});

// ==================== TRUSTING ====================

export const trustingEntrySchema = z.object({
	childKeyNameId: z.string().uuid(),
	age: z.number().int().min(18).max(30),
	shares: z.number().optional(),
	trustees: z.array(z.string().uuid()),
});

export const trustingSchema = z.array(trustingEntrySchema);

// ==================== GUARDIANS ====================

export const guardianEntrySchema = z.object({
	keyNameId: z.string().uuid(),
	position: z.enum(['primary', 'alternate']),
	childKeyNameIds: z.array(z.string().uuid()),
});

export const guardiansSchema = z.array(guardianEntrySchema);

// ==================== PETS ====================

export const petEntrySchema = z.object({
	name: z.string().min(1, 'Pet name is required'),
	type: z.string().min(1, 'Pet type is required'),
	breed: z.string().optional(),
	amount: z.number().int().min(0).optional(),
	guardianKeyNameId: z.string().uuid(),
	backupKeyNameId: z.string().uuid().optional(),
});

export const petsSchema = z.array(petEntrySchema);

// ==================== ADDITIONAL ====================
// v6: finalRestingPlace (6 card options), customClauseText, otherWishes (string[])

export const additionalSchema = z.object({
	finalRestingPlace: z.enum(['cremation', 'burial', 'mausoleum', 'donate', 'green', 'family']).optional(),
	customClauseText: z.string().optional(),
	otherWishes: z.array(z.string()).optional(),
	organDonation: z.boolean().optional(),
});

// ==================== FINAL DETAILS ====================

export const finalDetailsSchema = z.object({
	witnessOne: z.string().optional(),
	witnessTwo: z.string().optional(),
	signingLocation: z.string().optional(),
	signingDate: z.string().optional(),
});

// ==================== MARITAL STATUS ====================

export const maritalStatusSchema = z.enum(['married', 'single', 'common_law']);

// ==================== DOCUMENT-LEVEL SCHEMAS ====================

export const documentTypeSchema = z.enum(['primary_will', 'secondary_will', 'poa_property', 'poa_health']);

export const documentStatusSchema = z.enum(['draft', 'in_progress', 'complete', 'expired']);

export const createEstateDocumentSchema = z.object({
	documentType: documentTypeSchema,
	province: z.string().min(1, 'Province is required'),
	country: z.string().default('Canada'),
});

export const updateEstateDocumentStatusSchema = z.object({
	id: z.string().uuid(),
	status: documentStatusSchema,
});

// ==================== WILL DATA UPDATE (per-section) ====================

export const updateWillSectionSchema = z.object({
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
	data: z.unknown(), // Validated per-section in router
});
