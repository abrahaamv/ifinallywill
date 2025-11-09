/**
 * MFA Router Test Suite (Phase 8 - Week 3)
 *
 * Comprehensive tests for multi-factor authentication management with security focus.
 *
 * Test Coverage:
 * - MFA Setup (QR code generation, backup codes)
 * - MFA Enable (verification code validation, password confirmation)
 * - MFA Disable (password confirmation)
 * - Code Verification (TOTP + backup codes)
 * - Backup Code Regeneration (password confirmation)
 * - MFA Status Query
 * - Security (password verification, already enabled checks)
 */

import { TRPCError, initTRPC } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '../src/context';
import { mfaRouter } from '../src/routers/mfa';

/**
 * Mock external dependencies
 *
 * Important: The transaction method passes a tx object that operations use.
 * We make tx reuse the db methods so test mocks (vi.mocked(db.select)) apply to transactions.
 */
vi.mock('@platform/db', () => {
  const mockMethods = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    serviceDb: { ...mockMethods },
    db: {
      ...mockMethods,
      transaction: vi.fn(async (callback) => {
        // Create tx with execute method and reuse mockMethods so test mocks apply
        const tx = {
          ...mockMethods,
          execute: vi.fn().mockResolvedValue(undefined),
        };
        return await callback(tx);
      }),
    },
    users: {},
    eq: vi.fn(),
  };
});

vi.mock('@platform/auth', () => ({
  MFAService: {
    generateSetup: vi.fn(async (email: string, issuer: string) => ({
      secret: 'encrypted_test_secret',
      qrCodeDataUrl: 'data:image/png;base64,test_qr_code',
      backupCodes: ['BACKUP1', 'BACKUP2', 'BACKUP3'],
    })),
    verifyCode: vi.fn(async (code: string, secret: string, backupCodes: string[]) => ({
      valid: code === '123456',
      usedBackupCode: false,
    })),
    hashBackupCodes: vi.fn(async (codes: string[]) => codes.map((code) => `hashed_${code}`)),
  },
  passwordService: {
    verifyAndUpgrade: vi.fn(async (password: string, hash: string, algorithm: string) => ({
      valid: password === 'correct_password',
      needsUpgrade: false,
    })),
  },
}));

vi.mock('@platform/shared', () => ({
  badRequest: (opts: { message: string }) => {
    throw new TRPCError({ code: 'BAD_REQUEST', message: opts.message });
  },
  unauthorized: (opts: { message: string }) => {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: opts.message });
  },
  notFound: (opts: { message: string }) => {
    throw new TRPCError({ code: 'NOT_FOUND', message: opts.message });
  },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

/**
 * Import mocked modules after vi.mock() calls
 */
const { db, eq } = await import('@platform/db');
const { MFAService, passwordService } = await import('@platform/auth');

import { mockUUIDs } from './utils/fixtures';

/**
 * Test data fixtures
 */
const mockUserId = mockUUIDs.user.default;
const mockTenantId = mockUUIDs.tenant.default;

const mockUser = {
  id: mockUserId,
  email: 'test@example.com',
  name: 'Test User',
  tenantId: mockTenantId,
  role: 'admin' as const,
  passwordHash: 'hashed_password',
  passwordAlgorithm: 'argon2id',
  mfaEnabled: false,
  mfaSecret: null,
  mfaBackupCodes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserWithMFA = {
  ...mockUser,
  mfaEnabled: true,
  mfaSecret: 'encrypted_test_secret',
  mfaBackupCodes: ['hashed_BACKUP1', 'hashed_BACKUP2', 'hashed_BACKUP3'],
};

/**
 * Helper to create tRPC caller with proper session structure
 */
const createCaller = (role: 'member' | 'admin' | 'owner' = 'member') => {
  const t = initTRPC.context<Context>().create();

  // Create context with proper session.user structure per Context type
  const ctx: Context = {
    session: {
      user: {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        tenantId: mockTenantId,
        role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    tenantId: mockTenantId,
    userId: mockUserId,
    role,
    db: db as any,
  };

  const caller = t.router(mfaRouter).createCaller(ctx);

  return { caller, ctx };
};

/**
 * Test Suite: MFA Router
 */
describe('MFA Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Restore MFAService mock implementations after clearAllMocks
    vi.mocked(MFAService.generateSetup).mockImplementation(
      async (email: string, issuer: string) => ({
        secret: 'encrypted_test_secret',
        qrCodeDataUrl: 'data:image/png;base64,test_qr_code',
        backupCodes: ['BACKUP1', 'BACKUP2', 'BACKUP3'],
      })
    );
    vi.mocked(MFAService.verifyCode).mockImplementation(
      async (code: string, secret: string, backupCodes: string[]) => ({
        valid: code === '123456',
        usedBackupCode: false,
      })
    );
    vi.mocked(MFAService.hashBackupCodes).mockImplementation(async (codes: string[]) =>
      codes.map((code) => `hashed_${code}`)
    );

    // Restore passwordService mock implementation
    vi.mocked(passwordService.verifyAndUpgrade).mockImplementation(
      async (password: string, hash: string, algorithm: string) => ({
        valid: password === 'correct_password',
        needsUpgrade: false,
      })
    );
  });

  /**
   * MFA Setup Tests
   */
  describe('setup', () => {
    it('should generate MFA setup with QR code and backup codes', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA not enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const result = await caller.setup();

      expect(result).toMatchObject({
        qrCodeDataUrl: 'data:image/png;base64,test_qr_code',
        backupCodes: ['BACKUP1', 'BACKUP2', 'BACKUP3'],
      });

      expect(MFAService.generateSetup).toHaveBeenCalledWith('test@example.com', 'Platform');
      expect(db.select).toHaveBeenCalled();
    });

    it('should reject setup when MFA already enabled', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      await expect(caller.setup()).rejects.toThrow(
        'MFA is already enabled. Disable first to re-setup.'
      );
    });

    it('should handle missing user during setup', async () => {
      const { caller } = createCaller('admin');

      // Mock user not found
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(caller.setup()).rejects.toThrow('User not found');
    });
  });

  /**
   * MFA Enable Tests
   */
  describe('enable', () => {
    it('should enable MFA with valid verification code and password', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      // Mock update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await caller.enable({
        verificationCode: '123456',
        password: 'correct_password',
      });

      expect(result).toMatchObject({
        success: true,
        message: 'MFA enabled successfully',
      });

      expect(passwordService.verifyAndUpgrade).toHaveBeenCalled();
      expect(MFAService.verifyCode).toHaveBeenCalledWith('123456', 'encrypted_test_secret', []);
      expect(db.update).toHaveBeenCalled();
    });

    it('should reject enable with invalid password', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      await expect(
        caller.enable({
          verificationCode: '123456',
          password: 'wrong_password',
        })
      ).rejects.toThrow('Invalid password');
    });

    it('should reject enable with invalid verification code', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      // Mock verifyCode to reject invalid code
      vi.mocked(MFAService.verifyCode).mockResolvedValueOnce({
        valid: false,
        usedBackupCode: false,
      });

      await expect(
        caller.enable({
          verificationCode: '999999',
          password: 'correct_password',
        })
      ).rejects.toThrow('Invalid verification code. Please try again.');
    });

    it('should reject enable when MFA already enabled', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      await expect(
        caller.enable({
          verificationCode: '123456',
          password: 'correct_password',
        })
      ).rejects.toThrow('MFA is already enabled');
    });

    it('should handle missing user during enable', async () => {
      const { caller } = createCaller('admin');

      // Mock user not found
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        caller.enable({
          verificationCode: '123456',
          password: 'correct_password',
        })
      ).rejects.toThrow('User not found');
    });
  });

  /**
   * MFA Disable Tests
   */
  describe('disable', () => {
    it('should disable MFA with valid password', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      // Mock update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await caller.disable({
        password: 'correct_password',
      });

      expect(result).toMatchObject({
        success: true,
        message: 'MFA disabled successfully',
      });

      expect(passwordService.verifyAndUpgrade).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should reject disable with invalid password', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      await expect(
        caller.disable({
          password: 'wrong_password',
        })
      ).rejects.toThrow('Invalid password');
    });

    it('should handle missing user during disable', async () => {
      const { caller } = createCaller('admin');

      // Mock user not found
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        caller.disable({
          password: 'correct_password',
        })
      ).rejects.toThrow('User not found');
    });
  });

  /**
   * Code Verification Tests
   */
  describe('verify', () => {
    it('should verify valid TOTP code', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      const result = await caller.verify({
        code: '123456',
      });

      expect(result).toMatchObject({
        valid: true,
        usedBackupCode: false,
      });

      expect(MFAService.verifyCode).toHaveBeenCalledWith('123456', 'encrypted_test_secret', [
        'hashed_BACKUP1',
        'hashed_BACKUP2',
        'hashed_BACKUP3',
      ]);
    });

    it('should verify valid backup code', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      // Mock verifyCode to indicate backup code used
      vi.mocked(MFAService.verifyCode).mockResolvedValueOnce({
        valid: true,
        usedBackupCode: true,
      });

      const result = await caller.verify({
        code: 'BACKUP1',
      });

      expect(result).toMatchObject({
        valid: true,
        usedBackupCode: true,
      });
    });

    it('should reject when MFA not enabled', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA not enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      await expect(
        caller.verify({
          code: '123456',
        })
      ).rejects.toThrow('MFA is not enabled');
    });

    it('should reject invalid code', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      // Mock verifyCode to reject
      vi.mocked(MFAService.verifyCode).mockResolvedValueOnce({
        valid: false,
        usedBackupCode: false,
      });

      const result = await caller.verify({
        code: '999999',
      });

      expect(result.valid).toBe(false);
    });

    it('should handle missing user during verify', async () => {
      const { caller } = createCaller('admin');

      // Mock user not found
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        caller.verify({
          code: '123456',
        })
      ).rejects.toThrow('User not found');
    });
  });

  /**
   * Backup Code Regeneration Tests
   */
  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes with valid password', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      // Mock update
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await caller.regenerateBackupCodes({
        password: 'correct_password',
      });

      expect(result).toMatchObject({
        backupCodes: ['BACKUP1', 'BACKUP2', 'BACKUP3'],
        message: 'Backup codes regenerated successfully',
      });

      expect(passwordService.verifyAndUpgrade).toHaveBeenCalled();
      expect(MFAService.generateSetup).toHaveBeenCalled();
      expect(MFAService.hashBackupCodes).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should reject regeneration with invalid password', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserWithMFA]),
          }),
        }),
      } as any);

      await expect(
        caller.regenerateBackupCodes({
          password: 'wrong_password',
        })
      ).rejects.toThrow('Invalid password');
    });

    it('should reject regeneration when MFA not enabled', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA not enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      await expect(
        caller.regenerateBackupCodes({
          password: 'correct_password',
        })
      ).rejects.toThrow('MFA is not enabled');
    });

    it('should handle missing user during regeneration', async () => {
      const { caller } = createCaller('admin');

      // Mock user not found
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        caller.regenerateBackupCodes({
          password: 'correct_password',
        })
      ).rejects.toThrow('User not found');
    });
  });

  /**
   * MFA Status Tests
   */
  describe('status', () => {
    it('should return MFA enabled status', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ mfaEnabled: true }]),
          }),
        }),
      } as any);

      const result = await caller.status();

      expect(result).toMatchObject({
        enabled: true,
      });

      expect(db.select).toHaveBeenCalled();
    });

    it('should return false when MFA not enabled', async () => {
      const { caller } = createCaller('admin');

      // Mock user lookup (MFA not enabled)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ mfaEnabled: false }]),
          }),
        }),
      } as any);

      const result = await caller.status();

      expect(result).toMatchObject({
        enabled: false,
      });
    });

    it('should handle missing user during status check', async () => {
      const { caller } = createCaller('admin');

      // Mock user not found
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(caller.status()).rejects.toThrow('User not found');
    });
  });
});
