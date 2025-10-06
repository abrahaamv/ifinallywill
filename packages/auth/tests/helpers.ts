/**
 * Test Helpers for Auth Package
 *
 * Utilities for creating mock sessions, tenants, and test data.
 */

import type { Session } from 'next-auth';

/**
 * Test tenant IDs (consistent UUIDs for testing)
 */
export const TEST_TENANT_IDS = {
	tenant1: '11111111-1111-4111-8111-111111111111',
	tenant2: '22222222-2222-4222-8222-222222222222',
	tenant3: '33333333-3333-4333-8333-333333333333',
	invalidUuid: 'not-a-uuid',
	invalidFormat: '12345678-1234-1234-1234-123456789012', // Valid UUID but wrong version
} as const;

/**
 * Create mock Auth.js session with tenant context
 */
export function createMockSession(
	tenantId: string,
	userId = 'test-user-id',
	role: 'owner' | 'admin' | 'member' = 'member',
	email = 'test@example.com',
): Session {
	return {
		user: {
			id: userId,
			email,
			name: 'Test User',
			tenantId,
			role,
		},
		expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
	};
}

/**
 * Create mock Request object
 */
export function createMockRequest(headers: Record<string, string> = {}): Request {
	return new Request('http://localhost:3001/api/test', {
		method: 'GET',
		headers: new Headers(headers),
	});
}
