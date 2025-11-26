/**
 * Phase 12 Week 7: Google Drive Knowledge Base Connector
 *
 * Implements Google Drive API v3
 * https://developers.google.com/drive/api/v3/reference
 */

import {
  BaseKnowledgeConnector,
  type Document,
  type Space,
} from './base-connector';

/**
 * Google Drive API response types
 */
interface DriveFolder {
  id: string;
  name: string;
  description?: string;
  webViewLink: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  webViewLink: string;
  parents?: string[];
  owners?: Array<{ displayName: string; emailAddress: string }>;
  createdTime: string;
  modifiedTime: string;
}

/**
 * Google Drive Knowledge Connector
 */
export class GoogleDriveConnector extends BaseKnowledgeConnector {
  private apiUrl = 'https://www.googleapis.com/drive/v3';
  private docsApiUrl = 'https://docs.googleapis.com/v1';

  /**
   * Supported Google document types
   */
  private supportedMimeTypes = [
    'application/vnd.google-apps.document', // Google Docs
    'application/vnd.google-apps.spreadsheet', // Google Sheets
    'application/vnd.google-apps.presentation', // Google Slides
    'text/plain',
    'text/markdown',
  ];

  /**
   * Get authentication header
   */
  private getAuthHeader(): string {
    const { accessToken } = this.config.credentials;

    if (!accessToken) {
      throw new Error('Google Drive access token required');
    }

    return `Bearer ${accessToken}`;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    url: string,
    body?: any
  ): Promise<T> {
    const timeout = this.config.options?.timeout || 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new Error(
          errorData.error?.message || `Google Drive API error: ${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${url}`);
    }
  }

  /**
   * Test Google Drive connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', `${this.apiUrl}/about?fields=user`);
      return true;
    } catch (error) {
      this.logger.error('Google Drive connection test failed', { error });
      return false;
    }
  }

  /**
   * Map Drive folder to Space
   */
  private mapFolder(folder: DriveFolder): Space {
    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      url: folder.webViewLink,
      parentId: folder.parents?.[0],
      metadata: {
        type: 'folder',
      },
    };
  }

  /**
   * Map Drive file to Document
   */
  private async mapFile(file: DriveFile): Promise<Document> {
    // Fetch file content
    const content = await this.getFileContent(file);

    return {
      id: file.id,
      title: file.name,
      content,
      contentType: this.getContentType(file.mimeType),
      url: file.webViewLink,
      parentId: file.parents?.[0],
      author: file.owners?.[0]?.displayName,
      metadata: {
        mimeType: file.mimeType,
        ownerEmail: file.owners?.[0]?.emailAddress,
      },
      createdAt: new Date(file.createdTime),
      updatedAt: new Date(file.modifiedTime),
    };
  }

  /**
   * Get content type for MIME type
   */
  private getContentType(
    mimeType: string
  ): 'text/plain' | 'text/markdown' | 'text/html' {
    if (mimeType === 'text/markdown') {
      return 'text/markdown';
    }
    if (mimeType.startsWith('application/vnd.google-apps')) {
      return 'text/html';
    }
    return 'text/plain';
  }

  /**
   * Get file content
   */
  private async getFileContent(file: DriveFile): Promise<string> {
    try {
      if (file.mimeType === 'application/vnd.google-apps.document') {
        // Google Docs - use Docs API
        return await this.getGoogleDocContent(file.id);
      }

      if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Google Sheets - export as CSV
        return await this.exportFile(file.id, 'text/csv');
      }

      if (file.mimeType === 'application/vnd.google-apps.presentation') {
        // Google Slides - export as plain text
        return await this.exportFile(file.id, 'text/plain');
      }

      // Plain text files
      return await this.exportFile(file.id, file.mimeType);
    } catch (error: any) {
      this.logger.error('Failed to get file content', {
        fileId: file.id,
        error: error.message,
      });
      return '';
    }
  }

  /**
   * Get Google Doc content as markdown
   */
  private async getGoogleDocContent(docId: string): Promise<string> {
    const doc = await this.request<{
      body: {
        content: Array<{
          paragraph?: {
            elements: Array<{
              textRun?: { content: string };
            }>;
          };
        }>;
      };
    }>('GET', `${this.docsApiUrl}/documents/${docId}`);

    // Extract text from document structure
    const paragraphs = doc.body.content
      .filter((item) => item.paragraph)
      .map((item) => {
        const text = item.paragraph!.elements
          .map((el) => el.textRun?.content || '')
          .join('');
        return text.trim();
      })
      .filter((text) => text.length > 0);

    return paragraphs.join('\n\n');
  }

  /**
   * Export file to specific format
   */
  private async exportFile(fileId: string, mimeType: string): Promise<string> {
    const response = await fetch(
      `${this.apiUrl}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`,
      {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to export file: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * List all folders (spaces)
   */
  async listSpaces(): Promise<Space[]> {
    const folders: Space[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.request<{
        files: DriveFolder[];
        nextPageToken?: string;
      }>(
        'GET',
        `${this.apiUrl}/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false")}&pageSize=100&fields=files(id,name,description,webViewLink,parents,createdTime,modifiedTime),nextPageToken${pageToken ? `&pageToken=${pageToken}` : ''}`
      );

      folders.push(...response.files.map((folder) => this.mapFolder(folder)));

      pageToken = response.nextPageToken;
    } while (pageToken);

    return folders;
  }

  /**
   * Get folder by ID
   */
  async getSpace(id: string): Promise<Space | null> {
    try {
      const folder = await this.request<DriveFolder>(
        'GET',
        `${this.apiUrl}/files/${id}?fields=id,name,description,webViewLink,parents,createdTime,modifiedTime`
      );
      return this.mapFolder(folder);
    } catch (error) {
      this.logger.warn('Folder not found', { id });
      return null;
    }
  }

  /**
   * List documents in a folder
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
    const mimeTypeQuery = this.supportedMimeTypes
      .map((mt) => `mimeType='${mt}'`)
      .join(' or ');

    const response = await this.request<{
      files: DriveFile[];
      nextPageToken?: string;
    }>(
      'GET',
      `${this.apiUrl}/files?q=${encodeURIComponent(`'${spaceId}' in parents and (${mimeTypeQuery}) and trashed=false`)}&pageSize=${options?.limit || 100}&fields=files(id,name,mimeType,description,webViewLink,parents,owners,createdTime,modifiedTime),nextPageToken${options?.cursor ? `&pageToken=${options.cursor}` : ''}`
    );

    const documents = await Promise.all(
      response.files.map((file) => this.mapFile(file))
    );

    return {
      documents,
      nextCursor: response.nextPageToken,
    };
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const file = await this.request<DriveFile>(
        'GET',
        `${this.apiUrl}/files/${id}?fields=id,name,mimeType,description,webViewLink,parents,owners,createdTime,modifiedTime`
      );
      return await this.mapFile(file);
    } catch (error) {
      this.logger.warn('File not found', { id });
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
    const mimeTypeQuery = this.supportedMimeTypes
      .map((mt) => `mimeType='${mt}'`)
      .join(' or ');

    const folderQuery = options?.spaceId
      ? ` and '${options.spaceId}' in parents`
      : '';

    const response = await this.request<{
      files: DriveFile[];
    }>(
      'GET',
      `${this.apiUrl}/files?q=${encodeURIComponent(`fullText contains '${query}' and (${mimeTypeQuery}) and trashed=false${folderQuery}`)}&pageSize=${options?.limit || 100}&fields=files(id,name,mimeType,description,webViewLink,parents,owners,createdTime,modifiedTime)`
    );

    const documents = await Promise.all(
      response.files.map((file) => this.mapFile(file))
    );

    return documents;
  }

  /**
   * Get document changes since timestamp
   */
  async getChanges(since: Date): Promise<{
    created: Document[];
    updated: Document[];
    deleted: string[];
  }> {
    const sinceStr = since.toISOString();
    const mimeTypeQuery = this.supportedMimeTypes
      .map((mt) => `mimeType='${mt}'`)
      .join(' or ');

    // Query created files
    const createdResponse = await this.request<{ files: DriveFile[] }>(
      'GET',
      `${this.apiUrl}/files?q=${encodeURIComponent(`createdTime>'${sinceStr}' and (${mimeTypeQuery}) and trashed=false`)}&pageSize=100&fields=files(id,name,mimeType,description,webViewLink,parents,owners,createdTime,modifiedTime)`
    );

    const created = await Promise.all(
      createdResponse.files.map((file) => this.mapFile(file))
    );

    // Query updated files
    const updatedResponse = await this.request<{ files: DriveFile[] }>(
      'GET',
      `${this.apiUrl}/files?q=${encodeURIComponent(`modifiedTime>'${sinceStr}' and createdTime<'${sinceStr}' and (${mimeTypeQuery}) and trashed=false`)}&pageSize=100&fields=files(id,name,mimeType,description,webViewLink,parents,owners,createdTime,modifiedTime)`
    );

    const updated = await Promise.all(
      updatedResponse.files.map((file) => this.mapFile(file))
    );

    // Query trashed files (deleted)
    const deletedResponse = await this.request<{ files: DriveFile[] }>(
      'GET',
      `${this.apiUrl}/files?q=${encodeURIComponent(`modifiedTime>'${sinceStr}' and trashed=true`)}&pageSize=100&fields=files(id)`
    );

    return {
      created,
      updated,
      deleted: deletedResponse.files.map((f) => f.id),
    };
  }
}
