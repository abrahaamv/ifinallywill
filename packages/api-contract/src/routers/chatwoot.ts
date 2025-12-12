/**
 * Chatwoot Router
 *
 * Handles Chatwoot integration for dashboard users.
 * Provides SSO via Platform API for seamless agent login.
 *
 * SSO Flow:
 * 1. Dashboard calls getSSOUrl
 * 2. Backend ensures user exists in Chatwoot (via Platform API)
 * 3. Backend returns one-time SSO URL
 * 4. Dashboard redirects to SSO URL (or opens in iframe)
 * 5. User is auto-logged into Chatwoot
 *
 * Requires Platform App token from super_admin/platform_apps
 */

import { z } from 'zod';
import { randomBytes } from 'crypto';
import { protectedProcedure, router } from '../trpc';
import { users } from '@platform/db';
import { eq } from 'drizzle-orm';
import { ChatwootClient, ChatwootPlatformClient, ChatwootError } from '@platform/chatwoot';

/**
 * Generate a random password meeting Chatwoot requirements:
 * - At least 6 characters
 * - At least 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
function generateChatwootPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  // Ensure at least one of each required type
  const password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
    // Add random bytes for the rest
    randomBytes(8).toString('base64').slice(0, 8),
  ].join('');

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// =============================================================================
// Types
// =============================================================================

const ChatwootConfigSchema = z.object({
  baseUrl: z.string().url(),
  accountId: z.number(),
  apiAccessToken: z.string(),
  inboxId: z.number(),
});

// =============================================================================
// Chatwoot Router
// =============================================================================

export const chatwootRouter = router({
  /**
   * Get Chatwoot configuration status
   *
   * Returns whether Chatwoot is configured and accessible.
   */
  getStatus: protectedProcedure.query(async () => {
    const chatwootUrl = process.env.CHATWOOT_URL || 'http://localhost:3000';
    const proxyUrl = process.env.CHATWOOT_PROXY_URL || 'http://localhost:3003';
    const apiToken = process.env.CHATWOOT_API_TOKEN;
    const accountId = parseInt(process.env.CHATWOOT_ACCOUNT_ID || '1', 10);

    if (!apiToken) {
      return {
        configured: false,
        status: 'not_configured',
        message: 'Chatwoot API token not configured',
        chatwootUrl: proxyUrl,
        accountId,
      };
    }

    try {
      // Try to connect to Chatwoot
      const response = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/agents`, {
        headers: {
          'api_access_token': apiToken,
        },
      });

      if (response.ok) {
        return {
          configured: true,
          status: 'connected',
          chatwootUrl: proxyUrl,
          accountId,
        };
      }

      return {
        configured: false,
        status: 'error',
        message: `Chatwoot returned ${response.status}`,
        chatwootUrl: proxyUrl,
        accountId,
      };
    } catch (error) {
      return {
        configured: false,
        status: 'unreachable',
        message: error instanceof Error ? error.message : 'Failed to connect to Chatwoot',
        chatwootUrl: proxyUrl,
        accountId,
      };
    }
  }),

  /**
   * Get dashboard URL for embedding
   *
   * Returns the Chatwoot dashboard URL for iframe embedding.
   */
  getDashboardUrl: protectedProcedure.query(async () => {
    const proxyUrl = process.env.CHATWOOT_PROXY_URL || 'http://localhost:3003';
    const accountId = parseInt(process.env.CHATWOOT_ACCOUNT_ID || '1', 10);

    return {
      url: `${proxyUrl}/app/accounts/${accountId}/dashboard`,
      accountId,
    };
  }),

  /**
   * Ensure user has a Chatwoot agent account
   *
   * Creates a Chatwoot agent for the user if one doesn't exist.
   * Note: The agent will need to set their password via Chatwoot's
   * password reset flow (email sent automatically).
   */
  ensureAgent: protectedProcedure
    .input(
      z.object({
        chatwootConfig: ChatwootConfigSchema.optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      // Get user details
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Get Chatwoot config (from input or environment)
      const baseUrl = input?.chatwootConfig?.baseUrl || process.env.CHATWOOT_URL || 'http://localhost:3000';
      const accountId = input?.chatwootConfig?.accountId || parseInt(process.env.CHATWOOT_ACCOUNT_ID || '1', 10);
      const apiAccessToken = input?.chatwootConfig?.apiAccessToken || process.env.CHATWOOT_API_TOKEN || '';
      const inboxId = input?.chatwootConfig?.inboxId || parseInt(process.env.CHATWOOT_INBOX_ID || '1', 10);

      // If no API token configured, return setup instructions
      if (!apiAccessToken) {
        return {
          success: false,
          error: 'Chatwoot not configured',
          message: 'Please configure CHATWOOT_API_TOKEN in environment variables',
        };
      }

      try {
        const chatwootConfig = { baseUrl, accountId, apiAccessToken, inboxId };
        const chatwoot = new ChatwootClient(chatwootConfig);

        // Check if agent exists
        const existingAgent = await chatwoot.findAgentByEmail(user.email);

        if (existingAgent) {
          return {
            success: true,
            agent: {
              id: existingAgent.id,
              email: existingAgent.email,
              name: existingAgent.name,
              role: existingAgent.role,
            },
            accountId,
            isExisting: true,
          };
        }

        // Create new agent for this user
        const newAgent = await chatwoot.createAgent({
          email: user.email,
          name: user.name || user.email.split('@')[0],
          role: user.role === 'owner' ? 'administrator' : 'agent',
          availability: 'online',
        });

        return {
          success: true,
          agent: {
            id: newAgent.id,
            email: newAgent.email,
            name: newAgent.name,
            role: newAgent.role,
          },
          accountId,
          isNew: true,
          // New agents receive password reset email from Chatwoot
          message: 'Agent created. Check email for password setup instructions.',
        };
      } catch (error) {
        if (error instanceof ChatwootError) {
          return {
            success: false,
            error: error.message,
            statusCode: error.statusCode,
          };
        }
        throw error;
      }
    }),

  /**
   * Get SSO URL for seamless Chatwoot login
   *
   * Uses the Chatwoot Platform API to:
   * 1. Ensure user exists in Chatwoot
   * 2. Add user to account if not already added
   * 3. Return one-time SSO login URL
   *
   * The SSO URL is valid once and auto-logs the user in.
   * Frontend should redirect to this URL.
   */
  getSSOUrl: protectedProcedure.mutation(async ({ ctx }) => {
    const platformToken = process.env.CHATWOOT_PLATFORM_TOKEN;
    const chatwootUrl = process.env.CHATWOOT_URL || 'http://localhost:3000';
    const proxyUrl = process.env.CHATWOOT_PROXY_URL || 'http://localhost:3003';
    const accountId = parseInt(process.env.CHATWOOT_ACCOUNT_ID || '1', 10);

    // Check if Platform API is configured
    if (!platformToken) {
      return {
        success: false,
        error: 'SSO not configured',
        message: 'CHATWOOT_PLATFORM_TOKEN not set. Create a Platform App in Chatwoot super admin.',
        fallbackUrl: `${proxyUrl}/app/accounts/${accountId}/dashboard`,
      };
    }

    // Get current user
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    try {
      const platform = new ChatwootPlatformClient({
        baseUrl: chatwootUrl,
        platformToken,
      });

      // Check if user already has chatwootUserId stored
      let chatwootUserId = user.chatwootUserId;

      if (!chatwootUserId) {
        // Production SSO Flow:
        // 1. Platform API creates user → adds to platform_app_permissibles → SSO enabled
        // 2. Account API adds user to account → adds to account_users → agent access
        const apiAccessToken = process.env.CHATWOOT_API_TOKEN;
        const inboxId = parseInt(process.env.CHATWOOT_INBOX_ID || '1', 10);

        // Step 1: Create user via Platform API (required for SSO)
        const randomPassword = generateChatwootPassword();
        try {
          const newUser = await platform.createUser({
            name: user.name || user.email.split('@')[0],
            email: user.email,
            password: randomPassword,
            custom_attributes: {
              visualkit_user_id: user.id,
              visualkit_tenant_id: user.tenantId,
            },
          });
          chatwootUserId = newUser.id;
        } catch (createError) {
          // User might already exist in Chatwoot (created manually or via previous attempt)
          if (createError instanceof ChatwootError && createError.statusCode === 422) {
            // Try to find existing user via Account API
            if (apiAccessToken) {
              const chatwoot = new ChatwootClient({
                baseUrl: chatwootUrl,
                accountId,
                apiAccessToken,
                inboxId,
              });
              const existingAgent = await chatwoot.findAgentByEmail(user.email);
              if (existingAgent) {
                chatwootUserId = existingAgent.id;
              } else {
                // User exists but not as agent - can't SSO without platform_app_permissibles entry
                return {
                  success: false,
                  error: 'User exists in Chatwoot but not linked to Platform App. Manual setup required.',
                  fallbackUrl: `${proxyUrl}/app/accounts/${accountId}/dashboard`,
                };
              }
            } else {
              return {
                success: false,
                error: 'User exists in Chatwoot but not linked. Configure CHATWOOT_API_TOKEN.',
                fallbackUrl: `${proxyUrl}/app/accounts/${accountId}/dashboard`,
              };
            }
          } else {
            throw createError;
          }
        }

        // Step 2: Add user to account as agent (required for conversation access)
        if (apiAccessToken && chatwootUserId) {
          const chatwoot = new ChatwootClient({
            baseUrl: chatwootUrl,
            accountId,
            apiAccessToken,
            inboxId,
          });

          // Check if already an agent in this account
          const existingAgent = await chatwoot.findAgentByEmail(user.email);
          if (!existingAgent) {
            // Add to account as agent
            await chatwoot.createAgent({
              email: user.email,
              name: user.name || user.email.split('@')[0],
              role: user.role === 'owner' ? 'administrator' : 'agent',
              availability: 'online',
            });
          }
        }

        // Store chatwootUserId for future SSO requests
        await ctx.db
          .update(users)
          .set({ chatwootUserId })
          .where(eq(users.id, ctx.userId));
      }

      // Get SSO URL
      const { url } = await platform.getUserSSOLink(chatwootUserId);

      // Replace internal URL with proxy URL for browser access
      const ssoUrl = url.replace(chatwootUrl, proxyUrl);

      return {
        success: true,
        ssoUrl,
        accountId,
        // After SSO redirect, user lands here:
        dashboardUrl: `${proxyUrl}/app/accounts/${accountId}/dashboard`,
      };
    } catch (error) {
      if (error instanceof ChatwootError) {
        return {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
          fallbackUrl: `${proxyUrl}/app/accounts/${accountId}/dashboard`,
        };
      }
      throw error;
    }
  }),
});
