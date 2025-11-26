/**
 * Phase 12 Week 8: Communication Channel Connectors - Base Abstraction
 *
 * Provides unified interface for communication channel integrations
 * (Email, WhatsApp, Slack, SMS, etc.)
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('CommunicationConnector');

/**
 * Message representation
 */
export interface Message {
  id: string;
  channelId: string;
  threadId?: string;
  from: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  to: Array<{
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  }>;
  subject?: string;
  content: string;
  contentType: 'text/plain' | 'text/html' | 'text/markdown';
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
  metadata?: Record<string, any>;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

/**
 * Channel representation
 */
export interface Channel {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'slack' | 'sms' | 'direct';
  isPrivate?: boolean;
  participants?: Array<{
    id: string;
    name?: string;
    email?: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Send message input
 */
export interface SendMessageInput {
  channelId: string;
  threadId?: string;
  to: Array<{
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  }>;
  subject?: string;
  content: string;
  contentType?: 'text/plain' | 'text/html' | 'text/markdown';
  attachments?: Array<{
    name: string;
    content: Buffer | string;
    mimeType: string;
  }>;
  replyTo?: string;
  metadata?: Record<string, any>;
}

/**
 * Communication connector configuration
 */
export interface CommunicationConnectorConfig {
  provider: 'email' | 'whatsapp' | 'slack' | 'sms' | 'twilio';
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    imapHost?: string;
    imapPort?: number;
    webhookUrl?: string;
    [key: string]: any;
  };
  options?: {
    timeout?: number;
    retryAttempts?: number;
    fromName?: string;
    fromEmail?: string;
    fromPhone?: string;
    replyTo?: string;
    maxAttachmentSize?: number; // bytes
  };
}

/**
 * Base communication connector interface
 * All communication channel integrations must implement this interface
 */
export abstract class BaseCommunicationConnector {
  protected config: CommunicationConnectorConfig;
  protected logger: ReturnType<typeof createModuleLogger>;

  constructor(config: CommunicationConnectorConfig) {
    this.config = config;
    this.logger = createModuleLogger(`Communication:${config.provider}`);
  }

  /**
   * Test connection to communication channel
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Send message to channel
   */
  abstract sendMessage(input: SendMessageInput): Promise<Message>;

  /**
   * Get message by ID
   */
  abstract getMessage(messageId: string): Promise<Message | null>;

  /**
   * List messages in a channel
   */
  abstract listMessages(
    channelId: string,
    options?: {
      limit?: number;
      cursor?: string;
      threadId?: string;
      since?: Date;
    }
  ): Promise<{
    messages: Message[];
    nextCursor?: string;
  }>;

  /**
   * Get channel by ID
   */
  abstract getChannel(channelId: string): Promise<Channel | null>;

  /**
   * List available channels
   */
  abstract listChannels(options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{
    channels: Channel[];
    nextCursor?: string;
  }>;

  /**
   * Mark message as read
   */
  abstract markAsRead(messageId: string): Promise<void>;

  /**
   * Delete message
   */
  abstract deleteMessage(messageId: string): Promise<void>;

  /**
   * Helper: Handle API errors consistently
   */
  protected handleError(error: any, operation: string): never {
    this.logger.error(`${operation} failed`, {
      provider: this.config.provider,
      error: error.message,
      stack: error.stack,
    });

    throw new CommunicationConnectorError(
      `${this.config.provider} ${operation} failed: ${error.message}`,
      {
        provider: this.config.provider,
        operation,
        originalError: error,
      }
    );
  }
}

/**
 * Communication connector error
 */
export class CommunicationConnectorError extends Error {
  constructor(
    message: string,
    public details: {
      provider: string;
      operation: string;
      originalError?: any;
    }
  ) {
    super(message);
    this.name = 'CommunicationConnectorError';
  }
}

/**
 * Communication connector factory
 */
export class CommunicationConnectorFactory {
  private static connectors: Map<string, BaseCommunicationConnector> = new Map();

  /**
   * Get or create communication connector
   */
  static getConnector(
    config: CommunicationConnectorConfig
  ): BaseCommunicationConnector {
    const cacheKey = `${config.provider}:${config.credentials.apiKey || config.credentials.smtpHost || config.credentials.accountSid}`;

    if (this.connectors.has(cacheKey)) {
      return this.connectors.get(cacheKey)!;
    }

    throw new Error(
      `Connector for ${config.provider} not yet loaded. Use registerConnector() first.`
    );
  }

  /**
   * Register connector instance
   */
  static registerConnector(
    config: CommunicationConnectorConfig,
    connector: BaseCommunicationConnector
  ): void {
    const cacheKey = `${config.provider}:${config.credentials.apiKey || config.credentials.smtpHost || config.credentials.accountSid}`;
    this.connectors.set(cacheKey, connector);
  }

  /**
   * Clear connector cache
   */
  static clearCache(): void {
    this.connectors.clear();
  }
}
