/**
 * Phase 12 Week 8: Communication Channel Router
 *
 * Provides tRPC endpoints for communication channel operations
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  CommunicationConnectorFactory,
  EmailConnector,
  WhatsAppConnector,
  SlackConnector,
  type CommunicationConnectorConfig,
} from '../services/communication';
import { db, tenants } from '@platform/db';
import { eq } from 'drizzle-orm';

/**
 * Communication configuration schema
 */
const communicationConfigSchema = z.object({
  provider: z.enum(['email', 'whatsapp', 'slack', 'sms', 'twilio']),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    accountSid: z.string().optional(),
    authToken: z.string().optional(),
    phoneNumber: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    imapHost: z.string().optional(),
    imapPort: z.number().optional(),
    useTLS: z.boolean().optional(),
    webhookUrl: z.string().optional(),
  }),
  options: z
    .object({
      timeout: z.number().optional(),
      retryAttempts: z.number().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().optional(),
      fromPhone: z.string().optional(),
      replyTo: z.string().optional(),
      maxAttachmentSize: z.number().optional(),
    })
    .optional(),
});

/**
 * Send message schema
 */
const sendMessageSchema = z.object({
  channelId: z.string(),
  threadId: z.string().optional(),
  to: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
  ),
  subject: z.string().optional(),
  content: z.string(),
  contentType: z.enum(['text/plain', 'text/html', 'text/markdown']).optional(),
  attachmentUrls: z.array(z.string()).optional(), // URLs to files
  replyTo: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Get communication connector for tenant
 */
async function getCommunicationConnector(tenantId: string, provider?: string) {
  // Fetch tenant communication configuration
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant || !tenant.metadata?.communication) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Communication not configured for tenant',
    });
  }

  const configs = tenant.metadata.communication as Record<string, CommunicationConnectorConfig>;

  // If provider specified, use that config
  if (provider) {
    const config = configs[provider];
    if (!config) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${provider} not configured for tenant`,
      });
    }

    return createConnector(config);
  }

  // Otherwise, use first available
  const firstProvider = Object.keys(configs)[0];
  if (!firstProvider) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'No communication providers configured',
    });
  }

  return createConnector(configs[firstProvider]);
}

/**
 * Create connector based on provider
 */
function createConnector(config: CommunicationConnectorConfig) {
  let connector;
  switch (config.provider) {
    case 'email':
      connector = new EmailConnector(config);
      break;
    case 'whatsapp':
      connector = new WhatsAppConnector(config);
      break;
    case 'slack':
      connector = new SlackConnector(config);
      break;
    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Provider ${config.provider} not yet supported`,
      });
  }

  // Register in factory cache
  CommunicationConnectorFactory.registerConnector(config, connector);

  return connector;
}

/**
 * Communication router
 */
export const communicationRouter = router({
  /**
   * Configure communication channel (admin only)
   */
  configure: adminProcedure
    .input(
      z.object({
        provider: z.enum(['email', 'whatsapp', 'slack', 'sms', 'twilio']),
        config: communicationConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch current tenant
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, ctx.tenantId),
      });

      // Get existing communication config
      const tenantMetadata = (tenant?.metadata || {}) as Record<string, unknown>;
      const existingConfig = (tenantMetadata.communication || {}) as Record<
        string,
        CommunicationConnectorConfig
      >;

      // Update with new provider config - ensure provider is set correctly
      existingConfig[input.provider] = {
        ...input.config,
        provider: input.provider, // Ensure provider is always set
      } as CommunicationConnectorConfig;

      // Update tenant metadata
      await db
        .update(tenants)
        .set({
          metadata: {
            ...tenantMetadata,
            communication: existingConfig,
          },
        })
        .where(eq(tenants.id, ctx.tenantId));

      return { success: true };
    }),

  /**
   * Test communication channel connection
   */
  testConnection: adminProcedure
    .input(z.object({ provider: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);
      const isConnected = await connector.testConnection();

      return { connected: isConnected };
    }),

  /**
   * Send message
   */
  sendMessage: protectedProcedure
    .input(
      sendMessageSchema.extend({
        provider: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);

      // Download attachments from URLs if provided
      const attachments = input.attachmentUrls
        ? await Promise.all(
            input.attachmentUrls.map(async (url) => {
              const response = await fetch(url);
              const buffer = Buffer.from(await response.arrayBuffer());
              const filename = url.split('/').pop() || 'file';
              const mimeType = response.headers.get('content-type') || 'application/octet-stream';

              return {
                name: filename,
                content: buffer,
                mimeType,
              };
            })
          )
        : undefined;

      const message = await connector.sendMessage({
        ...input,
        attachments,
      });

      return { message };
    }),

  /**
   * Get message by ID
   */
  getMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        provider: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);
      const message = await connector.getMessage(input.messageId);

      return { message };
    }),

  /**
   * List messages in a channel
   */
  listMessages: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        provider: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
        threadId: z.string().optional(),
        since: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);
      const result = await connector.listMessages(input.channelId, {
        limit: input.limit,
        cursor: input.cursor,
        threadId: input.threadId,
        since: input.since,
      });

      return result;
    }),

  /**
   * Get channel by ID
   */
  getChannel: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        provider: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);
      const channel = await connector.getChannel(input.channelId);

      return { channel };
    }),

  /**
   * List channels
   */
  listChannels: protectedProcedure
    .input(
      z.object({
        provider: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);
      const result = await connector.listChannels({
        limit: input.limit,
        cursor: input.cursor,
      });

      return result;
    }),

  /**
   * Mark message as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        provider: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);
      await connector.markAsRead(input.messageId);

      return { success: true };
    }),

  /**
   * Delete message
   */
  deleteMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        provider: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);
      await connector.deleteMessage(input.messageId);

      return { success: true };
    }),

  /**
   * Send notification to escalation contact
   */
  sendEscalationNotification: protectedProcedure
    .input(
      z.object({
        escalationId: z.string(),
        provider: z.enum(['email', 'whatsapp', 'slack']),
        channelId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connector = await getCommunicationConnector(ctx.tenantId, input.provider);

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

      // Determine recipient based on provider
      const to: Array<{ id?: string; name?: string; email?: string; phone?: string }> = [];
      if (input.provider === 'email' && escalation.endUser?.email) {
        to.push({ email: escalation.endUser.email, name: escalation.endUser.name || undefined });
      } else if (input.provider === 'whatsapp' && escalation.endUser?.phoneNumber) {
        to.push({ phone: escalation.endUser.phoneNumber, name: escalation.endUser.name || undefined });
      } else if (input.provider === 'slack') {
        to.push({ id: input.channelId });
      }

      if (to.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No valid contact information for ${input.provider}`,
        });
      }

      // Send notification
      const message = await connector.sendMessage({
        channelId: input.channelId,
        to,
        subject: `Escalation #${escalation.id}: ${escalation.subject || 'Escalation Request'}`,
        content: input.message,
        metadata: {
          escalationId: escalation.id,
          category: escalation.category,
        },
      });

      // Update escalation with notification info
      const existingMetadata = (escalation.escalationMetadata || {}) as Record<string, unknown>;
      const existingNotifications = (existingMetadata.notifications || []) as Array<unknown>;

      await db
        .update(escalations)
        .set({
          escalationMetadata: {
            ...existingMetadata,
            notifications: [
              ...existingNotifications,
              {
                provider: input.provider,
                messageId: message.id,
                sentAt: message.timestamp,
              },
            ],
          },
        })
        .where(eq(escalations.id, escalation.id));

      return { message };
    }),
});
