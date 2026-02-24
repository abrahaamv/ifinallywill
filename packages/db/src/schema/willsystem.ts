/**
 * IFinallyWill Database Schema
 *
 * Estate planning document management: wills, POAs, assets, bequests,
 * partners, discount codes, document generation, and payment tracking.
 *
 * Architecture:
 * - Document Portfolio model: each user has independent estate_documents
 * - People Pool: key_names shared across all documents (user-level)
 * - Section-based jsonb columns for will_data/poa_data (not one giant blob)
 * - Partners are affiliates (separate from tenants)
 */

import { relations } from 'drizzle-orm';
import {
	pgTable,
	uuid,
	text,
	timestamp,
	jsonb,
	integer,
	serial,
	boolean,
	date,
	index,
} from 'drizzle-orm/pg-core';
import { tenants, users, apiKeys } from './index';

// ==================== ENUMS (via text + enum constraint) ====================

// Using Drizzle's text enum pattern (consistent with existing schemas)
const documentTypeEnum = ['primary_will', 'secondary_will', 'poa_property', 'poa_health'] as const;
const documentStatusEnum = ['draft', 'in_progress', 'complete', 'expired'] as const;
const maritalStatusEnum = ['married', 'single', 'common_law'] as const;
const activationTypeEnum = ['immediate', 'incapacity'] as const;
const orderStatusEnum = ['pending', 'paid', 'generated', 'downloaded', 'expired'] as const;
const partnerStatusEnum = ['active', 'suspended', 'pending'] as const;
const relationshipEnum = [
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
] as const;
const willTypeEnum = ['primary', 'secondary'] as const;
const rateLimitTierEnum = ['basic', 'standard', 'premium'] as const;

// ==================== KEY NAMES (People Pool) ====================

export const keyNames = pgTable(
	'key_names',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		firstName: text('first_name').notNull(),
		middleName: text('middle_name'),
		lastName: text('last_name').notNull(),
		relationship: text('relationship', { enum: relationshipEnum }).notNull(),
		email: text('email'),
		phone: text('phone'),
		city: text('city'),
		province: text('province'),
		country: text('country'),
		gender: text('gender'),
		dateOfBirth: date('date_of_birth'),
		isBlendedFamily: boolean('is_blended_family').notNull().default(false),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		userIdx: index('key_names_user_idx').on(table.userId),
		tenantIdx: index('key_names_tenant_idx').on(table.tenantId),
	}),
);

// ==================== ESTATE DOCUMENTS ====================

export const estateDocuments = pgTable(
	'estate_documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		coupleDocId: uuid('couple_doc_id'), // Self-ref added in relations
		documentType: text('document_type', { enum: documentTypeEnum }).notNull(),
		province: text('province').notNull(),
		country: text('country').notNull().default('Canada'),
		status: text('status', { enum: documentStatusEnum }).notNull().default('draft'),
		completionPct: integer('completion_pct').notNull().default(0),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		userIdx: index('estate_documents_user_idx').on(table.userId),
		tenantIdx: index('estate_documents_tenant_idx').on(table.tenantId),
		typeIdx: index('estate_documents_type_idx').on(table.documentType),
		statusIdx: index('estate_documents_status_idx').on(table.status),
		coupleIdx: index('estate_documents_couple_idx').on(table.coupleDocId),
	}),
);

// ==================== WILL DATA ====================

export const willData = pgTable(
	'will_data',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		estateDocId: uuid('estate_doc_id')
			.notNull()
			.unique()
			.references(() => estateDocuments.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),

		// Section-based jsonb columns (save only the changed section)
		personalInfo: jsonb('personal_info').$type<{
			fullName: string;
			email: string;
			city: string;
			province: string;
			country: string;
			phone?: string;
			dateOfBirth?: string;
		}>(),
		maritalStatus: text('marital_status', { enum: maritalStatusEnum }),
		spouseInfo: jsonb('spouse_info').$type<{
			firstName: string;
			lastName: string;
			email?: string;
			phone?: string;
			city?: string;
			province?: string;
			country?: string;
		}>(),
		executors: jsonb('executors').$type<
			Array<{
				keyNameId: string;
				position: 'primary' | 'alternate' | 'backup';
			}>
		>(),
		residue: jsonb('residue').$type<{
			type: 'equal_split' | 'percentage' | 'specific';
			distribution: Array<{
				keyNameId: string;
				percentage?: number;
				description?: string;
			}>;
		}>(),
		wipeout: jsonb('wipeout').$type<{
			entries: Array<{
				keyNameId: string;
				description: string;
			}>;
		}>(),
		trusting: jsonb('trusting').$type<
			Array<{
				childKeyNameId: string;
				age: number;
				shares?: number;
				trustees: string[]; // keyNameId[]
			}>
		>(),
		guardians: jsonb('guardians').$type<
			Array<{
				keyNameId: string;
				position: 'primary' | 'alternate';
				childKeyNameIds: string[];
			}>
		>(),
		pets: jsonb('pets').$type<
			Array<{
				name: string;
				type: string;
				breed?: string;
				amount?: number;
				guardianKeyNameId: string;
				backupKeyNameId?: string;
			}>
		>(),
		additional: jsonb('additional').$type<{
			organDonation?: boolean;
			burial?: string;
			specialWishes?: string;
		}>(),
		finalDetails: jsonb('final_details').$type<{
			witnessOne?: string;
			witnessTwo?: string;
			signingLocation?: string;
			signingDate?: string;
		}>(),
		completedSteps: jsonb('completed_steps').$type<string[]>().default([]),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		estateDocIdx: index('will_data_estate_doc_idx').on(table.estateDocId),
		tenantIdx: index('will_data_tenant_idx').on(table.tenantId),
	}),
);

// ==================== POA DATA ====================

export const poaData = pgTable(
	'poa_data',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		estateDocId: uuid('estate_doc_id')
			.notNull()
			.unique()
			.references(() => estateDocuments.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),

		personalInfo: jsonb('personal_info').$type<{
			fullName: string;
			email: string;
			city: string;
			province: string;
			country: string;
			phone?: string;
			dateOfBirth?: string;
		}>(),
		primaryAgent: uuid('primary_agent').references(() => keyNames.id),
		jointAgent: uuid('joint_agent').references(() => keyNames.id),
		backupAgents: jsonb('backup_agents').$type<string[]>().default([]), // keyNameId[]
		restrictions: text('restrictions'),
		activationType: text('activation_type', { enum: activationTypeEnum }),
		completedSteps: jsonb('completed_steps').$type<string[]>().default([]),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		estateDocIdx: index('poa_data_estate_doc_idx').on(table.estateDocId),
		tenantIdx: index('poa_data_tenant_idx').on(table.tenantId),
	}),
);

// ==================== POA HEALTH DETAILS ====================

export const poaHealthDetails = pgTable(
	'poa_health_details',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		poaDataId: uuid('poa_data_id')
			.notNull()
			.unique()
			.references(() => poaData.id, { onDelete: 'cascade' }),
		organDonation: boolean('organ_donation').notNull().default(false),
		dnr: boolean('dnr').notNull().default(false),
		statements: jsonb('statements').$type<{
			terminalCondition?: string;
			unconsciousCondition?: string;
			mentalImpairment?: string;
			otherDirectives?: string;
		}>(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		poaDataIdx: index('poa_health_details_poa_data_idx').on(table.poaDataId),
	}),
);

// ==================== ASSETS ====================

export const assetClasses = pgTable(
	'asset_classes',
	{
		id: serial('id').primaryKey(),
		classNumber: integer('class_number').notNull().unique(),
		name: text('name').notNull(),
		fieldSchema: jsonb('field_schema').$type<
			Array<{
				name: string;
				label: string;
				type: 'text' | 'number' | 'currency' | 'select' | 'textarea';
				required?: boolean;
				options?: string[];
				placeholder?: string;
			}>
		>(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
);

export const estateAssets = pgTable(
	'estate_assets',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		assetClassId: integer('asset_class_id')
			.notNull()
			.references(() => assetClasses.id),
		willType: text('will_type', { enum: willTypeEnum }).notNull().default('primary'),
		details: jsonb('details').$type<Record<string, unknown>>(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		userIdx: index('estate_assets_user_idx').on(table.userId),
		tenantIdx: index('estate_assets_tenant_idx').on(table.tenantId),
		classIdx: index('estate_assets_class_idx').on(table.assetClassId),
	}),
);

// ==================== BEQUESTS ====================

export const bequests = pgTable(
	'bequests',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		estateDocId: uuid('estate_doc_id')
			.notNull()
			.references(() => estateDocuments.id, { onDelete: 'cascade' }),
		assetId: uuid('asset_id')
			.notNull()
			.references(() => estateAssets.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		shares: jsonb('shares')
			.notNull()
			.$type<
				Array<{
					keyNameId: string;
					percentage: number;
				}>
			>(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		estateDocIdx: index('bequests_estate_doc_idx').on(table.estateDocId),
		assetIdx: index('bequests_asset_idx').on(table.assetId),
		tenantIdx: index('bequests_tenant_idx').on(table.tenantId),
	}),
);

// ==================== DOCUMENT TYPES & TEMPLATES ====================

export const documentTypes = pgTable(
	'document_types',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		displayName: text('display_name').notNull(),
		description: text('description'),
		province: text('province'), // NULL = all provinces
		country: text('country').notNull().default('Canada'),
		basePrice: integer('base_price').notNull(), // in cents
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		nameProvinceIdx: index('document_types_name_province_idx').on(table.name, table.province),
	}),
);

export const templateVersions = pgTable(
	'template_versions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		documentTypeId: integer('document_type_id')
			.notNull()
			.references(() => documentTypes.id),
		content: text('content').notNull(), // HTML template with variable placeholders
		version: integer('version').notNull(),
		isActive: boolean('is_active').notNull().default(false),
		notes: text('notes'),
		createdById: uuid('created_by_id').references(() => users.id),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		docTypeIdx: index('template_versions_doc_type_idx').on(table.documentTypeId),
		activeIdx: index('template_versions_active_idx').on(table.documentTypeId, table.isActive),
	}),
);

// ==================== ORDERS & PAYMENTS ====================

export const documentOrders = pgTable(
	'document_orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		discountCodeId: uuid('discount_code_id').references(() => discountCodes.id),
		status: text('status', { enum: orderStatusEnum }).notNull().default('pending'),
		subtotal: integer('subtotal').notNull(), // cents
		discountAmount: integer('discount_amount').notNull().default(0), // cents
		finalPrice: integer('final_price').notNull(), // cents
		stripeSessionId: text('stripe_session_id'),
		stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
		paidAt: timestamp('paid_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		userIdx: index('document_orders_user_idx').on(table.userId),
		tenantIdx: index('document_orders_tenant_idx').on(table.tenantId),
		statusIdx: index('document_orders_status_idx').on(table.status),
		stripeIdx: index('document_orders_stripe_idx').on(table.stripePaymentIntentId),
	}),
);

export const documentOrderItems = pgTable(
	'document_order_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => documentOrders.id, { onDelete: 'cascade' }),
		estateDocId: uuid('estate_doc_id')
			.notNull()
			.references(() => estateDocuments.id),
		documentTypeId: integer('document_type_id')
			.notNull()
			.references(() => documentTypes.id),
		unitPrice: integer('unit_price').notNull(), // cents
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		orderIdx: index('document_order_items_order_idx').on(table.orderId),
	}),
);

export const generatedDocuments = pgTable(
	'generated_documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => documentOrders.id, { onDelete: 'cascade' }),
		documentTypeId: integer('document_type_id')
			.notNull()
			.references(() => documentTypes.id),
		estateDocId: uuid('estate_doc_id')
			.notNull()
			.references(() => estateDocuments.id),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		htmlContent: text('html_content').notNull(),
		fileKey: text('file_key'), // S3/storage key for PDF
		generatedAt: timestamp('generated_at').notNull().defaultNow(),
	},
	(table) => ({
		orderIdx: index('generated_documents_order_idx').on(table.orderId),
		estateDocIdx: index('generated_documents_estate_doc_idx').on(table.estateDocId),
		tenantIdx: index('generated_documents_tenant_idx').on(table.tenantId),
	}),
);

// ==================== PARTNERS ====================

export const partners = pgTable(
	'partners',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		subdomain: text('subdomain').notNull().unique(),
		contactEmail: text('contact_email').notNull(),
		contactName: text('contact_name'),
		logoUrl: text('logo_url'),
		primaryColor: text('primary_color').default('#2CC78C'),
		status: text('status', { enum: partnerStatusEnum }).notNull().default('pending'),
		defaultDiscountPct: integer('default_discount_pct').notNull().default(0),
		revenueSharePct: integer('revenue_share_pct').notNull().default(0),
		creditsBalance: integer('credits_balance').notNull().default(0), // cents
		totalEarnings: integer('total_earnings').notNull().default(0), // cents
		totalDocumentsGiven: integer('total_documents_given').notNull().default(0),
		outstandingBalance: integer('outstanding_balance').notNull().default(0), // cents
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		tenantIdx: index('partners_tenant_idx').on(table.tenantId),
		subdomainIdx: index('partners_subdomain_idx').on(table.subdomain),
		statusIdx: index('partners_status_idx').on(table.status),
	}),
);

// ==================== DISCOUNT CODES ====================

export const discountCodes = pgTable(
	'discount_codes',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		partnerId: uuid('partner_id')
			.notNull()
			.references(() => partners.id, { onDelete: 'cascade' }),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		code: text('code').notNull().unique(),
		description: text('description'),
		discountPct: integer('discount_pct').notNull(),
		isFree: boolean('is_free').notNull().default(false),
		maxUses: integer('max_uses'),
		currentUses: integer('current_uses').notNull().default(0),
		isActive: boolean('is_active').notNull().default(true),
		expiresAt: timestamp('expires_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		partnerIdx: index('discount_codes_partner_idx').on(table.partnerId),
		tenantIdx: index('discount_codes_tenant_idx').on(table.tenantId),
		codeIdx: index('discount_codes_code_idx').on(table.code),
	}),
);

// ==================== CODE USAGES ====================

export const codeUsages = pgTable(
	'code_usages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		codeId: uuid('code_id')
			.notNull()
			.references(() => discountCodes.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		orderId: uuid('order_id')
			.notNull()
			.references(() => documentOrders.id),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		discountAmount: integer('discount_amount').notNull(), // cents saved by user
		partnerEarnings: integer('partner_earnings').notNull(), // cents earned by partner
		partnerCost: integer('partner_cost').notNull().default(0), // cents partner owes (free docs)
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		codeIdx: index('code_usages_code_idx').on(table.codeId),
		userIdx: index('code_usages_user_idx').on(table.userId),
		orderIdx: index('code_usages_order_idx').on(table.orderId),
		tenantIdx: index('code_usages_tenant_idx').on(table.tenantId),
	}),
);

// ==================== API TENANTS ====================

export const apiTenants = pgTable(
	'api_tenants',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		contactEmail: text('contact_email').notNull(),
		apiKeyId: uuid('api_key_id').references(() => apiKeys.id),
		status: text('status', { enum: partnerStatusEnum }).notNull().default('pending'),
		rateLimitTier: text('rate_limit_tier', { enum: rateLimitTierEnum }).notNull().default('basic'),
		usageThisMonth: integer('usage_this_month').notNull().default(0),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => ({
		tenantIdx: index('api_tenants_tenant_idx').on(table.tenantId),
		apiKeyIdx: index('api_tenants_api_key_idx').on(table.apiKeyId),
	}),
);

// ==================== RELATIONS ====================

export const keyNamesRelations = relations(keyNames, ({ one }) => ({
	user: one(users, {
		fields: [keyNames.userId],
		references: [users.id],
	}),
	tenant: one(tenants, {
		fields: [keyNames.tenantId],
		references: [tenants.id],
	}),
}));

export const estateDocumentsRelations = relations(estateDocuments, ({ one, many }) => ({
	user: one(users, {
		fields: [estateDocuments.userId],
		references: [users.id],
	}),
	tenant: one(tenants, {
		fields: [estateDocuments.tenantId],
		references: [tenants.id],
	}),
	willData: one(willData),
	poaData: one(poaData),
	bequests: many(bequests),
	orderItems: many(documentOrderItems),
	generatedDocuments: many(generatedDocuments),
}));

export const willDataRelations = relations(willData, ({ one }) => ({
	estateDocument: one(estateDocuments, {
		fields: [willData.estateDocId],
		references: [estateDocuments.id],
	}),
	tenant: one(tenants, {
		fields: [willData.tenantId],
		references: [tenants.id],
	}),
}));

export const poaDataRelations = relations(poaData, ({ one }) => ({
	estateDocument: one(estateDocuments, {
		fields: [poaData.estateDocId],
		references: [estateDocuments.id],
	}),
	tenant: one(tenants, {
		fields: [poaData.tenantId],
		references: [tenants.id],
	}),
	primaryAgentPerson: one(keyNames, {
		fields: [poaData.primaryAgent],
		references: [keyNames.id],
		relationName: 'primaryAgent',
	}),
	jointAgentPerson: one(keyNames, {
		fields: [poaData.jointAgent],
		references: [keyNames.id],
		relationName: 'jointAgent',
	}),
	healthDetails: one(poaHealthDetails),
}));

export const poaHealthDetailsRelations = relations(poaHealthDetails, ({ one }) => ({
	poaData: one(poaData, {
		fields: [poaHealthDetails.poaDataId],
		references: [poaData.id],
	}),
}));

export const assetClassesRelations = relations(assetClasses, ({ many }) => ({
	assets: many(estateAssets),
}));

export const estateAssetsRelations = relations(estateAssets, ({ one, many }) => ({
	user: one(users, {
		fields: [estateAssets.userId],
		references: [users.id],
	}),
	tenant: one(tenants, {
		fields: [estateAssets.tenantId],
		references: [tenants.id],
	}),
	assetClass: one(assetClasses, {
		fields: [estateAssets.assetClassId],
		references: [assetClasses.id],
	}),
	bequests: many(bequests),
}));

export const bequestsRelations = relations(bequests, ({ one }) => ({
	estateDocument: one(estateDocuments, {
		fields: [bequests.estateDocId],
		references: [estateDocuments.id],
	}),
	asset: one(estateAssets, {
		fields: [bequests.assetId],
		references: [estateAssets.id],
	}),
	tenant: one(tenants, {
		fields: [bequests.tenantId],
		references: [tenants.id],
	}),
}));

export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
	templateVersions: many(templateVersions),
	orderItems: many(documentOrderItems),
	generatedDocuments: many(generatedDocuments),
}));

export const templateVersionsRelations = relations(templateVersions, ({ one }) => ({
	documentType: one(documentTypes, {
		fields: [templateVersions.documentTypeId],
		references: [documentTypes.id],
	}),
	createdBy: one(users, {
		fields: [templateVersions.createdById],
		references: [users.id],
	}),
}));

export const documentOrdersRelations = relations(documentOrders, ({ one, many }) => ({
	user: one(users, {
		fields: [documentOrders.userId],
		references: [users.id],
	}),
	tenant: one(tenants, {
		fields: [documentOrders.tenantId],
		references: [tenants.id],
	}),
	discountCode: one(discountCodes, {
		fields: [documentOrders.discountCodeId],
		references: [discountCodes.id],
	}),
	items: many(documentOrderItems),
	generatedDocuments: many(generatedDocuments),
}));

export const documentOrderItemsRelations = relations(documentOrderItems, ({ one }) => ({
	order: one(documentOrders, {
		fields: [documentOrderItems.orderId],
		references: [documentOrders.id],
	}),
	estateDocument: one(estateDocuments, {
		fields: [documentOrderItems.estateDocId],
		references: [estateDocuments.id],
	}),
	documentType: one(documentTypes, {
		fields: [documentOrderItems.documentTypeId],
		references: [documentTypes.id],
	}),
}));

export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
	order: one(documentOrders, {
		fields: [generatedDocuments.orderId],
		references: [documentOrders.id],
	}),
	documentType: one(documentTypes, {
		fields: [generatedDocuments.documentTypeId],
		references: [documentTypes.id],
	}),
	estateDocument: one(estateDocuments, {
		fields: [generatedDocuments.estateDocId],
		references: [estateDocuments.id],
	}),
	tenant: one(tenants, {
		fields: [generatedDocuments.tenantId],
		references: [tenants.id],
	}),
}));

export const partnersRelations = relations(partners, ({ one, many }) => ({
	tenant: one(tenants, {
		fields: [partners.tenantId],
		references: [tenants.id],
	}),
	discountCodes: many(discountCodes),
}));

export const discountCodesRelations = relations(discountCodes, ({ one, many }) => ({
	partner: one(partners, {
		fields: [discountCodes.partnerId],
		references: [partners.id],
	}),
	tenant: one(tenants, {
		fields: [discountCodes.tenantId],
		references: [tenants.id],
	}),
	usages: many(codeUsages),
	orders: many(documentOrders),
}));

export const codeUsagesRelations = relations(codeUsages, ({ one }) => ({
	code: one(discountCodes, {
		fields: [codeUsages.codeId],
		references: [discountCodes.id],
	}),
	user: one(users, {
		fields: [codeUsages.userId],
		references: [users.id],
	}),
	order: one(documentOrders, {
		fields: [codeUsages.orderId],
		references: [documentOrders.id],
	}),
	tenant: one(tenants, {
		fields: [codeUsages.tenantId],
		references: [tenants.id],
	}),
}));

export const apiTenantsRelations = relations(apiTenants, ({ one }) => ({
	tenant: one(tenants, {
		fields: [apiTenants.tenantId],
		references: [tenants.id],
	}),
	apiKey: one(apiKeys, {
		fields: [apiTenants.apiKeyId],
		references: [apiKeys.id],
	}),
}));
