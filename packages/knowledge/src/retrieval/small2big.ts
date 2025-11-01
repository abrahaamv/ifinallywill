/**
 * Phase 12 Week 1: Small2Big Retrieval Pattern
 * Search at child level for precision, expand to parent for context
 */

import { eq, inArray, sql } from 'drizzle-orm';
import { db, knowledgeChunks } from '@platform/db';

export interface Chunk {
  id: string;
  text: string;
  tokenCount: number;
  parentId?: string | null;
  documentId: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentHierarchy {
  parentId: string;
  childChunks: Chunk[];
  parentChunk: Chunk;
}

export class Small2BigRetriever {
  constructor(
    private database: typeof db,
    private tenantId: string
  ) {}

  async retrieve(query: string, topK: number = 10): Promise<Chunk[]> {
    // Search child chunks (256 tokens)
    const childResults = await this.searchChildLevel(query, topK);

    // Expand to parent chunks (512 tokens) for top-5
    const parentChunks = await this.expandToParents(childResults.slice(0, 5));

    return parentChunks;
  }

  private async searchChildLevel(_query: string, topK: number): Promise<Chunk[]> {
    // TODO: Integrate with semantic search from hybrid-search.ts
    // For now, return child-level chunks only
    const results = await this.database
      .select()
      .from(knowledgeChunks)
      .where(sql`tenant_id = ${this.tenantId}`)
      .limit(topK);

    return results.map((chunk: typeof knowledgeChunks.$inferSelect) => ({
      id: chunk.id,
      text: chunk.content,
      tokenCount: chunk.metadata?.chunkSize || 256,
      parentId: null,  // TODO: Add parent_chunk_id column to knowledge_chunks schema
      documentId: chunk.documentId,
      metadata: chunk.metadata as Record<string, unknown> | undefined
    }));
  }

  private async expandToParents(childChunks: Chunk[]): Promise<Chunk[]> {
    // Filter chunks that have parents
    const chunksWithParents = childChunks.filter(c => c.parentId != null);

    if (chunksWithParents.length === 0) {
      return childChunks; // No parents, return children
    }

    const parentIds = Array.from(new Set(chunksWithParents.map(c => c.parentId!)));

    const parents = await this.database
      .select()
      .from(knowledgeChunks)
      .where(inArray(knowledgeChunks.id, parentIds));

    return parents.map((chunk: typeof knowledgeChunks.$inferSelect) => ({
      id: chunk.id,
      text: chunk.content,
      tokenCount: chunk.metadata?.chunkSize || 512,
      parentId: null, // TODO: Add parent_chunk_id column
      documentId: chunk.documentId,
      metadata: chunk.metadata as Record<string, unknown> | undefined
    }));
  }

  async getHierarchy(chunkId: string): Promise<DocumentHierarchy | null> {
    const chunk = await this.database.query.knowledgeChunks.findFirst({
      where: eq(knowledgeChunks.id, chunkId)
    });

    if (!chunk) {
      return null;
    }

    // TODO: Implement parent-child hierarchy when parent_chunk_id column is added
    // For now, return null since we don't have the column yet
    return null;
  }
}
