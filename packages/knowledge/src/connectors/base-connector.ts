/**
 * Phase 12 Week 7: Knowledge Base Connectors - Base Abstraction
 *
 * Provides unified interface for knowledge base integrations
 * (Confluence, Notion, Google Drive, SharePoint, etc.)
 */

import { createModuleLogger } from '@platform/shared';

/**
 * Document representation
 */
export interface Document {
  id: string;
  title: string;
  content: string;
  contentType: 'text/plain' | 'text/markdown' | 'text/html';
  url?: string;
  parentId?: string;
  path?: string;
  author?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Space/Folder representation
 */
export interface Space {
  id: string;
  name: string;
  description?: string;
  url?: string;
  parentId?: string;
  metadata?: Record<string, any>;
}

/**
 * Sync status
 */
export interface SyncStatus {
  lastSyncAt: Date;
  documentsProcessed: number;
  documentsFailed: number;
  errors?: Array<{
    documentId: string;
    error: string;
  }>;
}

/**
 * Knowledge connector configuration
 */
export interface KnowledgeConnectorConfig {
  provider: 'confluence' | 'notion' | 'google-drive' | 'sharepoint' | 'dropbox';
  credentials: {
    apiKey?: string;
    apiToken?: string;
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    email?: string;
    siteUrl?: string;
    [key: string]: any;
  };
  options?: {
    timeout?: number;
    retryAttempts?: number;
    syncInterval?: number; // Minutes between syncs
    includeArchived?: boolean;
    includeDrafts?: boolean;
    spaceFilter?: string[]; // Whitelist of space IDs
    excludeSpaces?: string[]; // Blacklist of space IDs
  };
}

/**
 * Base knowledge connector interface
 * All knowledge base integrations must implement this interface
 */
export abstract class BaseKnowledgeConnector {
  protected config: KnowledgeConnectorConfig;
  protected logger: ReturnType<typeof createModuleLogger>;

  constructor(config: KnowledgeConnectorConfig) {
    this.config = config;
    this.logger = createModuleLogger(`Knowledge:${config.provider}`);
  }

  /**
   * Test connection to knowledge base
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * List all available spaces/folders
   */
  abstract listSpaces(): Promise<Space[]>;

  /**
   * Get space by ID
   */
  abstract getSpace(id: string): Promise<Space | null>;

  /**
   * List documents in a space
   */
  abstract listDocuments(
    spaceId: string,
    options?: {
      limit?: number;
      cursor?: string;
      includeArchived?: boolean;
    }
  ): Promise<{
    documents: Document[];
    nextCursor?: string;
  }>;

  /**
   * Get document by ID
   */
  abstract getDocument(id: string): Promise<Document | null>;

  /**
   * Search documents
   */
  abstract searchDocuments(
    query: string,
    options?: {
      spaceId?: string;
      limit?: number;
    }
  ): Promise<Document[]>;

  /**
   * Get document changes since timestamp
   */
  abstract getChanges(since: Date): Promise<{
    created: Document[];
    updated: Document[];
    deleted: string[];
  }>;

  /**
   * Sync all documents from knowledge base
   * Returns sync status
   */
  async syncAll(
    onDocument: (document: Document) => Promise<void>
  ): Promise<SyncStatus> {
    const startTime = new Date();
    let documentsProcessed = 0;
    let documentsFailed = 0;
    const errors: Array<{ documentId: string; error: string }> = [];

    try {
      // Get all spaces
      const spaces = await this.listSpaces();
      const filteredSpaces = this.filterSpaces(spaces);

      this.logger.info('Starting sync', {
        provider: this.config.provider,
        spaces: filteredSpaces.length,
      });

      // Process each space
      for (const space of filteredSpaces) {
        try {
          await this.syncSpace(space.id, onDocument, (success) => {
            if (success) {
              documentsProcessed++;
            } else {
              documentsFailed++;
            }
          });
        } catch (error: any) {
          this.logger.error('Failed to sync space', {
            spaceId: space.id,
            error: error.message,
          });
          errors.push({
            documentId: space.id,
            error: error.message,
          });
        }
      }

      return {
        lastSyncAt: startTime,
        documentsProcessed,
        documentsFailed,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      this.logger.error('Sync failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Sync single space
   */
  private async syncSpace(
    spaceId: string,
    onDocument: (document: Document) => Promise<void>,
    onProgress: (success: boolean) => void
  ): Promise<void> {
    let cursor: string | undefined;

    do {
      const result = await this.listDocuments(spaceId, {
        cursor,
        includeArchived: this.config.options?.includeArchived,
      });

      // Process documents in batch
      await Promise.all(
        result.documents.map(async (doc) => {
          try {
            await onDocument(doc);
            onProgress(true);
          } catch (error: any) {
            this.logger.error('Failed to process document', {
              documentId: doc.id,
              error: error.message,
            });
            onProgress(false);
          }
        })
      );

      cursor = result.nextCursor;
    } while (cursor);
  }

  /**
   * Filter spaces based on configuration
   */
  private filterSpaces(spaces: Space[]): Space[] {
    const { spaceFilter, excludeSpaces } = this.config.options || {};

    let filtered = spaces;

    // Apply whitelist
    if (spaceFilter && spaceFilter.length > 0) {
      filtered = filtered.filter((space) => spaceFilter.includes(space.id));
    }

    // Apply blacklist
    if (excludeSpaces && excludeSpaces.length > 0) {
      filtered = filtered.filter((space) => !excludeSpaces.includes(space.id));
    }

    return filtered;
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

    throw new KnowledgeConnectorError(
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
 * Knowledge connector error
 */
export class KnowledgeConnectorError extends Error {
  constructor(
    message: string,
    public details: {
      provider: string;
      operation: string;
      originalError?: any;
    }
  ) {
    super(message);
    this.name = 'KnowledgeConnectorError';
  }
}

/**
 * Knowledge connector factory
 */
export class KnowledgeConnectorFactory {
  private static connectors: Map<string, BaseKnowledgeConnector> = new Map();

  /**
   * Get or create knowledge connector
   */
  static getConnector(
    config: KnowledgeConnectorConfig
  ): BaseKnowledgeConnector {
    const cacheKey = `${config.provider}:${config.credentials.siteUrl || config.credentials.apiKey}`;

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
    config: KnowledgeConnectorConfig,
    connector: BaseKnowledgeConnector
  ): void {
    const cacheKey = `${config.provider}:${config.credentials.siteUrl || config.credentials.apiKey}`;
    this.connectors.set(cacheKey, connector);
  }

  /**
   * Clear connector cache
   */
  static clearCache(): void {
    this.connectors.clear();
  }
}
