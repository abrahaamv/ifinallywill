/**
 * Phase 12 Week 5: CRM Integration Router
 * Salesforce, HubSpot, Zendesk bi-directional sync
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { crmIntegrations, crmSyncLogs, crmFieldMappings } from '@platform/db/schema/crm-integrations';
import { endUsers } from '@platform/db/schema/end-user-engagement';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// CRM Provider Types
const CRMProviderSchema = z.enum(['salesforce', 'hubspot', 'zendesk']);
type CRMProvider = z.infer<typeof CRMProviderSchema>;

// Field Mapping Schema
const FieldMappingSchema = z.object({
  platformField: z.string(),
  crmField: z.string(),
  direction: z.enum(['platform_to_crm', 'crm_to_platform', 'bidirectional']),
  transformFunction: z.string().optional(),
});

// Integration Configuration Schema
const IntegrationConfigSchema = z.object({
  provider: CRMProviderSchema,
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    instanceUrl: z.string().url().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
  }),
  syncSettings: z.object({
    enabled: z.boolean().default(true),
    syncInterval: z.number().int().min(300).max(86400).default(3600), // 5 min to 24 hours
    syncDirection: z.enum(['platform_to_crm', 'crm_to_platform', 'bidirectional']).default('bidirectional'),
    autoCreateContacts: z.boolean().default(true),
    conflictResolution: z.enum(['platform_wins', 'crm_wins', 'most_recent']).default('most_recent'),
  }),
  fieldMappings: z.array(FieldMappingSchema),
});

export const crmRouter = router({
  /**
   * Create or update CRM integration configuration
   */
  upsertIntegration: protectedProcedure
    .input(IntegrationConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { provider, credentials, syncSettings, fieldMappings } = input;

      // Check if integration already exists
      const existing = await ctx.db.query.crmIntegrations.findFirst({
        where: and(
          eq(crmIntegrations.tenantId, ctx.session.user.tenantId),
          eq(crmIntegrations.provider, provider)
        ),
      });

      if (existing) {
        // Update existing integration
        await ctx.db.update(crmIntegrations)
          .set({
            credentials: credentials as any,
            syncInterval: syncSettings.syncInterval,
            syncDirection: syncSettings.syncDirection,
            autoCreateContacts: syncSettings.autoCreateContacts,
            conflictResolution: syncSettings.conflictResolution,
            isActive: syncSettings.enabled,
            updatedAt: new Date(),
          })
          .where(eq(crmIntegrations.id, existing.id));

        // Update field mappings
        await ctx.db.delete(crmFieldMappings)
          .where(eq(crmFieldMappings.integrationId, existing.id));

        if (fieldMappings.length > 0) {
          await ctx.db.insert(crmFieldMappings).values(
            fieldMappings.map((mapping) => ({
              integrationId: existing.id,
              platformField: mapping.platformField,
              crmField: mapping.crmField,
              direction: mapping.direction,
              transformFunction: mapping.transformFunction,
            }))
          );
        }

        return { integrationId: existing.id, action: 'updated' };
      } else {
        // Create new integration
        const [newIntegration] = await ctx.db.insert(crmIntegrations).values({
          tenantId: ctx.session.user.tenantId,
          provider,
          credentials: credentials as any,
          syncInterval: syncSettings.syncInterval,
          syncDirection: syncSettings.syncDirection,
          autoCreateContacts: syncSettings.autoCreateContacts,
          conflictResolution: syncSettings.conflictResolution,
          isActive: syncSettings.enabled,
        }).returning();

        if (fieldMappings.length > 0) {
          await ctx.db.insert(crmFieldMappings).values(
            fieldMappings.map((mapping) => ({
              integrationId: newIntegration.id,
              platformField: mapping.platformField,
              crmField: mapping.crmField,
              direction: mapping.direction,
              transformFunction: mapping.transformFunction,
            }))
          );
        }

        return { integrationId: newIntegration.id, action: 'created' };
      }
    }),

  /**
   * Get CRM integration status
   */
  getIntegration: protectedProcedure
    .input(z.object({
      provider: CRMProviderSchema,
    }))
    .query(async ({ ctx, input }) => {
      const integration = await ctx.db.query.crmIntegrations.findFirst({
        where: and(
          eq(crmIntegrations.tenantId, ctx.session.user.tenantId),
          eq(crmIntegrations.provider, input.provider)
        ),
        with: {
          fieldMappings: true,
        },
      });

      if (!integration) {
        return null;
      }

      // Sanitize credentials (don't return secrets)
      const sanitizedIntegration = {
        ...integration,
        credentials: {
          configured: true,
          instanceUrl: integration.credentials.instanceUrl || undefined,
        },
      };

      return sanitizedIntegration;
    }),

  /**
   * List all CRM integrations for tenant
   */
  listIntegrations: protectedProcedure
    .query(async ({ ctx }) => {
      const integrations = await ctx.db.query.crmIntegrations.findMany({
        where: eq(crmIntegrations.tenantId, ctx.session.user.tenantId),
        with: {
          fieldMappings: true,
        },
        orderBy: [desc(crmIntegrations.createdAt)],
      });

      // Sanitize credentials
      return integrations.map((integration) => ({
        ...integration,
        credentials: {
          configured: true,
          instanceUrl: integration.credentials.instanceUrl || undefined,
        },
      }));
    }),

  /**
   * Delete CRM integration
   */
  deleteIntegration: protectedProcedure
    .input(z.object({
      provider: CRMProviderSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.query.crmIntegrations.findFirst({
        where: and(
          eq(crmIntegrations.tenantId, ctx.session.user.tenantId),
          eq(crmIntegrations.provider, input.provider)
        ),
      });

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `CRM integration for ${input.provider} not found`,
        });
      }

      // Delete field mappings first (foreign key constraint)
      await ctx.db.delete(crmFieldMappings)
        .where(eq(crmFieldMappings.integrationId, integration.id));

      // Delete integration
      await ctx.db.delete(crmIntegrations)
        .where(eq(crmIntegrations.id, integration.id));

      return { success: true };
    }),

  /**
   * Manually trigger sync for end user
   */
  syncEndUser: protectedProcedure
    .input(z.object({
      endUserId: z.string().uuid(),
      provider: CRMProviderSchema,
      direction: z.enum(['to_crm', 'from_crm']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { endUserId, provider, direction } = input;

      // Get integration config
      const integration = await ctx.db.query.crmIntegrations.findFirst({
        where: and(
          eq(crmIntegrations.tenantId, ctx.session.user.tenantId),
          eq(crmIntegrations.provider, provider),
          eq(crmIntegrations.isActive, true)
        ),
        with: {
          fieldMappings: true,
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Active CRM integration for ${provider} not found`,
        });
      }

      // Get end user data
      const endUser = await ctx.db.query.endUsers.findFirst({
        where: eq(endUsers.id, endUserId),
      });

      if (!endUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'End user not found',
        });
      }

      // Log sync attempt
      const [syncLog] = await ctx.db.insert(crmSyncLogs).values({
        integrationId: integration.id,
        direction: direction === 'to_crm' ? 'platform_to_crm' : 'crm_to_platform',
        entityType: 'contact',
        entityId: endUserId,
        status: 'pending',
      }).returning();

      try {
        // Import CRM service dynamically based on provider
        let crmService;
        if (provider === 'salesforce') {
          const { SalesforceService } = await import('@platform/api/services/crm/salesforce');
          crmService = new SalesforceService(integration.credentials);
        } else if (provider === 'hubspot') {
          const { HubSpotService } = await import('@platform/api/services/crm/hubspot');
          crmService = new HubSpotService(integration.credentials);
        } else if (provider === 'zendesk') {
          const { ZendeskService } = await import('@platform/api/services/crm/zendesk');
          crmService = new ZendeskService(integration.credentials);
        } else {
          throw new Error(`Unsupported CRM provider: ${provider}`);
        }

        let result;
        if (direction === 'to_crm') {
          // Sync from platform to CRM
          result = await crmService.upsertContact({
            externalId: endUser.externalId,
            email: endUser.email,
            phoneNumber: endUser.phoneNumber,
            fullName: endUser.fullName,
            fieldMappings: integration.fieldMappings,
          });

          // Update end user with external ID if new contact created
          if (result.externalId && !endUser.externalId) {
            await ctx.db.update(endUsers)
              .set({ externalId: result.externalId })
              .where(eq(endUsers.id, endUserId));
          }
        } else {
          // Sync from CRM to platform
          if (!endUser.externalId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'End user has no external_id to sync from CRM',
            });
          }

          result = await crmService.getContact(endUser.externalId);

          // Update platform with CRM data
          const updates: any = {};
          for (const mapping of integration.fieldMappings) {
            if (mapping.direction === 'crm_to_platform' || mapping.direction === 'bidirectional') {
              const crmValue = result[mapping.crmField];
              if (crmValue !== undefined) {
                updates[mapping.platformField] = crmValue;
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await ctx.db.update(endUsers)
              .set({ ...updates, updatedAt: new Date() })
              .where(eq(endUsers.id, endUserId));
          }
        }

        // Update sync log as successful
        await ctx.db.update(crmSyncLogs)
          .set({
            status: 'success',
            completedAt: new Date(),
            recordsProcessed: 1,
            recordsSucceeded: 1,
            recordsFailed: 0,
          })
          .where(eq(crmSyncLogs.id, syncLog.id));

        return {
          success: true,
          syncLogId: syncLog.id,
          externalId: result.externalId || endUser.externalId,
        };
      } catch (error) {
        // Update sync log as failed
        await ctx.db.update(crmSyncLogs)
          .set({
            status: 'failed',
            completedAt: new Date(),
            recordsProcessed: 1,
            recordsSucceeded: 0,
            recordsFailed: 1,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(crmSyncLogs.id, syncLog.id));

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `CRM sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Get sync history for integration
   */
  getSyncHistory: protectedProcedure
    .input(z.object({
      provider: CRMProviderSchema,
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const integration = await ctx.db.query.crmIntegrations.findFirst({
        where: and(
          eq(crmIntegrations.tenantId, ctx.session.user.tenantId),
          eq(crmIntegrations.provider, input.provider)
        ),
      });

      if (!integration) {
        return [];
      }

      const syncLogs = await ctx.db.query.crmSyncLogs.findMany({
        where: eq(crmSyncLogs.integrationId, integration.id),
        orderBy: [desc(crmSyncLogs.startedAt)],
        limit: input.limit,
      });

      return syncLogs;
    }),

  /**
   * Test CRM connection
   */
  testConnection: protectedProcedure
    .input(z.object({
      provider: CRMProviderSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.query.crmIntegrations.findFirst({
        where: and(
          eq(crmIntegrations.tenantId, ctx.session.user.tenantId),
          eq(crmIntegrations.provider, input.provider)
        ),
      });

      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `CRM integration for ${input.provider} not found`,
        });
      }

      try {
        // Import CRM service
        let crmService;
        if (input.provider === 'salesforce') {
          const { SalesforceService } = await import('@platform/api/services/crm/salesforce');
          crmService = new SalesforceService(integration.credentials);
        } else if (input.provider === 'hubspot') {
          const { HubSpotService } = await import('@platform/api/services/crm/hubspot');
          crmService = new HubSpotService(integration.credentials);
        } else if (input.provider === 'zendesk') {
          const { ZendeskService } = await import('@platform/api/services/crm/zendesk');
          crmService = new ZendeskService(integration.credentials);
        }

        // Test connection
        const result = await crmService.testConnection();

        return {
          success: true,
          connectionValid: result.valid,
          message: result.message,
          accountInfo: result.accountInfo,
        };
      } catch (error) {
        return {
          success: false,
          connectionValid: false,
          message: error instanceof Error ? error.message : 'Connection test failed',
        };
      }
    }),
});
