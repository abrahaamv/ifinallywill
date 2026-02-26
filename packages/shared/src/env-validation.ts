/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on application startup.
 * Implements fail-fast pattern to prevent production issues from misconfiguration.
 *
 * **Security Benefits**:
 * - Prevents running with missing secrets
 * - Validates secret strength and format
 * - Catches configuration errors before they cause security issues
 * - Provides clear error messages for troubleshooting
 *
 * **Usage**:
 * ```typescript
 * import { validateEnvironment } from '@platform/shared';
 *
 * // At application startup (before any other initialization)
 * validateEnvironment();
 * ```
 */

import { z } from 'zod';

/**
 * Environment schema definition
 *
 * Defines all required and optional environment variables with validation rules.
 * Uses Zod for runtime type checking and format validation.
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database configuration
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  DATABASE_SERVICE_URL: z.string().url().optional(), // Service role connection (for RLS bypass)

  // Redis configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // API Server
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // WebSocket Server
  WS_PORT: z.coerce.number().int().positive().default(3002),

  // CORS Origins (comma-separated)
  APP_URL: z.string().url().min(1, 'APP_URL is required for CORS'),
  DASHBOARD_URL: z.string().url().min(1, 'DASHBOARD_URL is required for CORS'),
  MEET_URL: z.string().url().min(1, 'MEET_URL is required for CORS'),
  WIDGET_URL: z.string().url().min(1, 'WIDGET_URL is required for CORS'),

  // Auth.js / Session Management
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters for security')
    .refine(
      (val: string) => process.env.NODE_ENV !== 'production' || val !== 'development-secret-do-not-use-in-production',
      'SESSION_SECRET must be set to a secure value in production'
    ),

  // Phase 8 Security Secrets
  MFA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'MFA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
    .optional()
    .refine(
      (val: string | undefined) => process.env.NODE_ENV !== 'production' || !!val,
      'MFA_ENCRYPTION_KEY is required in production'
    ),

  API_KEY_SECRET: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'API_KEY_SECRET must be a 64-character hex string (32 bytes)')
    .optional()
    .refine(
      (val: string | undefined) => process.env.NODE_ENV !== 'production' || !!val,
      'API_KEY_SECRET is required in production'
    ),

  // AI Provider API Keys
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(), // Gemini
  DEEPGRAM_API_KEY: z.string().optional(), // Speech-to-Text
  ELEVENLABS_API_KEY: z.string().optional(), // Text-to-Speech
  VOYAGE_API_KEY: z.string().optional(), // Embeddings
  COHERE_API_KEY: z.string().optional(), // Reranking

  // Stripe Payment Processing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // LiveKit Configuration
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_URL: z.string().url().optional(),

  // OAuth Providers (optional, for SSO)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Feature Flags
  ENABLE_LIVEKIT: z.coerce.boolean().default(false),
  ENABLE_RAG: z.coerce.boolean().default(false),
});

/**
 * Environment validation result
 */
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 *
 * Throws descriptive error if validation fails (fail-fast pattern).
 * Returns validated and typed environment object if successful.
 *
 * @throws {Error} If required environment variables are missing or invalid
 * @returns Validated environment object with proper types
 *
 * @example
 * ```typescript
 * // At application startup
 * const env = validateEnvironment();
 *
 * // Now you can use typed environment variables
 * console.log(env.DATABASE_URL); // string (guaranteed to exist)
 * console.log(env.PORT); // number (parsed and validated)
 * ```
 */
export function validateEnvironment(): ValidatedEnv {
  try {
    return envSchema.parse(process.env);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      // Format validation errors for readability
      const formattedErrors = error.errors
        .map((err: z.ZodIssue) => {
          const path = err.path.join('.');
          return `  ❌ ${path}: ${err.message}`;
        })
        .join('\n');

      const errorMessage = [
        '',
        '═══════════════════════════════════════════════════════════',
        '  ⚠️  ENVIRONMENT VALIDATION FAILED',
        '═══════════════════════════════════════════════════════════',
        '',
        'The following environment variables are missing or invalid:',
        '',
        formattedErrors,
        '',
        '📝 Fix these issues in your .env file or environment variables.',
        '📖 See .env.example for the complete list of required variables.',
        '',
        '💡 To generate secure secrets, run:',
        '   openssl rand -hex 32',
        '',
        '═══════════════════════════════════════════════════════════',
        '',
      ].join('\n');

      throw new Error(errorMessage);
    }

    throw error;
  }
}

/**
 * Get validated environment variables (cached)
 *
 * Returns cached validated environment if already validated,
 * otherwise validates and caches the result.
 *
 * @returns Validated environment object
 */
let cachedEnv: ValidatedEnv | null = null;

export function getEnv(): ValidatedEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnvironment();
  }
  return cachedEnv;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}
