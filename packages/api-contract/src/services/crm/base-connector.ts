/**
 * Phase 12 Week 5: CRM Integration - Base Connector Abstraction
 *
 * Provides unified interface for CRM integrations (Salesforce, HubSpot, etc.)
 */

import { createModuleLogger } from '@platform/shared';

// Removed unused module-level logger - each connector instance has its own logger

/**
 * CRM Contact representation
 */
export interface CRMContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CRM Case/Ticket representation
 */
export interface CRMCase {
  id: string;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contactId: string;
  assigneeId?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create contact input
 */
export interface CreateContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  customFields?: Record<string, any>;
}

/**
 * Update contact input
 */
export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  customFields?: Record<string, any>;
}

/**
 * Create case input
 */
export interface CreateCaseInput {
  subject: string;
  description: string;
  contactId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  customFields?: Record<string, any>;
}

/**
 * Update case input
 */
export interface UpdateCaseInput {
  subject?: string;
  description?: string;
  status?: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  customFields?: Record<string, any>;
}

/**
 * CRM connector configuration
 */
export interface CRMConnectorConfig {
  provider: 'salesforce' | 'hubspot' | 'zendesk' | 'freshdesk';
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    instanceUrl?: string;
    [key: string]: any;
  };
  options?: {
    timeout?: number;
    retryAttempts?: number;
    customFieldMappings?: Record<string, string>;
  };
}

/**
 * Base CRM connector interface
 * All CRM integrations must implement this interface
 */
export abstract class BaseCRMConnector {
  protected config: CRMConnectorConfig;
  protected logger: ReturnType<typeof createModuleLogger>;

  constructor(config: CRMConnectorConfig) {
    this.config = config;
    this.logger = createModuleLogger(`CRM:${config.provider}`);
  }

  /**
   * Test connection to CRM
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get contact by email
   */
  abstract getContactByEmail(email: string): Promise<CRMContact | null>;

  /**
   * Get contact by ID
   */
  abstract getContact(id: string): Promise<CRMContact | null>;

  /**
   * Create new contact
   */
  abstract createContact(input: CreateContactInput): Promise<CRMContact>;

  /**
   * Update existing contact
   */
  abstract updateContact(
    id: string,
    input: UpdateContactInput
  ): Promise<CRMContact>;

  /**
   * Search contacts by query
   */
  abstract searchContacts(
    query: string,
    limit?: number
  ): Promise<CRMContact[]>;

  /**
   * Get case by ID
   */
  abstract getCase(id: string): Promise<CRMCase | null>;

  /**
   * Create new case/ticket
   */
  abstract createCase(input: CreateCaseInput): Promise<CRMCase>;

  /**
   * Update existing case/ticket
   */
  abstract updateCase(id: string, input: UpdateCaseInput): Promise<CRMCase>;

  /**
   * Get cases for contact
   */
  abstract getCasesForContact(
    contactId: string,
    limit?: number
  ): Promise<CRMCase[]>;

  /**
   * Add note/comment to case
   */
  abstract addCaseComment(caseId: string, comment: string): Promise<void>;

  /**
   * Helper: Map custom fields from our format to CRM-specific format
   */
  protected mapCustomFields(
    fields: Record<string, any>
  ): Record<string, any> {
    const mappings = this.config.options?.customFieldMappings || {};
    const mapped: Record<string, any> = {};

    for (const [key, value] of Object.entries(fields)) {
      const mappedKey = mappings[key] || key;
      mapped[mappedKey] = value;
    }

    return mapped;
  }

  /**
   * Helper: Reverse map custom fields from CRM format to our format
   */
  protected unmapCustomFields(
    fields: Record<string, any>
  ): Record<string, any> {
    const mappings = this.config.options?.customFieldMappings || {};
    const reverseMappings = Object.fromEntries(
      Object.entries(mappings).map(([k, v]) => [v, k])
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

    throw new CRMConnectorError(
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
 * CRM connector error
 */
export class CRMConnectorError extends Error {
  constructor(
    message: string,
    public details: {
      provider: string;
      operation: string;
      originalError?: any;
    }
  ) {
    super(message);
    this.name = 'CRMConnectorError';
  }
}

/**
 * CRM connector factory
 */
export class CRMConnectorFactory {
  private static connectors: Map<string, BaseCRMConnector> = new Map();

  /**
   * Get or create CRM connector
   */
  static getConnector(config: CRMConnectorConfig): BaseCRMConnector {
    const cacheKey = `${config.provider}:${config.credentials.instanceUrl || config.credentials.apiKey}`;

    if (this.connectors.has(cacheKey)) {
      return this.connectors.get(cacheKey)!;
    }

    // Dynamic import based on provider
    // Actual implementation would use dynamic imports
    throw new Error(
      `Connector for ${config.provider} not yet loaded. Use registerConnector() first.`
    );
  }

  /**
   * Register connector instance
   */
  static registerConnector(
    config: CRMConnectorConfig,
    connector: BaseCRMConnector
  ): void {
    const cacheKey = `${config.provider}:${config.credentials.instanceUrl || config.credentials.apiKey}`;
    this.connectors.set(cacheKey, connector);
  }

  /**
   * Clear connector cache
   */
  static clearCache(): void {
    this.connectors.clear();
  }
}
