/**
 * Phase 12 Week 5: CRM Integration Router
 *
 * Provides tRPC endpoints for CRM operations
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  CRMConnectorFactory,
  SalesforceConnector,
  HubSpotConnector,
  type CRMConnectorConfig,
  type BaseCRMConnector,
} from '../services/crm';
import { db, tenants } from '@platform/db';
import { eq } from 'drizzle-orm';

/**
 * CRM configuration schema
 */
const crmConfigSchema = z.object({
  provider: z.enum(['salesforce', 'hubspot', 'zendesk', 'freshdesk']),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    instanceUrl: z.string().optional(),
  }),
  options: z
    .object({
      timeout: z.number().optional(),
      retryAttempts: z.number().optional(),
      customFieldMappings: z.record(z.string()).optional(),
    })
    .optional(),
});

/**
 * Get CRM connector for tenant
 * Returns both connector and config (since config is protected)
 */
async function getCRMConnector(tenantId: string): Promise<{ connector: BaseCRMConnector; config: CRMConnectorConfig }> {
  // Fetch tenant CRM configuration
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant || !tenant.metadata?.crm) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'CRM not configured for tenant',
    });
  }

  const config = tenant.metadata.crm as CRMConnectorConfig;

  // Create connector based on provider
  let connector: BaseCRMConnector;
  switch (config.provider) {
    case 'salesforce':
      connector = new SalesforceConnector(config);
      break;
    case 'hubspot':
      connector = new HubSpotConnector(config);
      break;
    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Provider ${config.provider} not yet supported`,
      });
  }

  // Register in factory cache
  CRMConnectorFactory.registerConnector(config, connector);

  return { connector, config };
}

/**
 * CRM router
 */
export const crmRouter = router({
  /**
   * Configure CRM integration (admin only)
   */
  configure: adminProcedure
    .input(crmConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch current tenant metadata
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, ctx.tenantId),
      });

      // Update tenant metadata with CRM config
      await db
        .update(tenants)
        .set({
          metadata: {
            ...(tenant?.metadata as Record<string, unknown> || {}),
            crm: {
              provider: input.provider,
              credentials: input.credentials as Record<string, string>,
              options: input.options,
            },
          },
        })
        .where(eq(tenants.id, ctx.tenantId));

      return { success: true };
    }),

  /**
   * Test CRM connection
   */
  testConnection: adminProcedure.query(async ({ ctx }) => {
    const { connector } = await getCRMConnector(ctx.tenantId);
    const isConnected = await connector.testConnection();

    return { connected: isConnected };
  }),

  /**
   * Get contact by email
   */
  getContactByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const { connector } = await getCRMConnector(ctx.tenantId);
      const contact = await connector.getContactByEmail(input.email);

      return { contact };
    }),

  /**
   * Create or update contact
   */
  syncContact: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
        customFields: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { connector } = await getCRMConnector(ctx.tenantId);

      // Check if contact exists
      const existing = await connector.getContactByEmail(input.email);

      let contact;
      if (existing) {
        // Update existing
        const { email: _email, ...updateData } = input;
        contact = await connector.updateContact(existing.id, updateData);
      } else {
        // Create new - input.email is required by zod schema
        contact = await connector.createContact({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          phone: input.phone,
          customFields: input.customFields,
        });
      }

      return { contact };
    }),

  /**
   * Create case/ticket from escalation
   */
  createCaseFromEscalation: protectedProcedure
    .input(
      z.object({
        escalationId: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assigneeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { connector, config } = await getCRMConnector(ctx.tenantId);

      // Fetch escalation details
      const { escalations } = await import('@platform/db');
      const escalation = await db.query.escalations.findFirst({
        where: eq(escalations.id, input.escalationId),
        with: {
          endUser: true,
        },
      });

      if (!escalation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Escalation not found',
        });
      }

      // Ensure contact exists in CRM
      const contactEmail = escalation.endUser?.email || `user-${escalation.endUserId}@unknown.com`;
      let contact = await connector.getContactByEmail(contactEmail);

      if (!contact) {
        // Parse name from endUser (if available) for first/last name
        const nameParts = escalation.endUser?.name?.split(' ') || [];

        // Create contact in CRM
        contact = await connector.createContact({
          email: contactEmail,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || undefined,
          customFields: {
            platform_end_user_id: escalation.endUserId,
          },
        });
      }

      // Create case in CRM
      const crmCase = await connector.createCase({
        subject: escalation.subject || 'Escalation Request',
        description: `${escalation.description || 'No description provided'}\n\nCategory: ${escalation.category || 'N/A'}\nSubcategory: ${escalation.subcategory || 'N/A'}\nPlatform Escalation ID: ${escalation.id}`,
        contactId: contact.id,
        priority: input.priority || 'medium',
        assigneeId: input.assigneeId,
        customFields: {
          platform_escalation_id: escalation.id,
          platform_session_id: escalation.sessionId,
        },
      });

      // Update escalation with CRM case ID
      await db
        .update(escalations)
        .set({
          escalationMetadata: {
            ...(escalation.escalationMetadata as Record<string, unknown> || {}),
            crmCaseId: crmCase.id,
            crmContactId: contact.id,
            crmProvider: config.provider,
          },
        })
        .where(eq(escalations.id, escalation.id));

      return {
        case: crmCase,
        contact,
      };
    }),

  /**
   * Add comment to case
   */
  addCaseComment: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
        comment: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { connector } = await getCRMConnector(ctx.tenantId);
      await connector.addCaseComment(input.caseId, input.comment);

      return { success: true };
    }),

  /**
   * Get cases for contact
   */
  getCasesForContact: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { connector } = await getCRMConnector(ctx.tenantId);
      const cases = await connector.getCasesForContact(
        input.contactId,
        input.limit
      );

      return { cases };
    }),

  /**
   * Search contacts
   */
  searchContacts: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { connector } = await getCRMConnector(ctx.tenantId);
      const contacts = await connector.searchContacts(input.query, input.limit);

      return { contacts };
    }),
});
