/**
 * Phase 12 Week 6: Ticketing Integration - Base Connector Abstraction
 *
 * Provides unified interface for ticketing integrations (Zendesk, Freshdesk, etc.)
 */

import { createModuleLogger } from '@platform/shared';

// Removed unused module-level logger - each connector instance has its own logger

/**
 * Ticket representation
 */
export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type?: 'question' | 'incident' | 'problem' | 'task';
  requesterEmail: string;
  requesterId?: string;
  assigneeId?: string;
  groupId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User/Contact representation
 */
export interface TicketUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: 'end-user' | 'agent' | 'admin';
  organizationId?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ticket comment/reply
 */
export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  htmlBody?: string;
  public: boolean;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    url: string;
  }>;
  createdAt: Date;
}

/**
 * Create ticket input
 */
export interface CreateTicketInput {
  subject: string;
  description: string;
  requesterEmail: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  type?: 'question' | 'incident' | 'problem' | 'task';
  assigneeId?: string;
  groupId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Update ticket input
 */
export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  type?: 'question' | 'incident' | 'problem' | 'task';
  assigneeId?: string;
  groupId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  name?: string;
  phone?: string;
  role?: 'end-user' | 'agent' | 'admin';
  organizationId?: string;
  customFields?: Record<string, any>;
}

/**
 * Ticketing connector configuration
 */
export interface TicketingConnectorConfig {
  provider: 'zendesk' | 'freshdesk' | 'intercom' | 'helpscout';
  credentials: {
    subdomain?: string;
    apiKey?: string;
    apiToken?: string;
    email?: string; // For Zendesk basic auth
    accessToken?: string;
    [key: string]: any;
  };
  options?: {
    timeout?: number;
    retryAttempts?: number;
    customFieldMappings?: Record<string, string | number>;
  };
}

/**
 * Base ticketing connector interface
 * All ticketing integrations must implement this interface
 */
export abstract class BaseTicketingConnector {
  protected config: TicketingConnectorConfig;
  protected logger: ReturnType<typeof createModuleLogger>;

  constructor(config: TicketingConnectorConfig) {
    this.config = config;
    this.logger = createModuleLogger(`Ticketing:${config.provider}`);
  }

  /**
   * Test connection to ticketing system
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get ticket by ID
   */
  abstract getTicket(id: string): Promise<Ticket | null>;

  /**
   * Create new ticket
   */
  abstract createTicket(input: CreateTicketInput): Promise<Ticket>;

  /**
   * Update existing ticket
   */
  abstract updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket>;

  /**
   * Search tickets
   */
  abstract searchTickets(
    query: string,
    limit?: number
  ): Promise<Ticket[]>;

  /**
   * Get tickets for requester email
   */
  abstract getTicketsByRequester(
    email: string,
    limit?: number
  ): Promise<Ticket[]>;

  /**
   * Add comment/reply to ticket
   */
  abstract addComment(
    ticketId: string,
    body: string,
    isPublic?: boolean
  ): Promise<TicketComment>;

  /**
   * Get comments for ticket
   */
  abstract getComments(ticketId: string): Promise<TicketComment[]>;

  /**
   * Get or create user by email
   */
  abstract getOrCreateUser(input: CreateUserInput): Promise<TicketUser>;

  /**
   * Get user by ID
   */
  abstract getUser(id: string): Promise<TicketUser | null>;

  /**
   * Helper: Map custom fields from our format to provider-specific format
   */
  protected mapCustomFields(
    fields: Record<string, any>
  ): Record<string | number, any> {
    const mappings = this.config.options?.customFieldMappings || {};
    const mapped: Record<string | number, any> = {};

    for (const [key, value] of Object.entries(fields)) {
      const mappedKey = mappings[key] || key;
      mapped[mappedKey] = value;
    }

    return mapped;
  }

  /**
   * Helper: Reverse map custom fields from provider format to our format
   */
  protected unmapCustomFields(
    fields: Record<string | number, any>
  ): Record<string, any> {
    const mappings = this.config.options?.customFieldMappings || {};
    const reverseMappings = Object.fromEntries(
      Object.entries(mappings).map(([k, v]) => [String(v), k])
    );

    const unmapped: Record<string, any> = {};

    for (const [key, value] of Object.entries(fields)) {
      const unmappedKey = reverseMappings[key] || key;
      unmapped[unmappedKey] = value;
    }

    return unmapped;
  }

  /**
   * Helper: Handle API errors consistently
   */
  protected handleError(error: any, operation: string): never {
    this.logger.error(`${operation} failed`, {
      provider: this.config.provider,
      error: error.message,
      stack: error.stack,
    });

    throw new TicketingConnectorError(
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
 * Ticketing connector error
 */
export class TicketingConnectorError extends Error {
  constructor(
    message: string,
    public details: {
      provider: string;
      operation: string;
      originalError?: any;
    }
  ) {
    super(message);
    this.name = 'TicketingConnectorError';
  }
}

/**
 * Ticketing connector factory
 */
export class TicketingConnectorFactory {
  private static connectors: Map<string, BaseTicketingConnector> = new Map();

  /**
   * Get or create ticketing connector
   */
  static getConnector(config: TicketingConnectorConfig): BaseTicketingConnector {
    const cacheKey = `${config.provider}:${config.credentials.subdomain || config.credentials.apiKey}`;

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
    config: TicketingConnectorConfig,
    connector: BaseTicketingConnector
  ): void {
    const cacheKey = `${config.provider}:${config.credentials.subdomain || config.credentials.apiKey}`;
    this.connectors.set(cacheKey, connector);
  }

  /**
   * Clear connector cache
   */
  static clearCache(): void {
    this.connectors.clear();
  }
}
