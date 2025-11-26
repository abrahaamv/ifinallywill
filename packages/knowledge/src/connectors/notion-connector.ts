/**
 * Phase 12 Week 7: Notion Knowledge Base Connector
 *
 * Implements Notion API v1
 * https://developers.notion.com/reference/intro
 */

import {
  BaseKnowledgeConnector,
  type Document,
  type Space,
} from './base-connector';

/**
 * Notion API response types
 */
interface NotionDatabase {
  id: string;
  title: Array<{
    type: 'text';
    text: { content: string };
  }>;
  description: Array<{
    type: 'text';
    text: { content: string };
  }>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionPage {
  id: string;
  parent: {
    type: 'database_id' | 'page_id' | 'workspace';
    database_id?: string;
    page_id?: string;
  };
  properties: {
    title?: {
      type: 'title';
      title: Array<{
        text: { content: string };
      }>;
    };
    [key: string]: any;
  };
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionBlock {
  id: string;
  type: string;
  [key: string]: any;
}

/**
 * Notion Knowledge Connector
 */
export class NotionConnector extends BaseKnowledgeConnector {
  private apiUrl = 'https://api.notion.com/v1';
  private notionVersion = '2022-06-28';

  /**
   * Get authentication header
   */
  private getAuthHeader(): string {
    const { apiToken, accessToken } = this.config.credentials;

    if (accessToken) {
      return `Bearer ${accessToken}`;
    }

    if (apiToken) {
      return `Bearer ${apiToken}`;
    }

    throw new Error('Notion credentials required (apiToken or accessToken)');
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const timeout = this.config.options?.timeout || 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Notion-Version': this.notionVersion,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(
          errorData.message || `Notion API error: ${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Test Notion connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('POST', '/search', { page_size: 1 });
      return true;
    } catch (error) {
      this.logger.error('Notion connection test failed', { error });
      return false;
    }
  }

  /**
   * Map Notion database to Space
   */
  private mapDatabase(db: NotionDatabase): Space {
    const title = db.title[0]?.text?.content || 'Untitled';
    const description = db.description[0]?.text?.content;

    return {
      id: db.id,
      name: title,
      description,
      url: db.url,
      metadata: {
        type: 'database',
      },
    };
  }

  /**
   * Map Notion page to Document
   */
  private async mapPage(page: NotionPage): Promise<Document> {
    // Get title from properties
    const titleProp = page.properties.title || page.properties.Name;
    const title = titleProp?.title?.[0]?.text?.content || 'Untitled';

    // Fetch page content (blocks)
    const content = await this.getPageContent(page.id);

    return {
      id: page.id,
      title,
      content,
      contentType: 'text/markdown',
      url: page.url,
      parentId:
        page.parent.type === 'database_id'
          ? page.parent.database_id
          : page.parent.type === 'page_id'
            ? page.parent.page_id
            : undefined,
      metadata: {
        parentType: page.parent.type,
      },
      createdAt: new Date(page.created_time),
      updatedAt: new Date(page.last_edited_time),
    };
  }

  /**
   * Get page content as markdown
   */
  private async getPageContent(pageId: string): Promise<string> {
    const blocks: string[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request<{
        results: NotionBlock[];
        next_cursor?: string;
      }>(
        'GET',
        `/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ''}`
      );

      for (const block of response.results) {
        const text = this.blockToMarkdown(block);
        if (text) {
          blocks.push(text);
        }
      }

      cursor = response.next_cursor || undefined;
    } while (cursor);

    return blocks.join('\n\n');
  }

  /**
   * Convert Notion block to markdown
   */
  private blockToMarkdown(block: NotionBlock): string {
    switch (block.type) {
      case 'paragraph':
        return this.richTextToString(block.paragraph?.rich_text);
      case 'heading_1':
        return `# ${this.richTextToString(block.heading_1?.rich_text)}`;
      case 'heading_2':
        return `## ${this.richTextToString(block.heading_2?.rich_text)}`;
      case 'heading_3':
        return `### ${this.richTextToString(block.heading_3?.rich_text)}`;
      case 'bulleted_list_item':
        return `- ${this.richTextToString(block.bulleted_list_item?.rich_text)}`;
      case 'numbered_list_item':
        return `1. ${this.richTextToString(block.numbered_list_item?.rich_text)}`;
      case 'code':
        return `\`\`\`${block.code?.language || ''}\n${this.richTextToString(block.code?.rich_text)}\n\`\`\``;
      case 'quote':
        return `> ${this.richTextToString(block.quote?.rich_text)}`;
      default:
        return '';
    }
  }

  /**
   * Convert Notion rich text to string
   */
  private richTextToString(richText: any[]): string {
    if (!richText) return '';
    return richText.map((rt) => rt.text?.content || '').join('');
  }

  /**
   * List all databases (spaces)
   */
  async listSpaces(): Promise<Space[]> {
    const databases: Space[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request<{
        results: NotionDatabase[];
        next_cursor?: string;
      }>('POST', '/search', {
        filter: { property: 'object', value: 'database' },
        page_size: 100,
        start_cursor: cursor,
      });

      databases.push(
        ...response.results.map((db) => this.mapDatabase(db))
      );

      cursor = response.next_cursor || undefined;
    } while (cursor);

    return databases;
  }

  /**
   * Get database by ID
   */
  async getSpace(id: string): Promise<Space | null> {
    try {
      const database = await this.request<NotionDatabase>(
        'GET',
        `/databases/${id}`
      );
      return this.mapDatabase(database);
    } catch (error) {
      this.logger.warn('Database not found', { id });
      return null;
    }
  }

  /**
   * List pages in a database
   */
  async listDocuments(
    spaceId: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    documents: Document[];
    nextCursor?: string;
  }> {
    const response = await this.request<{
      results: NotionPage[];
      next_cursor?: string;
    }>('POST', `/databases/${spaceId}/query`, {
      page_size: options?.limit || 100,
      start_cursor: options?.cursor,
    });

    const documents = await Promise.all(
      response.results.map((page) => this.mapPage(page))
    );

    return {
      documents,
      nextCursor: response.next_cursor || undefined,
    };
  }

  /**
   * Get page by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const page = await this.request<NotionPage>('GET', `/pages/${id}`);
      return await this.mapPage(page);
    } catch (error) {
      this.logger.warn('Page not found', { id });
      return null;
    }
  }

  /**
   * Search pages
   */
  async searchDocuments(
    query: string,
    options?: {
      spaceId?: string;
      limit?: number;
    }
  ): Promise<Document[]> {
    const response = await this.request<{
      results: NotionPage[];
    }>('POST', '/search', {
      query,
      filter: { property: 'object', value: 'page' },
      page_size: options?.limit || 100,
    });

    const documents = await Promise.all(
      response.results
        .filter((page) => {
          // Filter by database if specified
          if (options?.spaceId) {
            return (
              page.parent.type === 'database_id' &&
              page.parent.database_id === options.spaceId
            );
          }
          return true;
        })
        .map((page) => this.mapPage(page))
    );

    return documents;
  }

  /**
   * Get page changes since timestamp
   */
  async getChanges(since: Date): Promise<{
    created: Document[];
    updated: Document[];
    deleted: string[];
  }> {
    // Notion doesn't have a direct "changes" API
    // We need to search for recently edited pages
    const response = await this.request<{
      results: NotionPage[];
    }>('POST', '/search', {
      filter: { property: 'object', value: 'page' },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
      page_size: 100,
    });

    const sinceTime = since.getTime();
    const created: Document[] = [];
    const updated: Document[] = [];

    for (const page of response.results) {
      const createdTime = new Date(page.created_time).getTime();
      const updatedTime = new Date(page.last_edited_time).getTime();

      if (updatedTime < sinceTime) {
        break; // No more recent pages
      }

      const document = await this.mapPage(page);

      if (createdTime >= sinceTime) {
        created.push(document);
      } else {
        updated.push(document);
      }
    }

    return {
      created,
      updated,
      deleted: [], // Notion doesn't provide deleted pages
    };
  }
}
