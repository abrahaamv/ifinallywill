/**
 * Phase 12 Week 6: Ticketing Integration Router
 *
 * Provides tRPC endpoints for ticketing operations
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  TicketingConnectorFactory,
  ZendeskConnector,
  FreshdeskConnector,
  type TicketingConnectorConfig,
} from '../services/ticketing';
import { db, tenants } from '@platform/db';
import { eq } from 'drizzle-orm';

/**
 * Ticketing configuration schema
 */
const ticketingConfigSchema = z.object({
  provider: z.enum(['zendesk', 'freshdesk', 'intercom', 'helpscout']),
  credentials: z.object({
    subdomain: z.string().optional(),
    apiKey: z.string().optional(),
    apiToken: z.string().optional(),
    email: z.string().optional(),
    accessToken: z.string().optional(),
  }),
  options: z
    .object({
      timeout: z.number().optional(),
      retryAttempts: z.number().optional(),
      customFieldMappings: z.record(z.union([z.string(), z.number()])).optional(),
    })
    .optional(),
});

/**
 * Get ticketing connector for tenant
 */
async function getTicketingConnector(tenantId: string) {
  // Fetch tenant ticketing configuration
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant || !tenant.metadata?.ticketing) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Ticketing system not configured for tenant',
    });
  }

  const config = tenant.metadata.ticketing as TicketingConnectorConfig;

  // Create connector based on provider
  let connector;
  switch (config.provider) {
    case 'zendesk':
      connector = new ZendeskConnector(config);
      break;
    case 'freshdesk':
      connector = new FreshdeskConnector(config);
      break;
    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Provider ${config.provider} not yet supported`,
      });
  }

  // Register in factory cache
  TicketingConnectorFactory.registerConnector(config, connector);

  return connector;
}

/**
 * Ticketing router
 */
export const ticketingRouter = router({
  /**
   * Configure ticketing integration (admin only)
   */
  configure: adminProcedure
    .input(ticketingConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch current tenant to get existing metadata
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, ctx.tenantId),
      });

      // Update tenant metadata with ticketing config
      await db
        .update(tenants)
        .set({
          metadata: {
            ...(tenant?.metadata as Record<string, unknown> || {}),
            ticketing: {
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
   * Test ticketing connection
   */
  testConnection: adminProcedure.query(async ({ ctx }) => {
    const connector = await getTicketingConnector(ctx.tenantId);
    const isConnected = await connector.testConnection();

    return { connected: isConnected };
  }),

  /**
   * Get ticket by ID
   */
  getTicket: protectedProcedure
    .input(z.object({ ticketId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await getTicketingConnector(ctx.tenantId);
      const ticket = await connector.getTicket(input.ticketId);

      if (!ticket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        });
      }

      return { ticket };
    }),

  /**
   * Create ticket from escalation
   */
  createTicketFromEscalation: protectedProcedure
    .input(
      z.object({
        escalationId: z.string(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
        type: z.enum(['question', 'incident', 'problem', 'task']).optional(),
        assigneeId: z.string().optional(),
        groupId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getTicketingConnector(ctx.tenantId);

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

      // Get requester email
      const requesterEmail = escalation.endUser?.email || `user-${escalation.endUserId}@unknown.com`;

      // Create ticket in ticketing system
      const ticket = await connector.createTicket({
        subject: escalation.subject,
        description: `${escalation.description}\n\nCategory: ${escalation.category}\nSubcategory: ${escalation.subcategory || 'N/A'}\nPlatform Escalation ID: ${escalation.id}\nSession ID: ${escalation.sessionId}`,
        requesterEmail,
        priority: input.priority || 'normal',
        type: input.type || 'question',
        assigneeId: input.assigneeId,
        groupId: input.groupId,
        tags: ['platform-escalation', escalation.category],
        customFields: {
          platform_escalation_id: escalation.id,
          platform_session_id: escalation.sessionId,
          platform_category: escalation.category,
        },
      });

      // Update escalation with ticket ID
      await db
        .update(escalations)
        .set({
          escalationMetadata: {
            ...(escalation.escalationMetadata as Record<string, unknown> || {}),
            ticketId: ticket.id,
            ticketingProvider: (connector as any).config?.provider,
          },
        })
        .where(eq(escalations.id, escalation.id));

      return { ticket };
    }),

  /**
   * Add comment to ticket
   */
  addComment: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        body: z.string(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getTicketingConnector(ctx.tenantId);
      const comment = await connector.addComment(
        input.ticketId,
        input.body,
        input.isPublic
      );

      return { comment };
    }),

  /**
   * Get comments for ticket
   */
  getComments: protectedProcedure
    .input(z.object({ ticketId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await getTicketingConnector(ctx.tenantId);
      const comments = await connector.getComments(input.ticketId);

      return { comments };
    }),

  /**
   * Get tickets for requester
   */
  getTicketsByRequester: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getTicketingConnector(ctx.tenantId);
      const tickets = await connector.getTicketsByRequester(
        input.email,
        input.limit
      );

      return { tickets };
    }),

  /**
   * Search tickets
   */
  searchTickets: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getTicketingConnector(ctx.tenantId);
      const tickets = await connector.searchTickets(input.query, input.limit);

      return { tickets };
    }),

  /**
   * Update ticket status
   */
  updateTicketStatus: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getTicketingConnector(ctx.tenantId);
      const ticket = await connector.updateTicket(input.ticketId, {
        status: input.status,
      });

      return { ticket };
    }),
});
