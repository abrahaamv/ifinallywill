/**
 * Phase 12 Week 7: Confluence Knowledge Base Connector
 *
 * Implements Confluence Cloud REST API v2
 * https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
 */

import {
  BaseKnowledgeConnector,
  type Document,
  type Space,
} from './base-connector';

/**
 * Confluence API response types
 */
interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  description?: {
    plain: {
      value: string;
    };
  };
  _links: {
    webui: string;
  };
}

interface ConfluencePage {
  id: string;
  status: string;
  title: string;
  spaceId: string;
  parentId?: string;
  authorId: string;
  createdAt: string;
  version: {
    number: number;
    message?: string;
    createdAt: string;
  };
  body?: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
  _links: {
    webui: string;
  };
}

/**
 * Confluence Knowledge Connector
 */
export class ConfluenceConnector extends BaseKnowledgeConnector {
  /**
   * Get Confluence API base URL
   */
  private getApiUrl(): string {
    const siteUrl = this.config.credentials.siteUrl;
    if (!siteUrl) {
      throw new Error('Confluence site URL required');
    }
    return `${siteUrl}/wiki/api/v2`;
  }

  /**
   * Get authentication header
   */
  private getAuthHeader(): string {
    const { email, apiToken, accessToken } = this.config.credentials;

    if (email && apiToken) {
      // Basic auth (email + API token)
      const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
      return `Basic ${credentials}`;
    }

    if (accessToken) {
      // OAuth 2.0
      return `Bearer ${accessToken}`;
    }

    throw new Error('Confluence credentials required (email + apiToken or accessToken)');
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.getApiUrl()}${endpoint}`;
    const timeout = this.config.options?.timeout || 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(
          errorData.message || `Confluence API error: ${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Test Confluence connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/spaces?limit=1');
      return true;
    } catch (error) {
      this.logger.error('Confluence connection test failed', { error });
      return false;
    }
  }

  /**
   * Map Confluence space to Space
   */
  private mapSpace(cfSpace: ConfluenceSpace): Space {
    return {
      id: cfSpace.id,
      name: cfSpace.name,
      description: cfSpace.description?.plain?.value,
      url: `${this.config.credentials.siteUrl}${cfSpace._links.webui}`,
      metadata: {
        key: cfSpace.key,
        type: cfSpace.type,
        status: cfSpace.status,
      },
    };
  }

  /**
   * Map Confluence page to Document
   */
  private mapPage(cfPage: ConfluencePage): Document {
    // Convert Confluence storage format (XHTML) to markdown-like text
    const content = this.extractTextContent(cfPage.body?.storage?.value || '');

    return {
      id: cfPage.id,
      title: cfPage.title,
      content,
      contentType: 'text/html',
      url: `${this.config.credentials.siteUrl}${cfPage._links.webui}`,
      parentId: cfPage.parentId,
      path: `/${cfPage.spaceId}/${cfPage.id}`,
      metadata: {
        spaceId: cfPage.spaceId,
        status: cfPage.status,
        version: cfPage.version.number,
        authorId: cfPage.authorId,
      },
      createdAt: new Date(cfPage.createdAt),
      updatedAt: new Date(cfPage.version.createdAt),
    };
  }

  /**
   * Extract text content from Confluence storage format
   */
  private extractTextContent(html: string): string {
    // Basic HTML tag removal (in production, use proper HTML parser)
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * List all spaces
   */
  async listSpaces(): Promise<Space[]> {
    const spaces: Space[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request<{
        results: ConfluenceSpace[];
        _links: {
          next?: string;
        };
      }>(
        'GET',
        `/spaces?limit=100${cursor ? `&cursor=${cursor}` : ''}`
      );

      spaces.push(...response.results.map((space) => this.mapSpace(space)));

      // Extract cursor from next link
      cursor = response._links.next
        ? new URL(response._links.next).searchParams.get('cursor') || undefined
        : undefined;
    } while (cursor);

    return spaces;
  }

  /**
   * Get space by ID
   */
  async getSpace(id: string): Promise<Space | null> {
    try {
      const space = await this.request<ConfluenceSpace>('GET', `/spaces/${id}`);
      return this.mapSpace(space);
    } catch (error) {
      this.logger.warn('Space not found', { id });
      return null;
    }
  }

  /**
   * List documents in a space
   */
  async listDocuments(
    spaceId: string,
    options?: {
      limit?: number;
      cursor?: string;
      includeArchived?: boolean;
    }
  ): Promise<{
    documents: Document[];
    nextCursor?: string;
  }> {
    const limit = options?.limit || 100;
    const status = options?.includeArchived ? 'any' : 'current';

    const response = await this.request<{
      results: ConfluencePage[];
      _links: {
        next?: string;
      };
    }>(
      'GET',
      `/spaces/${spaceId}/pages?limit=${limit}&status=${status}${
        options?.cursor ? `&cursor=${options.cursor}` : ''
      }&body-format=storage`
    );

    const documents = response.results.map((page) => this.mapPage(page));

    const nextCursor = response._links.next
      ? new URL(response._links.next).searchParams.get('cursor') || undefined
      : undefined;

    return {
      documents,
      nextCursor,
    };
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const page = await this.request<ConfluencePage>(
        'GET',
        `/pages/${id}?body-format=storage`
      );
      return this.mapPage(page);
    } catch (error) {
      this.logger.warn('Page not found', { id });
      return null;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(
    query: string,
    options?: {
      spaceId?: string;
      limit?: number;
    }
  ): Promise<Document[]> {
    const limit = options?.limit || 100;
    const spaceFilter = options?.spaceId ? `+space=${options.spaceId}` : '';
    const cql = `type=page+and+text~"${query}"${spaceFilter}`;

    const response = await this.request<{
      results: Array<{
        content: {
          id: string;
        };
      }>;
    }>(
      'GET',
      `/search?cql=${encodeURIComponent(cql)}&limit=${limit}`
    );

    // Fetch full page details for each result
    const documents = await Promise.all(
      response.results.map((result) => this.getDocument(result.content.id))
    );

    return documents.filter((doc): doc is Document => doc !== null);
  }

  /**
   * Get document changes since timestamp
   */
  async getChanges(since: Date): Promise<{
    created: Document[];
    updated: Document[];
    deleted: string[];
  }> {
    // Confluence doesn't have a direct "changes" API, so we query by date
    const sinceStr = since.toISOString();

    // Query created pages
    const createdResponse = await this.request<{
      results: Array<{ content: { id: string } }>;
    }>(
      'GET',
      `/search?cql=${encodeURIComponent(
        `type=page+and+created>="${sinceStr}"`
      )}&limit=100`
    );

    const created = await Promise.all(
      createdResponse.results.map((r) => this.getDocument(r.content.id))
    );

    // Query updated pages
    const updatedResponse = await this.request<{
      results: Array<{ content: { id: string } }>;
    }>(
      'GET',
      `/search?cql=${encodeURIComponent(
        `type=page+and+lastModified>="${sinceStr}"+and+created<"${sinceStr}"`
      )}&limit=100`
    );

    const updated = await Promise.all(
      updatedResponse.results.map((r) => this.getDocument(r.content.id))
    );

    // Note: Confluence doesn't provide deleted pages list easily
    // Would need to track deleted pages separately

    return {
      created: created.filter((doc): doc is Document => doc !== null),
      updated: updated.filter((doc): doc is Document => doc !== null),
      deleted: [],
    };
  }
}
