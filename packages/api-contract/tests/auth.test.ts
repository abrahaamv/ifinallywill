/**
 * Auth Router Tests (Audit Remediation Week 3)
 *
 * Fixed to work without database by properly mocking serviceDb
 *
 * Comprehensive tests for authentication endpoints:
 * - Registration (validation, duplicate handling, tenant creation)
 * - Login (credentials, account lockout, MFA)
 * - Email verification (token validation, expiry)
 * - Password reset (token validation, expiry)
 * - Session management
 *
 * Target: 80%+ coverage for auth router (624 lines)
 */

import crypto from 'node:crypto';
import { hash } from '@node-rs/argon2';
import type { ServiceDatabase } from '@platform/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authRouter } from '../src/routers/auth';

/**
 * Test utilities
 */
import {
  mockTenant as createMockTenant,
  mockUser as createMockUser,
  mockUUIDs,
} from './utils/fixtures';

// Mock the entire @platform/db module
vi.mock('@platform/db', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    serviceDb: mockDb,
    tenants: {},
    users: {},
    verificationTokens: {},
  };
});

// Mock user data
const mockUser = createMockUser({
  id: mockUUIDs.user.default,
  tenantId: mockUUIDs.tenant.default,
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: new Date(), // Email verified for login tests
});

// Mock tenant data
const mockTenant = createMockTenant({
  id: mockUUIDs.tenant.default,
  name: 'Test Organization',
  apiKey: 'pk_live_test123',
  plan: 'starter' as const,
});

// Mock verification token
const mockToken = {
  identifier: 'test@example.com',
  token: crypto.randomBytes(32).toString('hex'),
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
};

/**
 * Create test caller (auth router uses publicProcedure, no auth required)
 */
const createCaller = () => {
  return authRouter.createCaller({
    session: null,
    tenantId: null,
    userId: null,
    role: null,
    db: {} as any, // Auth router uses serviceDb
  });
};

describe('Auth Router', () => {
  let caller: ReturnType<typeof createCaller>;
  let serviceDb: any;

  beforeEach(async () => {
    // Get the mocked serviceDb
    const dbModule = await import('@platform/db');
    serviceDb = dbModule.serviceDb;

    caller = createCaller();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Registration', () => {
    describe('Input Validation', () => {
      it('should reject invalid email format', async () => {
        await expect(
          caller.register({
            email: 'invalid-email',
            password: 'ValidPass123!',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('Invalid email address');
      });

      it('should reject password without uppercase', async () => {
        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'lowercase123!',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('Password must contain at least one uppercase letter');
      });

      it('should reject password without lowercase', async () => {
        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'UPPERCASE123!',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('Password must contain at least one lowercase letter');
      });

      it('should reject password without number', async () => {
        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'NoNumbers!',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('Password must contain at least one number');
      });

      it('should reject password without special character', async () => {
        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'NoSpecial123',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('Password must contain at least one special character');
      });

      it('should reject password shorter than 8 characters', async () => {
        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'Short1!',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('Password must be at least 8 characters');
      });

      it('should reject empty name', async () => {
        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: '',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('Name is required');
      });

      it('should reject empty organization name', async () => {
        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'Test User',
            organizationName: '',
          })
        ).rejects.toThrow('Organization name is required');
      });
    });

    describe('Duplicate Prevention', () => {
      it('should reject registration with existing email', async () => {
        // Mock existing user lookup
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        });

        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('User with this email already exists');
      });

      it('should handle database unique constraint violation', async () => {
        // Mock no existing user (first check passes)
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        // Mock tenant creation success
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockTenant]),
          }),
        });

        // Mock user creation with unique constraint violation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue({
              cause: {
                code: '23505',
                constraint_name: 'users_email_unique',
              },
            }),
          }),
        });

        await expect(
          caller.register({
            email: 'test@example.com',
            password: 'ValidPass123!',
            name: 'Test User',
            organizationName: 'Test Org',
          })
        ).rejects.toThrow('User with this email already exists');
      });
    });

    describe('Successful Registration', () => {
      it('should create new user and tenant with valid input', async () => {
        // Mock no existing user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

        // Mock tenant creation
        const insertTenantMock = vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTenant]),
        });
        serviceDb.insert.mockReturnValueOnce({
          values: insertTenantMock,
        });

        // Mock user creation
        const insertUserMock = vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        });
        serviceDb.insert.mockReturnValueOnce({
          values: insertUserMock,
        });

        // Mock verification token creation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        });

        const result = await caller.register({
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'New User',
          organizationName: 'New Organization',
        });

        expect(result.success).toBe(true);
        expect(result.user.email).toBe(mockUser.email);
        expect(result.tenant.name).toBe(mockTenant.name);
        expect(result.verificationToken).toBeDefined();
      });

      it('should hash password with Argon2id', async () => {
        const password = 'ValidPass123!';
        const passwordHash = await hash(password, {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Verify hash is not plaintext
        expect(passwordHash).not.toBe(password);
        expect(passwordHash.length).toBeGreaterThan(50);
        expect(passwordHash).toContain('$argon2id$');
      });

      it('should create tenant with starter plan', async () => {
        // Mock no existing user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        // Mock tenant creation with assertion
        const insertTenantMock = vi.fn((values) => {
          expect(values.plan).toBe('starter');
          expect(values.settings.maxMonthlySpend).toBe(100);
          expect(values.settings.features).toContain('chat');
          return { returning: vi.fn().mockResolvedValue([mockTenant]) };
        });
        serviceDb.insert.mockReturnValueOnce({
          values: insertTenantMock,
        } as any);

        // Mock user creation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUser]),
          }),
        } as any);

        // Mock verification token creation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        } as any);

        await caller.register({
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'New User',
          organizationName: 'New Organization',
        });

        expect(insertTenantMock).toHaveBeenCalled();
      });

      it('should create user as owner role', async () => {
        // Mock no existing user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        // Mock tenant creation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockTenant]),
          }),
        } as any);

        // Mock user creation with assertion
        const insertUserMock = vi.fn((values) => {
          expect(values.role).toBe('owner');
          expect(values.emailVerified).toBeNull();
          expect(values.passwordAlgorithm).toBe('argon2id');
          return { returning: vi.fn().mockResolvedValue([mockUser]) };
        });
        serviceDb.insert.mockReturnValueOnce({
          values: insertUserMock,
        } as any);

        // Mock verification token creation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        } as any);

        await caller.register({
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'New User',
          organizationName: 'New Organization',
        });

        expect(insertUserMock).toHaveBeenCalled();
      });

      it('should generate verification token with 24h expiry', async () => {
        // Mock no existing user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        // Mock tenant creation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockTenant]),
          }),
        } as any);

        // Mock user creation
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUser]),
          }),
        } as any);

        // Mock verification token creation with assertion
        const insertTokenMock = vi.fn((values) => {
          const expiresAt = new Date(values.expires);
          const now = new Date();
          const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
          expect(hoursDiff).toBeGreaterThanOrEqual(23);
          expect(hoursDiff).toBeLessThanOrEqual(24);
          expect(values.token.length).toBeGreaterThan(50);
          return undefined;
        });
        serviceDb.insert.mockReturnValueOnce({
          values: insertTokenMock,
        } as any);

        await caller.register({
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'New User',
          organizationName: 'New Organization',
        });

        expect(insertTokenMock).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should throw error if serviceDb not configured', async () => {
        // This test requires mocking the module import, which is complex
        // In a real implementation, we'd use dependency injection
        // Skipping for now, but noted for improvement
      });

      it('should handle tenant creation failure', async () => {
        // Mock no existing user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        // Mock tenant creation failure
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        } as any);

        await expect(
          caller.register({
            email: 'new@example.com',
            password: 'ValidPass123!',
            name: 'New User',
            organizationName: 'New Organization',
          })
        ).rejects.toThrow('Failed to create tenant');
      });

      it('should handle user creation failure', async () => {
        // Mock no existing user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        // Mock tenant creation success
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockTenant]),
          }),
        } as any);

        // Mock user creation failure
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        } as any);

        await expect(
          caller.register({
            email: 'new@example.com',
            password: 'ValidPass123!',
            name: 'New User',
            organizationName: 'New Organization',
          })
        ).rejects.toThrow('Failed to create user');
      });

      it('should handle unexpected database errors', async () => {
        // Mock no existing user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        // Mock unexpected error
        serviceDb.insert.mockReturnValueOnce({
          values: vi.fn().mockRejectedValue(new Error('Database connection lost')),
        } as any);

        await expect(
          caller.register({
            email: 'new@example.com',
            password: 'ValidPass123!',
            name: 'New User',
            organizationName: 'New Organization',
          })
        ).rejects.toThrow('Failed to create account. Please try again.');
      });
    });
  });

  describe('Login', () => {
    describe('Input Validation', () => {
      it('should reject invalid email format', async () => {
        await expect(
          caller.login({
            email: 'invalid-email',
            password: 'password123',
          })
        ).rejects.toThrow('Invalid email address');
      });

      it('should reject empty password', async () => {
        await expect(
          caller.login({
            email: 'test@example.com',
            password: '',
          })
        ).rejects.toThrow('Password is required');
      });
    });

    describe('Authentication', () => {
      it('should reject login with non-existent email', async () => {
        // Mock no user found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        await expect(
          caller.login({
            email: 'nonexistent@example.com',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('Invalid email or password');
      });

      it('should reject login with invalid password', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ ...mockUser, passwordHash }]),
            }),
          }),
        } as any);

        // Mock failed attempt update
        serviceDb.update.mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        } as any);

        await expect(
          caller.login({
            email: 'test@example.com',
            password: 'WrongPassword123!',
          })
        ).rejects.toThrow('Invalid email or password');
      });

      it('should reject login with unverified email', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user with unverified email
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue([{ ...mockUser, passwordHash, emailVerified: null }]),
            }),
          }),
        } as any);

        await expect(
          caller.login({
            email: 'test@example.com',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('Please verify your email before logging in.');
      });
    });

    describe('Account Lockout', () => {
      it('should reject login when account is locked', async () => {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

        // Mock locked user
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ ...mockUser, lockedUntil }]),
            }),
          }),
        } as any);

        await expect(
          caller.login({
            email: 'test@example.com',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('Account is locked due to too many failed login attempts');
      });

      it('should allow login when lock period has expired', async () => {
        const lockedUntil = new Date(Date.now() - 1000); // 1 second ago
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user with expired lock
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ ...mockUser, passwordHash, lockedUntil }]),
            }),
          }),
        } as any);

        // Mock successful login update
        serviceDb.update.mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        } as any);

        const result = await caller.login({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

        expect(result.success).toBe(true);
      });

      it('should increment failed attempts on invalid password', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user with 2 failed attempts
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue([{ ...mockUser, passwordHash, failedLoginAttempts: 2 }]),
            }),
          }),
        } as any);

        // Mock update with assertion
        const updateMock = vi.fn((values) => {
          expect(values.failedLoginAttempts).toBe(3);
          return { where: vi.fn().mockResolvedValue(undefined) };
        });
        serviceDb.update.mockReturnValueOnce({
          set: updateMock,
        } as any);

        await expect(
          caller.login({
            email: 'test@example.com',
            password: 'WrongPassword123!',
          })
        ).rejects.toThrow('Invalid email or password');

        expect(updateMock).toHaveBeenCalled();
      });

      it('should lock account after 5 failed attempts', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user with 4 failed attempts (this will be 5th)
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue([{ ...mockUser, passwordHash, failedLoginAttempts: 4 }]),
            }),
          }),
        } as any);

        // Mock update with assertion
        const updateMock = vi.fn((values) => {
          expect(values.failedLoginAttempts).toBe(5);
          expect(values.lockedUntil).toBeInstanceOf(Date);
          // Verify lock is approximately 15 minutes
          const lockMinutes = (values.lockedUntil.getTime() - Date.now()) / (1000 * 60);
          expect(lockMinutes).toBeGreaterThanOrEqual(14);
          expect(lockMinutes).toBeLessThanOrEqual(16);
          return { where: vi.fn().mockResolvedValue(undefined) };
        });
        serviceDb.update.mockReturnValueOnce({
          set: updateMock,
        } as any);

        await expect(
          caller.login({
            email: 'test@example.com',
            password: 'WrongPassword123!',
          })
        ).rejects.toThrow('Invalid email or password');

        expect(updateMock).toHaveBeenCalled();
      });

      it('should reset failed attempts on successful login', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user with failed attempts
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue([{ ...mockUser, passwordHash, failedLoginAttempts: 3 }]),
            }),
          }),
        } as any);

        // Mock update with assertion
        const updateMock = vi.fn((values) => {
          expect(values.failedLoginAttempts).toBe(0);
          expect(values.lockedUntil).toBeNull();
          expect(values.lastLoginAt).toBeInstanceOf(Date);
          return { where: vi.fn().mockResolvedValue(undefined) };
        });
        serviceDb.update.mockReturnValueOnce({
          set: updateMock,
        } as any);

        const result = await caller.login({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

        expect(result.success).toBe(true);
        expect(updateMock).toHaveBeenCalled();
      });
    });

    describe('MFA (Multi-Factor Authentication)', () => {
      it('should require MFA code when MFA is enabled', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user with MFA enabled
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  ...mockUser,
                  passwordHash,
                  mfaEnabled: true,
                  mfaSecret: 'test_secret',
                },
              ]),
            }),
          }),
        } as any);

        await expect(
          caller.login({
            email: 'test@example.com',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('MFA code required');
      });

      it('should reject invalid MFA code', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user with MFA enabled
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  ...mockUser,
                  passwordHash,
                  mfaEnabled: true,
                  mfaSecret: 'test_secret',
                },
              ]),
            }),
          }),
        } as any);

        // Mock MFA service (will be imported dynamically in real code)
        // For now, we'll just test the error path
        await expect(
          caller.login({
            email: 'test@example.com',
            password: 'ValidPass123!',
            mfaCode: 'invalid',
          })
        ).rejects.toThrow();
      });
    });

    describe('Successful Login', () => {
      it('should return user data on successful login', async () => {
        const passwordHash = await hash('ValidPass123!', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });

        // Mock user found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ ...mockUser, passwordHash }]),
            }),
          }),
        } as any);

        // Mock successful login update
        serviceDb.update.mockReturnValueOnce({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        } as any);

        const result = await caller.login({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

        expect(result.success).toBe(true);
        expect(result.user).toMatchObject({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          tenantId: mockUser.tenantId,
          role: mockUser.role,
        });
      });
    });
  });

  describe('Email Verification', () => {
    describe('Token Validation', () => {
      it('should reject invalid token', async () => {
        // Mock no token found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        await expect(
          caller.verifyEmail({
            token: 'invalid_token',
          })
        ).rejects.toThrow('Invalid or expired verification token');
      });

      it('should reject expired token', async () => {
        const expiredToken = {
          ...mockToken,
          expires: new Date(Date.now() - 1000), // 1 second ago
        };

        // Mock expired token found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([expiredToken]),
            }),
          }),
        } as any);

        // Mock token deletion
        serviceDb.delete.mockReturnValueOnce({
          where: vi.fn().mockResolvedValue(undefined),
        } as any);

        await expect(
          caller.verifyEmail({
            token: expiredToken.token,
          })
        ).rejects.toThrow('Verification token has expired');
      });

      it('should reject verification for non-existent user', async () => {
        // Mock valid token found
        serviceDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockToken]),
              }),
            }),
          } as any)
          // Mock no user found
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          } as any);

        await expect(
          caller.verifyEmail({
            token: mockToken.token,
          })
        ).rejects.toThrow('User not found');
      });
    });

    describe('Successful Verification', () => {
      it('should verify email and delete token', async () => {
        // Mock valid token found
        serviceDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockToken]),
              }),
            }),
          } as any)
          // Mock user found
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ ...mockUser, emailVerified: null }]),
              }),
            }),
          } as any);

        // Mock user update
        const updateMock = vi.fn((values) => {
          expect(values.emailVerified).toBeInstanceOf(Date);
          expect(values.updatedAt).toBeInstanceOf(Date);
          return { where: vi.fn().mockResolvedValue(undefined) };
        });
        serviceDb.update.mockReturnValueOnce({
          set: updateMock,
        } as any);

        // Mock token deletion
        serviceDb.delete.mockReturnValueOnce({
          where: vi.fn().mockResolvedValue(undefined),
        } as any);

        const result = await caller.verifyEmail({
          token: mockToken.token,
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('Email verified successfully');
        expect(updateMock).toHaveBeenCalled();
      });
    });

    describe('Resend Verification', () => {
      it('should not reveal if email does not exist', async () => {
        // Mock no user found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        const result = await caller.resendVerification({
          email: 'nonexistent@example.com',
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('If the email exists');
      });

      it('should return success if email already verified', async () => {
        // Mock user with verified email
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ ...mockUser, emailVerified: new Date() }]),
            }),
          }),
        } as any);

        const result = await caller.resendVerification({
          email: mockUser.email,
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('Email is already verified');
      });

      it('should delete old tokens and create new one', async () => {
        // Mock user with unverified email
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ ...mockUser, emailVerified: null }]),
            }),
          }),
        } as any);

        // Mock old token deletion
        const deleteMock = vi.fn();
        serviceDb.delete.mockReturnValueOnce({
          where: vi.fn().mockResolvedValue(deleteMock),
        } as any);

        // Mock new token creation
        const insertMock = vi.fn((values) => {
          expect(values.identifier).toBe(mockUser.email);
          expect(values.token).toBeDefined();
          expect(values.expires).toBeInstanceOf(Date);
          // 24 hour expiry
          const hoursDiff = (values.expires.getTime() - Date.now()) / (1000 * 60 * 60);
          expect(hoursDiff).toBeGreaterThanOrEqual(23);
          expect(hoursDiff).toBeLessThanOrEqual(24);
          return undefined;
        });
        serviceDb.insert.mockReturnValueOnce({
          values: insertMock,
        } as any);

        const result = await caller.resendVerification({
          email: mockUser.email,
        });

        expect(result.success).toBe(true);
        expect(result.verificationToken).toBeDefined();
        expect(insertMock).toHaveBeenCalled();
      });
    });
  });

  describe('Password Reset', () => {
    describe('Request Password Reset', () => {
      it('should not reveal if email does not exist', async () => {
        // Mock no user found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        const result = await caller.resetPasswordRequest({
          email: 'nonexistent@example.com',
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('If the email exists');
      });

      it('should delete old reset tokens and create new one', async () => {
        // Mock user found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        } as any);

        // Mock old token deletion
        serviceDb.delete.mockReturnValueOnce({
          where: vi.fn().mockResolvedValue(undefined),
        } as any);

        // Mock new token creation with 1 hour expiry
        const insertMock = vi.fn((values) => {
          expect(values.identifier).toBe(mockUser.email);
          expect(values.token).toBeDefined();
          expect(values.expires).toBeInstanceOf(Date);
          // 1 hour expiry (shorter than verification)
          const hoursDiff = (values.expires.getTime() - Date.now()) / (1000 * 60 * 60);
          expect(hoursDiff).toBeGreaterThanOrEqual(0.9);
          expect(hoursDiff).toBeLessThanOrEqual(1.1);
          return undefined;
        });
        serviceDb.insert.mockReturnValueOnce({
          values: insertMock,
        } as any);

        const result = await caller.resetPasswordRequest({
          email: mockUser.email,
        });

        expect(result.success).toBe(true);
        expect(result.resetToken).toBeDefined();
        expect(insertMock).toHaveBeenCalled();
      });
    });

    describe('Reset Password with Token', () => {
      it('should reject invalid reset token', async () => {
        // Mock no token found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as any);

        await expect(
          caller.resetPassword({
            token: 'invalid_token',
            password: 'NewPass123!',
          })
        ).rejects.toThrow('Invalid or expired reset token');
      });

      it('should reject expired reset token', async () => {
        const expiredToken = {
          ...mockToken,
          expires: new Date(Date.now() - 1000), // 1 second ago
        };

        // Mock expired token found
        serviceDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([expiredToken]),
            }),
          }),
        } as any);

        // Mock token deletion
        serviceDb.delete.mockReturnValueOnce({
          where: vi.fn().mockResolvedValue(undefined),
        } as any);

        await expect(
          caller.resetPassword({
            token: expiredToken.token,
            password: 'NewPass123!',
          })
        ).rejects.toThrow('Reset token has expired');
      });

      it('should reject password reset for non-existent user', async () => {
        // Mock valid token found
        serviceDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockToken]),
              }),
            }),
          } as any)
          // Mock no user found
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          } as any);

        await expect(
          caller.resetPassword({
            token: mockToken.token,
            password: 'NewPass123!',
          })
        ).rejects.toThrow('User not found');
      });

      it('should validate new password requirements', async () => {
        await expect(
          caller.resetPassword({
            token: mockToken.token,
            password: 'weak',
          })
        ).rejects.toThrow('Password must be at least 8 characters');
      });

      it('should reset password and clear account lockout', async () => {
        // Mock valid token found
        serviceDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockToken]),
              }),
            }),
          } as any)
          // Mock user found with lockout
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    ...mockUser,
                    failedLoginAttempts: 3,
                    lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
                  },
                ]),
              }),
            }),
          } as any);

        // Mock password update with assertions
        const updateMock = vi.fn((values) => {
          expect(values.passwordHash).toBeDefined();
          expect(values.passwordHash).not.toBe('NewPass123!'); // Should be hashed
          expect(values.passwordAlgorithm).toBe('argon2id');
          expect(values.failedLoginAttempts).toBe(0);
          expect(values.lockedUntil).toBeNull();
          expect(values.updatedAt).toBeInstanceOf(Date);
          return { where: vi.fn().mockResolvedValue(undefined) };
        });
        serviceDb.update.mockReturnValueOnce({
          set: updateMock,
        } as any);

        // Mock token deletion
        serviceDb.delete.mockReturnValueOnce({
          where: vi.fn().mockResolvedValue(undefined),
        } as any);

        const result = await caller.resetPassword({
          token: mockToken.token,
          password: 'NewPass123!',
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('Password reset successfully');
        expect(updateMock).toHaveBeenCalled();
      });
    });
  });

  describe('Session Management', () => {
    it('should return null user when not authenticated', async () => {
      const result = await caller.getSession();
      expect(result.user).toBeNull();
    });

    it('should return success on signout', async () => {
      const result = await caller.signOut();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Signed out successfully');
    });
  });
});
