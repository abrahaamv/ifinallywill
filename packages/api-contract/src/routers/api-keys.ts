/**
 * API Keys Router - Phase 8 Day 8-10
 *
 * Provides tRPC procedures for API key management (widget authentication).
 *
 * **Endpoints**:
 * - `create`: Generate new API key with scoped permissions
 * - `list`: List all API keys for current user
 * - `revoke`: Revoke API key (soft delete)
 * - `validate`: Validate API key and return permissions (internal use)
 *
 * **Security**:
 * - All endpoints require authentication (protectedProcedure)
 * - API keys hashed with SHA-256 HMAC (never stored in plaintext)
 * - API key shown only once during creation
 * - Scoped permissions (read, write, admin)
 * - IP whitelisting support
 * - Expiration dates (90 days default)
 *
 * **Usage Flow**:
 * 1. User creates API key via dashboard
 * 2. Frontend displays full key ONCE (warning: save it now!)
 * 3. Key hash stored in database with metadata
 * 4. Widget uses key in X-Api-Key header
 * 5. Server validates key via hash lookup
 * 6. User can list keys (prefix only) and revoke
 *
 * Reference: Phase 8 Week 2 (API Security)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { db, eq } from '@platform/db';
import { apiKeys } from '@platform/db';
import { ApiKeyService } from '@platform/auth';

export const apiKeysRouter = router({
	/**
	 * Create new API key
	 *
	 * Generates new API key with scoped permissions and IP whitelist.
	 * Full key returned ONCE - client must save it immediately.
	 *
	 * @param name - Human-readable key name (e.g., "Production Widget")
	 * @param type - Key type (publishable or secret)
	 * @param permissions - Scoped permissions (read, write, admin)
	 * @param ipWhitelist - Optional IP whitelist (CIDR ranges supported)
	 * @param expiresInDays - Days until expiration (default 90, max 365)
	 * @returns API key (full key + metadata)
	 *
	 * @example
	 * ```typescript
	 * const result = await trpc.apiKeys.create.mutate({
	 *   name: "Production Widget",
	 *   type: "publishable",
	 *   permissions: ["read", "write"],
	 *   ipWhitelist: ["192.168.1.0/24"],
	 *   expiresInDays: 90
	 * });
	 * // result.apiKey: "pk_live_8xK9wN4mP2qR5tY7u" (show once!)
	 * ```
	 */
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				type: z.enum(['publishable', 'secret']),
				permissions: z
					.array(z.enum(['read', 'write', 'admin']))
					.min(1)
					.refine(
						(perms) => {
							// Validate permission hierarchy
							// Admin includes write and read
							if (perms.includes('admin')) {
								return perms.includes('write') && perms.includes('read');
							}
							// Write includes read
							if (perms.includes('write')) {
								return perms.includes('read');
							}
							return true;
						},
						{ message: 'Invalid permission hierarchy (write requires read, admin requires both)' }
					),
				ipWhitelist: z.array(z.string()).optional(),
				expiresInDays: z.number().min(1).max(365).default(90),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const tenantId = ctx.session.user.tenantId;

			if (!tenantId) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: 'User must belong to a tenant to create API keys',
				});
			}

			// Generate API key
			const { apiKey, keyHash, keyPrefix } = ApiKeyService.generateApiKey(input.type);

			// Calculate expiration date
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

			// Store API key in database
			await db.insert(apiKeys).values({
				tenantId,
				name: input.name,
				keyType: input.type,
				keyHash,
				prefix: keyPrefix,
				permissions: {
					scopes: input.permissions,
					ipWhitelist: input.ipWhitelist || [],
				},
				expiresAt,
			});

			return {
				apiKey, // CRITICAL: This is the ONLY time the full key is shown
				keyPrefix,
				name: input.name,
				type: input.type,
				permissions: input.permissions,
				expiresAt,
				warning: 'Save this key immediately. It will not be shown again.',
			};
		}),

	/**
	 * List all API keys for current user
	 *
	 * Returns metadata only (no full keys).
	 * Shows key prefix for identification (e.g., pk_live_xxxxx).
	 *
	 * @returns Array of API key metadata
	 */
	list: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = ctx.session.user.tenantId;

		if (!tenantId) {
			throw new TRPCError({
				code: 'UNAUTHORIZED',
				message: 'User must belong to a tenant to list API keys',
			});
		}

		const keys = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.tenantId, tenantId))
			.orderBy(apiKeys.createdAt);

		return keys.map((key) => ({
			id: key.id,
			name: key.name,
			keyPrefix: key.prefix,
			type: key.keyType,
			permissions: (key.permissions as { scopes?: string[]; ipWhitelist?: string[] })?.scopes || [],
			ipWhitelist: (key.permissions as { scopes?: string[]; ipWhitelist?: string[] })?.ipWhitelist || [],
			expiresAt: key.expiresAt,
			revokedAt: key.revokedAt,
			createdAt: key.createdAt,
			lastUsedAt: key.lastUsedAt,
			isActive: !key.revokedAt && (!key.expiresAt || key.expiresAt > new Date()),
		}));
	}),

	/**
	 * Revoke API key
	 *
	 * Soft delete - marks key as revoked.
	 * Key cannot be un-revoked (must create new key).
	 *
	 * @param keyId - API key ID to revoke
	 * @returns Success confirmation
	 */
	revoke: protectedProcedure
		.input(
			z.object({
				keyId: z.string().uuid(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Verify key belongs to user
			const [key] = await db
				.select()
				.from(apiKeys)
				.where(eq(apiKeys.id, input.keyId))
				.limit(1);

			if (!key) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'API key not found',
				});
			}

			const tenantId = ctx.session.user.tenantId;

			if (!tenantId || key.tenantId !== tenantId) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have permission to revoke this API key',
				});
			}

			if (key.revokedAt) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'API key is already revoked',
				});
			}

			// Revoke key (soft delete)
			await db
				.update(apiKeys)
				.set({
					revokedAt: new Date(),
				})
				.where(eq(apiKeys.id, input.keyId));

			return {
				success: true,
				message: 'API key revoked successfully',
			};
		}),

	/**
	 * Validate API key (internal use)
	 *
	 * Used by server middleware to validate incoming API key requests.
	 * NOT exposed to frontend (no tRPC client binding needed).
	 *
	 * @param apiKey - Full API key to validate
	 * @returns Validation result with user/tenant context
	 */
	validate: protectedProcedure
		.input(
			z.object({
				apiKey: z.string(),
			})
		)
		.query(async ({ input }) => {
			// Validate format
			if (!ApiKeyService.isValidFormat(input.apiKey)) {
				return {
					valid: false,
					reason: 'Invalid API key format',
				};
			}

			// Hash key for database lookup
			const keyHash = ApiKeyService.hashApiKey(input.apiKey);

			// Find key in database
			const [key] = await db
				.select()
				.from(apiKeys)
				.where(eq(apiKeys.keyHash, keyHash))
				.limit(1);

			if (!key) {
				return {
					valid: false,
					reason: 'API key not found',
				};
			}

			// Check revocation
			if (key.revokedAt) {
				return {
					valid: false,
					reason: 'API key has been revoked',
				};
			}

			// Check expiration
			if (key.expiresAt && key.expiresAt < new Date()) {
				return {
					valid: false,
					reason: 'API key has expired',
				};
			}

			// Update last used timestamp
			await db
				.update(apiKeys)
				.set({
					lastUsedAt: new Date(),
				})
				.where(eq(apiKeys.id, key.id));

			const permissions = key.permissions as { scopes?: string[]; ipWhitelist?: string[] } | null;

			return {
				valid: true,
				tenantId: key.tenantId,
				permissions: permissions?.scopes || [],
				type: key.keyType,
				ipWhitelist: permissions?.ipWhitelist || [],
			};
		}),

	/**
	 * Get API key usage statistics
	 *
	 * Returns usage metrics for specific API key.
	 *
	 * @param keyId - API key ID
	 * @returns Usage statistics
	 */
	stats: protectedProcedure
		.input(
			z.object({
				keyId: z.string().uuid(),
			})
		)
		.query(async ({ input, ctx }) => {
			// Verify key belongs to user
			const [key] = await db
				.select()
				.from(apiKeys)
				.where(eq(apiKeys.id, input.keyId))
				.limit(1);

			if (!key) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'API key not found',
				});
			}

			const tenantId = ctx.session.user.tenantId;

			if (!tenantId || key.tenantId !== tenantId) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'You do not have permission to view this API key',
				});
			}

			const permissions = key.permissions as { scopes?: string[]; ipWhitelist?: string[] } | null;

			return {
				keyId: key.id,
				name: key.name,
				keyPrefix: key.prefix,
				type: key.keyType,
				createdAt: key.createdAt,
				lastUsedAt: key.lastUsedAt,
				expiresAt: key.expiresAt,
				revokedAt: key.revokedAt,
				isActive: !key.revokedAt && (!key.expiresAt || key.expiresAt > new Date()),
				permissions: permissions?.scopes || [],
				ipWhitelist: permissions?.ipWhitelist || [],
			};
		}),
});
