# RAG Chat Workflow Documentation

> **Enterprise AI Assistant Platform - Technical Documentation**
> **Version**: Phase 12 (Week 11)
> **Last Updated**: 2025-11-25

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Complete Workflow: User Query to AI Response](#3-complete-workflow-user-query-to-ai-response)
4. [Component Deep Dives](#4-component-deep-dives)
5. [Database Schema Reference](#5-database-schema-reference)
6. [API Endpoint Definitions](#6-api-endpoint-definitions)
7. [Configuration Parameters](#7-configuration-parameters)
8. [Performance Optimizations](#8-performance-optimizations)
9. [Error Handling & Resilience](#9-error-handling--resilience)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Security Implementation](#11-security-implementation)
12. [Extending the System](#12-extending-the-system)

---

## 1. System Overview

The RAG (Retrieval-Augmented Generation) chat system is an enterprise-grade conversational AI that combines knowledge base retrieval with large language model generation to provide accurate, contextual responses. The system achieves **75-85% cost reduction** through intelligent model routing while maintaining high-quality outputs.

### Core Capabilities

| Feature | Implementation | Cost Impact |
|---------|---------------|-------------|
| **Hybrid Retrieval** | Semantic (pgvector) + Keyword (BM25) + RRF Fusion | N/A |
| **Cohere Reranking** | 20-40% accuracy improvement | $2/1K searches |
| **Small2Big Retrieval** | 15-20% accuracy improvement | Minimal overhead |
| **Model Routing** | Complexity-based provider selection | 75-85% savings |
| **Prompt Caching** | Anthropic prompt caching | 87% token savings |
| **CRAG Query Refinement** | Corrective RAG for ambiguous queries | Variable |
| **RAGAS Evaluation** | Faithfulness, relevancy, precision, recall | Evaluation cost |

### Technology Stack

```
Frontend:     React 18 + TypeScript + Tailwind CSS v4
API Layer:    Fastify 5.3.2 + tRPC v11
Database:     PostgreSQL 16+ (pgvector for embeddings)
Cache:        Redis Streams (embedding cache, sessions)
Embeddings:   Voyage AI voyage-2 (1024 dimensions)
Reranking:    Cohere rerank-v3.5
LLM:          OpenAI GPT-4o/mini, Anthropic Claude, Google Gemini
```

---

## 2. Architecture Diagram

```
                                    RAG CHAT SYSTEM ARCHITECTURE
                                    ============================

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Landing    │  │  Dashboard   │  │   Meeting    │  │  Widget SDK  │               │
│  │  (port 5173) │  │  (port 5174) │  │  (port 5175) │  │  (port 5176) │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    API LAYER                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────┐    │
│  │                        tRPC Router (packages/api-contract)                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │    │
│  │  │chat.sendMsg │  │chat.stream  │  │sessions.*   │  │knowledge.*  │           │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │    │
│  │         │                │                │                │                    │    │
│  └─────────┼────────────────┼────────────────┼────────────────┼────────────────────┘    │
└────────────┼────────────────┼────────────────┼────────────────┼─────────────────────────┘
             │                │                │                │
             ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROCESSING PIPELINE                                         │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│  │ 1. INPUT PROCESSING                                                                │ │
│  │    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                        │ │
│  │    │   Session   │────▶│   Message   │────▶│    CRAG     │                        │ │
│  │    │ Validation  │     │  Storage    │     │  Refinement │                        │ │
│  │    └─────────────┘     └─────────────┘     └──────┬──────┘                        │ │
│  └───────────────────────────────────────────────────┼───────────────────────────────┘ │
│                                                      │                                  │
│  ┌───────────────────────────────────────────────────┼───────────────────────────────┐ │
│  │ 2. RAG RETRIEVAL (packages/knowledge)             ▼                                │ │
│  │    ┌──────────────────────────────────────────────────────────────────────────┐   │ │
│  │    │                      HybridRetriever                                      │   │ │
│  │    │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                  │   │ │
│  │    │  │   Semantic   │   │   BM25       │   │     RRF      │                  │   │ │
│  │    │  │   Search     │   │   Keyword    │   │   Fusion     │                  │   │ │
│  │    │  │  (pgvector)  │   │   Search     │   │  Algorithm   │                  │   │ │
│  │    │  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                  │   │ │
│  │    │         │                  │                  │                           │   │ │
│  │    │         └──────────────────┴──────────────────┘                           │   │ │
│  │    │                            │                                              │   │ │
│  │    │                            ▼                                              │   │ │
│  │    │              ┌──────────────────────────────┐                             │   │ │
│  │    │              │    Small2BigRetriever        │                             │   │ │
│  │    │              │  (Expand to parent chunks)   │                             │   │ │
│  │    │              └──────────────┬───────────────┘                             │   │ │
│  │    │                             │                                             │   │ │
│  │    │                             ▼                                             │   │ │
│  │    │              ┌──────────────────────────────┐                             │   │ │
│  │    │              │    Cohere Reranker           │                             │   │ │
│  │    │              │  (rerank-v3.5, 20-40% boost) │                             │   │ │
│  │    │              └──────────────────────────────┘                             │   │ │
│  │    └──────────────────────────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│  │ 3. AI ROUTING (packages/ai-core)                                                   │ │
│  │    ┌──────────────────────────────────────────────────────────────────────────┐   │ │
│  │    │                    ComplexityAnalyzer                                     │   │ │
│  │    │  Factors: Entity Count (30%) + Depth (25%) + Specificity (20%)           │   │ │
│  │    │           Technical Terms (15%) + Ambiguity (10%)                        │   │ │
│  │    └──────────────────────────────────┬───────────────────────────────────────┘   │ │
│  │                                       │                                            │ │
│  │    ┌──────────────────────────────────▼───────────────────────────────────────┐   │ │
│  │    │                        AIRouter                                           │   │ │
│  │    │  ┌────────────┐   ┌────────────┐   ┌────────────┐                        │   │ │
│  │    │  │  SIMPLE    │   │ MODERATE   │   │  COMPLEX   │                        │   │ │
│  │    │  │ (70% reqs) │   │ (25% reqs) │   │ (5% reqs)  │                        │   │ │
│  │    │  │            │   │            │   │            │                        │   │ │
│  │    │  │ Gemini     │   │ GPT-4o-mini│   │ Claude     │                        │   │ │
│  │    │  │ Flash      │   │            │   │ Sonnet     │                        │   │ │
│  │    │  │ $0.40/1M   │   │ $0.49/1M   │   │ $11.55/1M  │                        │   │ │
│  │    │  └────────────┘   └────────────┘   └────────────┘                        │   │ │
│  │    └──────────────────────────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│  │ 4. QUALITY ASSURANCE                                                               │ │
│  │    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │ │
│  │    │ Hallucination│────▶│    RAGAS     │────▶│   Response   │                     │ │
│  │    │  Detection   │     │  Evaluation  │     │   Metadata   │                     │ │
│  │    └──────────────┘     └──────────────┘     └──────────────┘                     │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DATA LAYER                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         PostgreSQL 16+ (with pgvector)                            │  │
│  │                                                                                    │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                      │  │
│  │  │    tenants     │  │    sessions    │  │    messages    │                      │  │
│  │  │  (RLS enabled) │  │  (RLS enabled) │  │  (RLS enabled) │                      │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                      │  │
│  │                                                                                    │  │
│  │  ┌──────────────────────────────────┐  ┌──────────────────────────────────────┐  │  │
│  │  │      knowledge_documents         │  │        knowledge_chunks              │  │  │
│  │  │  title, content, category        │  │  content, embedding (1024-dim)       │  │  │
│  │  │  embedding (1024-dim vector)     │  │  parent_chunk_id (Small2Big)         │  │  │
│  │  └──────────────────────────────────┘  └──────────────────────────────────────┘  │  │
│  │                                                                                    │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                      │  │
│  │  │  cost_events   │  │  audit_logs    │  │ rag_evaluations│                      │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                      │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Redis (Streams + Cache)                              │  │
│  │  embedding:query:{tenantId}:{hash}  →  24hr TTL (90% cost reduction)             │  │
│  │  session:{sessionId}                 →  Session cache (85% latency reduction)     │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Workflow: User Query to AI Response

This section traces the complete journey of a user query through the system with detailed technical implementation at each step.

### Use Case Scenario

> **User**: "How do I configure SSL certificates for nginx in a multi-tenant environment?"

### Step-by-Step Workflow

---

#### STEP 1: Request Reception & Session Validation

**Process**: The user sends a chat message via the tRPC API. The system validates the session, checks tenant ownership, and ensures the session is active.

**File**: `packages/api-contract/src/routers/chat.ts:167-183`

```typescript
sendMessage: protectedProcedure.input(sendChatMessageSchema).mutation(async ({ ctx, input }) => {
  // Verify session exists and belongs to tenant (RLS)
  const [session] = await ctx.db
    .select()
    .from(sessions)
    .where(eq(sessions.id, input.sessionId))
    .limit(1);

  if (!session) {
    throw notFound({
      message: 'Session not found or access denied',
    });
  }

  if (session.endedAt) {
    throw badRequest({
      message: 'Cannot send message to ended session',
    });
  }
  // ... continues
```

**Technologies**:
- tRPC v11 for type-safe API
- Drizzle ORM with RLS (Row Level Security)
- Zod validation schemas

**Data Flow**:
```
Client Request → tRPC Router → Session Validation (RLS) → Continue
                                      ↓ (if invalid)
                              TRPCError thrown
```

---

#### STEP 2: User Message Storage

**Process**: The user's message is stored in the database with session linkage for conversation history.

**File**: `packages/api-contract/src/routers/chat.ts:185-203`

```typescript
// Store user message
const [userMessage] = await ctx.db
  .insert(messages)
  .values({
    sessionId: input.sessionId,
    role: 'user',
    content: input.content,
    attachments: input.attachments,
  })
  .returning();

if (!userMessage) {
  throw internalError({
    message: 'Failed to store user message',
  });
}
```

**Database Schema**: `packages/db/src/schema/index.ts:279-374`

```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  attachments: jsonb('attachments').$type<Array<{...}>>(),
  metadata: jsonb('metadata').$type<{...}>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
```

---

#### STEP 3: Conversation History Retrieval

**Process**: Fetch recent conversation messages to provide context for the AI.

**File**: `packages/api-contract/src/routers/chat.ts:209-216`

```typescript
// Get conversation history for AI context
const history = await ctx.db
  .select()
  .from(messages)
  .where(eq(messages.sessionId, input.sessionId))
  .orderBy(messages.timestamp)
  .limit(20); // Last 20 messages for context
```

**Rationale**:
- 20-message limit balances context richness with token costs
- Ordered by timestamp for chronological coherence
- Enables multi-turn conversations

---

#### STEP 4: CRAG Query Evaluation & Refinement (Phase 12)

**Process**: The Corrective RAG (CRAG) system evaluates query confidence and refines ambiguous queries.

**File**: `packages/api-contract/src/routers/chat.ts:218-261`

```typescript
// CRAG Service (Phase 12 Week 11)
const { CRAGService } = await import('../services/crag');
const cragService = new CRAGService();

// Evaluate query confidence and determine if refinement needed
const conversationContext = history.length > 0
  ? {
      conversationHistory: history.map((msg) => `${msg.role}: ${msg.content}`).join('\n'),
    }
  : undefined;

cragEvaluation = await cragService.evaluateQuery(input.content, conversationContext);

// Refine query if confidence is low or medium
if (cragEvaluation.shouldRefine) {
  cragRefinement = await cragService.refineQuery(input.content, cragEvaluation, conversationContext);
  finalQuery = cragRefinement.refinedQuery;
  logger.info('[CRAG] Query refined', {
    original: input.content,
    refined: finalQuery,
    strategy: cragRefinement.strategy,
    confidence: cragRefinement.confidence,
  });
}
```

**CRAG Confidence Levels**:
| Level | Threshold | Action |
|-------|-----------|--------|
| High | > 0.8 | Use original query |
| Medium | 0.5 - 0.8 | Consider refinement |
| Low | < 0.5 | Refine query |

---

#### STEP 5: RAG Query Execution - Hybrid Retrieval

**Process**: Execute RAG query using hybrid retrieval (semantic + keyword search).

**File**: `packages/api-contract/src/routers/chat.ts:263-279`

```typescript
const ragStartTime = Date.now();
const { executeRAGQuery, buildRAGPrompt } = await import('@platform/knowledge');
const ragResult = await executeRAGQuery(ctx.db, {
  query: finalQuery, // Use refined query if available
  topK: 5,
  minScore: 0.7,
});
const ragLatencyMs = Date.now() - ragStartTime;

logger.info('[RAG] Query details', {
  query: input.content,
  chunksRetrieved: ragResult.totalChunks,
  contextLength: ragResult.context.length,
  ragLatency: ragLatencyMs,
  topChunkPreview: ragResult.chunks[0]?.chunk.content.substring(0, 100),
});
```

**Core RAG Engine**: `packages/knowledge/src/rag-query.ts:52-166`

```typescript
export async function executeRAGQuery<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  options: RAGQueryOptions
): Promise<RAGResult> {
  const { query, topK = 5, minScore = 0.7, hybridWeights = { semantic: 0.7, keyword: 0.3 } } = options;

  // Step 1: Generate query embedding using Voyage AI
  const voyageProvider = createVoyageProvider();
  const queryEmbedding = await voyageProvider.embed(query, 'query');

  // Step 2: Semantic search with pgvector
  const semanticResults = await db.execute(sql`
    SELECT
      kc.id, kc.document_id, kc.content, kc.metadata,
      1 - (kc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as semantic_score
    FROM ${knowledgeChunks} kc
    INNER JOIN ${knowledgeDocuments} kd ON kc.document_id = kd.id
    ORDER BY kc.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${topK * 2}
  `);

  // Step 3: Keyword search with PostgreSQL full-text search
  const keywordResults = await db.execute(sql`
    SELECT
      kc.id, kc.document_id, kc.content, kc.metadata,
      ts_rank(to_tsvector('english', kc.content), plainto_tsquery('english', ${query})) as keyword_score
    FROM ${knowledgeChunks} kc
    WHERE to_tsvector('english', kc.content) @@ plainto_tsquery('english', ${query})
    ORDER BY keyword_score DESC
    LIMIT ${topK * 2}
  `);

  // Step 4: Merge and rerank results
  let mergedResults = mergeAndRerank(semanticResults, keywordResults, hybridWeights);

  // ... continues with Cohere reranking and filtering
}
```

---

#### STEP 5a: Enhanced RAG with RRF Fusion

**Process**: For more sophisticated retrieval, use Reciprocal Rank Fusion (RRF).

**File**: `packages/knowledge/src/retrieval/hybrid-search.ts:189-229`

```typescript
private reciprocalRankFusion(
  semantic: RetrievalResult[],
  bm25: RetrievalResult[],
  k: number = 60
): RetrievalResult[] {
  const scores = new Map<string, { score: number; result: RetrievalResult }>();

  // RRF formula: score = Σ(1 / (k + rank_i))
  for (let i = 0; i < semantic.length; i++) {
    const result = semantic[i];
    if (!result) continue;
    const rrfScore = 1 / (k + i + 1);

    if (scores.has(result.id)) {
      const existing = scores.get(result.id)!;
      existing.score += rrfScore;
    } else {
      scores.set(result.id, { score: rrfScore, result });
    }
  }

  // Same for BM25 results
  for (let i = 0; i < bm25.length; i++) {
    const result = bm25[i];
    if (!result) continue;
    const rrfScore = 1 / (k + i + 1);

    if (scores.has(result.id)) {
      scores.get(result.id)!.score += rrfScore;
    } else {
      scores.set(result.id, { score: rrfScore, result });
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ result, score }) => ({ ...result, score }));
}
```

**RRF Algorithm Explanation**:
```
RRF Score = Σ (1 / (k + rank))

Where:
- k = smoothing constant (default: 60)
- rank = position in result list (1-indexed)

Example:
- Document appears at rank 1 in semantic, rank 3 in BM25
- Score = 1/(60+1) + 1/(60+3) = 0.0164 + 0.0159 = 0.0323
```

---

#### STEP 5b: Small2Big Retrieval Expansion

**Process**: Expand child chunks to parent chunks for richer context (15-20% accuracy improvement).

**File**: `packages/knowledge/src/retrieval/small2big.ts:45-138`

```typescript
async expandToParents(childResults: RetrievalResult[]): Promise<RetrievalResult[]> {
  // Extract chunk IDs from results
  const childIds = childResults.map(r => r.id);

  // Get child chunks with parent relationships
  const children = await this.database
    .select()
    .from(knowledgeChunks)
    .where(inArray(knowledgeChunks.id, childIds));

  // Separate chunks with/without parents
  const chunksWithParents = children.filter(c => c.parentChunkId != null);

  if (chunksWithParents.length === 0) {
    return childResults;
  }

  // Get unique parent IDs
  const parentIds = Array.from(new Set(chunksWithParents.map(c => c.parentChunkId!)));

  // Fetch parent chunks
  const parents = await this.database
    .select()
    .from(knowledgeChunks)
    .where(inArray(knowledgeChunks.id, parentIds));

  // Build expanded results with parent content
  const expandedResults = childResults.map(childResult => {
    const child = children.find(c => c.id === childResult.id);
    if (child?.parentChunkId && parentMap.has(child.parentChunkId)) {
      const parent = parentMap.get(child.parentChunkId)!;
      return {
        id: parent.id,
        score: childResult.score, // Inherit child's relevance score
        text: parent.content,
        documentId: parent.documentId,
        metadata: {
          expandedFrom: child.id,
          retrievalStrategy: 'small2big'
        }
      };
    }
    return childResult;
  });

  return uniqueResults;
}
```

**Small2Big Strategy**:
```
┌─────────────────────────────────────────────┐
│              Parent Chunk (512 tokens)       │
│  ┌─────────────────────────────────────┐    │
│  │    Full context for understanding    │    │
│  │    Complete paragraphs/sections      │    │
│  │    Better for complex answers        │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐  │
│  │  Child 1  │  │  Child 2  │  │ Child 3 │  │
│  │ (256 tok) │  │ (256 tok) │  │(256 tok)│  │
│  │  MATCHED  │  │           │  │         │  │
│  └───────────┘  └───────────┘  └─────────┘  │
└─────────────────────────────────────────────┘

Search small (precision) → Return big (context)
```

---

#### STEP 6: Cohere Reranking

**Process**: Apply neural reranking for 20-40% accuracy improvement.

**File**: `packages/knowledge/src/reranker.ts:64-120`

```typescript
async rerank(options: RerankOptions): Promise<RerankResult[]> {
  const { query, documents, topN = 10, model = 'rerank-v3.5' } = options;

  // Cohere rerank API expects array of strings
  const documentTexts = documents.map((doc) => doc.content);

  // Call Cohere Rerank API
  const response = await this.client.rerank({
    model,
    query,
    documents: documentTexts,
    topN: Math.min(topN, documents.length),
  });

  // Map results back to original document IDs
  const results: RerankResult[] = response.results?.map((result) => ({
    id: documents[result.index]?.id ?? '',
    relevanceScore: result.relevanceScore ?? 0,
    index: result.index,
  })) || [];

  logger.info('Cohere reranking completed', {
    query: query.slice(0, 50),
    inputCount: documents.length,
    outputCount: results.length,
    topScore: results[0]?.relevanceScore,
    model,
  });

  return results;
}
```

**Cost**: $2 per 1,000 searches (via `estimateCohereRerankingCost()`)

---

#### STEP 7: Context Assembly & Prompt Engineering

**Process**: Build the enhanced prompt with RAG context and instructions.

**File**: `packages/knowledge/src/rag-query.ts:244-258`

```typescript
export function buildRAGPrompt(query: string, context: string): string {
  return `You are an AI assistant with access to the following knowledge base context. Use this information to answer the user's question accurately and concisely. If the context doesn't contain relevant information, say so and answer based on your general knowledge.

CONTEXT:
${context}

USER QUESTION:
${query}

INSTRUCTIONS:
- Cite specific information from the context when relevant using [1], [2], etc.
- If the context doesn't help, acknowledge that and provide a general answer
- Be concise and direct
- If you're uncertain, say so`;
}
```

**File**: `packages/api-contract/src/routers/chat.ts:282-294`

```typescript
// Build enhanced prompt with RAG context
const enhancedPrompt = buildRAGPrompt(input.content, ragResult.context);

// Convert history to AI format with RAG-enhanced system message
const aiMessages = [
  { role: 'system' as const, content: enhancedPrompt },
  ...history.slice(0, -1).map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  })),
  { role: 'user' as const, content: input.content },
];
```

**Context Format**:
```
[1] First retrieved chunk content...

[2] Second retrieved chunk content...

[3] Third retrieved chunk content...
```

---

#### STEP 8: Complexity Analysis

**Process**: Analyze query complexity to determine optimal model routing.

**File**: `packages/ai-core/src/routing/complexity-analyzer.ts:74-138`

```typescript
analyze(query: string, context?: AnalysisContext): ComplexityScore {
  const normalized = query.toLowerCase();

  // Factor 1: Entity count (30%)
  const entities = this.extractEntities(normalized);
  const entityScore = Math.min(entities.length / 5, 1.0) * 0.3;

  // Factor 2: Query depth (25%)
  const depth = this.calculateDepth(normalized);
  const depthScore = Math.min(depth / 3, 1.0) * 0.25;

  // Factor 3: Specificity (20%)
  const specificity = this.calculateSpecificity(normalized);
  const specificityScore = specificity * 0.2;

  // Factor 4: Technical terms (15%)
  const techTermCount = this.countTechnicalTerms(normalized);
  const techScore = Math.min(techTermCount / 3, 1.0) * 0.15;

  // Factor 5: Ambiguity (10%)
  const ambiguity = this.detectAmbiguity(normalized);
  const ambiguityScore = ambiguity * 0.1;

  const totalScore = entityScore + depthScore + specificityScore + techScore + ambiguityScore;

  // Determine complexity level
  let level: ComplexityLevel;
  if (totalScore < 0.3) {
    level = 'simple';
  } else if (totalScore < 0.6) {
    level = 'moderate';
  } else {
    level = 'complex';
  }

  return { level, score: totalScore, reasoning, factors };
}
```

**Complexity Factors**:

| Factor | Weight | Description |
|--------|--------|-------------|
| Entity Count | 30% | Number of distinct concepts/entities |
| Query Depth | 25% | Nested clauses, multi-step reasoning |
| Specificity | 20% | Precision vs. vagueness |
| Technical Terms | 15% | Domain-specific vocabulary |
| Ambiguity | 10% | Unclear intent, multiple interpretations |

---

#### STEP 9: AI Model Routing

**Process**: Route to optimal AI provider based on complexity analysis.

**File**: `packages/ai-core/src/router.ts:150-189`

```typescript
private selectDefaultProvider(complexity: {
  score: number;
  level: string;
}): RoutingDecision {
  if (complexity.score < 0.4) {
    // 70% of requests: Simple queries
    return {
      provider: 'google',
      model: 'gemini-1.5-flash',
      reasoning: `[DEFAULT] gemini-1.5-flash (complexity: ${complexity.level})`,
      complexityScore: complexity.score,
    };
  }

  if (complexity.score < 0.7) {
    // 25% of requests: Moderate complexity
    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      reasoning: `[DEFAULT] gpt-4o-mini (complexity: ${complexity.level})`,
      complexityScore: complexity.score,
    };
  }

  // 5% of requests: Complex reasoning
  return {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    reasoning: `[DEFAULT] claude-3-5-sonnet (complexity: ${complexity.level})`,
    complexityScore: complexity.score,
  };
}
```

**Routing Strategy**:

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLEXITY SCORE                          │
│                                                              │
│   0.0 ─────── 0.4 ─────── 0.7 ─────── 1.0                   │
│    │           │           │           │                     │
│    │  SIMPLE   │ MODERATE  │  COMPLEX  │                     │
│    │   (70%)   │   (25%)   │   (5%)    │                     │
│    │           │           │           │                     │
│    ▼           ▼           ▼           ▼                     │
│ ┌────────┐ ┌────────┐ ┌────────────┐                        │
│ │ Gemini │ │GPT-4o  │ │  Claude    │                        │
│ │ Flash  │ │ mini   │ │  Sonnet    │                        │
│ │$0.40/1M│ │$0.49/1M│ │ $11.55/1M  │                        │
│ └────────┘ └────────┘ └────────────┘                        │
│                                                              │
│ RESULT: 75-85% cost reduction vs. Claude-only baseline      │
└─────────────────────────────────────────────────────────────┘
```

---

#### STEP 10: LLM Inference

**Process**: Execute the AI completion request with the selected provider.

**File**: `packages/api-contract/src/routers/chat.ts:328-378`

```typescript
const modelStartTime = Date.now();
const { AIRouter } = await import('@platform/ai-core');
const aiRouter = new AIRouter({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!,
  enableFallback: true,
  logRouting: true,
});

aiResponse = await aiRouter.complete({
  messages: aiMessages,
  temperature: 0.7,
  maxTokens: 2048,
});

logger.info('[AI Router] Response received', {
  model: aiResponse.model,
  provider: aiResponse.provider,
  inputTokens: aiResponse.usage.inputTokens,
  outputTokens: aiResponse.usage.outputTokens,
});
```

**File**: `packages/ai-core/src/router.ts:195-272`

```typescript
async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
  const decision = this.selectProvider(request.messages);

  // Dynamic configuration based on complexity
  const tier = determineTierFromComplexity(decision.complexityScore);
  const modelConfig = getModelConfigForQuery(tier, queryComplexity);

  try {
    let response: AICompletionResponse;

    if (decision.provider === 'openai') {
      response = await this.openai.complete({
        ...request,
        model: decision.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
    } else if (decision.provider === 'google') {
      response = await this.google.complete({
        ...request,
        model: decision.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
    } else {
      response = await this.anthropic.complete({
        ...request,
        model: decision.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
    }

    return response;
  } catch (error) {
    // Fallback to Anthropic if enabled
    if (this.config.enableFallback && decision.provider !== 'anthropic') {
      return await this.anthropic.complete({
        ...request,
        model: 'claude-3-5-sonnet-20241022',
      });
    }
    throw error;
  }
}
```

---

#### STEP 11: Quality Assurance - Hallucination Detection

**Process**: Analyze response for hallucinations and quality issues.

**File**: `packages/api-contract/src/routers/chat.ts:413-457`

```typescript
// Quality Assurance Service (Phase 12 Week 9)
const { QualityAssuranceService } = await import('../services/quality-assurance');
const qaService = new QualityAssuranceService();

hallucinationDetection = await qaService.detectHallucination(aiResponse.content, {
  userQuery: input.content,
  conversationHistory: history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  })),
  ragSources: ragResult.chunks.map((c) => ({
    chunkId: c.chunk.id,
    score: c.score,
    content: c.chunk.content,
  })),
});

qualityScore = qaService.calculateQualityScore(hallucinationDetection);
shouldFlagForReview = qaService.shouldFlagForReview(hallucinationDetection);

logger.info('[QA] Hallucination detection', {
  isHallucination: hallucinationDetection.isHallucination,
  confidence: hallucinationDetection.confidence,
  qualityScore,
  shouldFlag: shouldFlagForReview,
});
```

**File**: `packages/ai-core/src/prompts/hallucination-reduction.ts:148-271`

```typescript
checkResponse(response: string, context: GroundingContext): HallucinationCheckResult {
  const verifiedClaims: Array<{ claim: string; source: string }> = [];
  const unsupportedClaims: string[] = [];

  // Extract citations from response
  const citationRegex = /\[(\d+)\]/g;
  const citations = new Set<number>();
  let match;
  while ((match = citationRegex.exec(response)) !== null) {
    citations.add(parseInt(match[1], 10));
  }

  // Validate citations against context
  const maxValidCitation = context.knowledgeBaseChunks.length;
  for (const citation of citations) {
    if (citation < 1 || citation > maxValidCitation) {
      unsupportedClaims.push(`Invalid citation [${citation}]`);
    }
  }

  // Calculate grounding confidence
  const confidence = totalClaims > 0 ? groundedClaims / totalClaims : 0;
  const isGrounded = confidence >= 0.7 || unsupportedClaims.length === 0;

  return { isGrounded, confidence, unsupportedClaims, verifiedClaims, recommendations };
}
```

---

#### STEP 12: RAGAS Evaluation

**Process**: Calculate quality metrics using the RAGAS framework.

**File**: `packages/api-contract/src/routers/chat.ts:383-411`

```typescript
const { createRAGASCalculator } = await import('@platform/ai-core');
const ragasCalculator = createRAGASCalculator();
ragasEvaluation = ragasCalculator.calculate({
  question: input.content,
  contexts: ragResult.chunks.map((c) => c.chunk.content),
  answer: aiResponse.content,
});
logger.info('[RAGAS] Evaluation complete', {
  overall: ragasEvaluation.scores.overall,
});
```

**File**: `packages/knowledge/src/evaluation/ragas.ts:114-155`

```typescript
async evaluate(input: RAGASEvaluationInput): Promise<RAGASEvaluationResult> {
  const faithfulnessResult = await this.evaluateFaithfulness(input);
  const relevancyResult = await this.evaluateAnswerRelevancy(input);
  const precisionResult = await this.evaluateContextPrecision(input);
  const recallResult = await this.evaluateContextRecall(input);

  // Calculate composite score
  const compositeScore =
    faithfulnessResult.score * this.config.weights.faithfulness +
    relevancyResult.score * this.config.weights.answerRelevancy +
    precisionResult.score * this.config.weights.contextPrecision +
    recallResult.score * this.config.weights.contextRecall;

  return {
    faithfulness: faithfulnessResult.score,
    answerRelevancy: relevancyResult.score,
    contextPrecision: precisionResult.score,
    contextRecall: recallResult.score,
    compositeScore,
    // ...details
  };
}
```

**RAGAS Metrics**:

| Metric | Weight | Description |
|--------|--------|-------------|
| Faithfulness | 30% | Claims in answer supported by context |
| Answer Relevancy | 30% | Answer addresses the query |
| Context Precision | 20% | Retrieved chunks are relevant |
| Context Recall | 20% | All necessary info retrieved |

---

#### STEP 13: Response Storage with Metadata

**Process**: Store the AI response with comprehensive metadata for analytics and debugging.

**File**: `packages/api-contract/src/routers/chat.ts:473-615`

```typescript
const [assistantMessage] = await ctx.db
  .insert(messages)
  .values({
    sessionId: input.sessionId,
    role: 'assistant',
    content: aiResponse.content,
    metadata: {
      // Model & Routing
      model: aiResponse.model,
      modelRouting: {
        selectedModel: aiResponse.model,
        modelTier: aiResponse.model.includes('mini') ? 'fast' : 'powerful',
        provider: aiResponse.provider,
        reasoning: `Selected based on complexity score`,
        wasEscalated: false,
      },

      // Complexity & Confidence
      complexity: {
        level: complexityAnalysis?.level || 'moderate',
        score: complexityAnalysis?.score || 0.5,
        factors: { /* ... */ },
      },

      // RAG & Knowledge
      rag: {
        chunksRetrieved: ragResult.totalChunks,
        processingTimeMs: ragResult.processingTimeMs,
        topRelevance: ragResult.chunks[0]?.relevance,
        method: 'hybrid',
        rerankingApplied: true,
        chunks: ragResult.chunks.map((c) => ({
          id: c.chunk.id,
          content: c.chunk.content,
          score: c.score,
          source: c.chunk.documentId,
        })),
      },

      // Quality Metrics
      ragas: ragasEvaluation?.scores,
      crag: { success: cragSuccess, wasRefined, confidence },
      qualityAssurance: {
        hallucinationDetection,
        qualityScore,
        shouldFlagForReview,
      },

      // Cost & Performance
      cost: {
        total: aiResponse.usage?.cost,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
      },
      performance: {
        totalLatencyMs,
        ragLatencyMs,
        modelLatencyMs,
        cragLatencyMs,
        qaLatencyMs,
      },
    },
  })
  .returning();
```

---

#### STEP 14: Session Cost Update & Response

**Process**: Update session costs and return response to client.

**File**: `packages/api-contract/src/routers/chat.ts:624-651`

```typescript
// Update session cost
const newCost = (Number(session.costUsd) + (aiResponse.usage?.cost || 0)).toFixed(6);
await ctx.db
  .update(sessions)
  .set({ costUsd: newCost })
  .where(eq(sessions.id, input.sessionId));

return {
  userMessage: {
    id: userMessage.id,
    role: userMessage.role,
    content: userMessage.content,
    attachments: userMessage.attachments,
    timestamp: userMessage.timestamp,
  },
  assistantMessage: {
    id: assistantMessage.id,
    role: assistantMessage.role,
    content: assistantMessage.content,
    metadata: assistantMessage.metadata,
    timestamp: assistantMessage.timestamp,
  },
  usage: aiResponse.usage || {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cost: 0,
  },
};
```

---

### Complete Data Flow Diagram

```
USER INPUT
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 1. SESSION VALIDATION                                          │
│    • Verify session exists and is active                       │
│    • RLS enforces tenant isolation                             │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 2. MESSAGE STORAGE                                             │
│    • Store user message in messages table                      │
│    • Link to session for context                               │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 3. CONTEXT RETRIEVAL                                           │
│    • Fetch last 20 messages from conversation                  │
│    • Build conversation history array                          │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 4. CRAG QUERY REFINEMENT                                       │
│    • Evaluate query confidence                                 │
│    • Refine if confidence < 0.8                                │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 5. RAG RETRIEVAL PIPELINE                                      │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│    │  Embedding  │───▶│   Hybrid    │───▶│  Small2Big  │      │
│    │  (Voyage)   │    │  (RRF)      │    │  Expansion  │      │
│    └─────────────┘    └─────────────┘    └─────────────┘      │
│           │                                     │               │
│           └───────────────┬─────────────────────┘               │
│                           ▼                                     │
│                   ┌─────────────┐                               │
│                   │   Cohere    │                               │
│                   │  Reranker   │                               │
│                   └─────────────┘                               │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 6. PROMPT ASSEMBLY                                             │
│    • Build RAG-enhanced system prompt                          │
│    • Add conversation history                                  │
│    • Include grounding instructions                            │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 7. COMPLEXITY ANALYSIS                                         │
│    • Entity extraction (30%)                                   │
│    • Depth calculation (25%)                                   │
│    • Specificity analysis (20%)                                │
│    • Technical term count (15%)                                │
│    • Ambiguity detection (10%)                                 │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 8. MODEL ROUTING                                               │
│    • Simple (0-0.4) → Gemini Flash                             │
│    • Moderate (0.4-0.7) → GPT-4o-mini                          │
│    • Complex (0.7-1.0) → Claude Sonnet                         │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 9. LLM INFERENCE                                               │
│    • Execute completion with selected provider                 │
│    • Apply dynamic temperature/max_tokens                      │
│    • Fallback to Claude if primary fails                       │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 10. QUALITY ASSURANCE                                          │
│    • Hallucination detection                                   │
│    • RAGAS evaluation (faithfulness, relevancy, etc.)          │
│    • Flag for review if quality score < threshold              │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ 11. RESPONSE STORAGE                                           │
│    • Store assistant message with full metadata                │
│    • Update session cost tracking                              │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
AI RESPONSE TO USER
```

---

## 4. Component Deep Dives

### 4.1 Document Chunking

**File**: `packages/knowledge/src/chunking.ts`

The chunking system splits documents into optimal-sized pieces for retrieval.

```typescript
export function chunkDocument(text: string, options: ChunkOptions = {}): TextChunk[] {
  const config = {
    chunkSize: 1400,    // ~350 tokens
    overlapSize: 250,   // ~62.5 tokens overlap
    preserveSentences: true,
    ...options
  };

  // Strategy:
  // 1. Split on paragraph boundaries first
  // 2. Further split large paragraphs on sentence boundaries
  // 3. Add overlap between chunks for context preservation
}
```

**Configuration**:
- **Chunk Size**: 1400 characters (~350 tokens) - larger chunks provide more context
- **Overlap**: 250 characters (~62.5 tokens) - ensures continuity between chunks
- **Sentence Preservation**: Breaks at sentence boundaries when possible

### 4.2 Voyage AI Embeddings

**File**: `packages/knowledge/src/embeddings.ts`

```typescript
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  // Model: voyage-2
  // Dimensions: 1024
  // Max input: 16K tokens
  // Cost: $0.12/1M tokens

  async embed(text: string, inputType: 'query' | 'document' = 'document'): Promise<number[]> {
    const sanitized = this.sanitizeText(text);
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: [sanitized],
        input_type: inputType,
        truncation: true,
      }),
    });
    // ...
  }
}
```

### 4.3 Conversation Memory

**File**: `packages/knowledge/src/memory.ts`

LlamaIndex-based conversation memory for context retention.

```typescript
export class ConversationMemory {
  private memory: ChatMemoryBuffer;

  constructor(options: MemoryOptions) {
    this.memory = new ChatMemoryBuffer({
      tokenLimit: options.tokenLimit || 3000,
    });
  }

  async getConversationText(): Promise<string> {
    const messages = await this.getMessages();
    return messages
      .map((msg) => `[${msg.role.toUpperCase()}]: ${msg.content}`)
      .join('\n\n');
  }
}
```

### 4.4 Query Type Classification

**File**: `packages/knowledge/src/retrieval/hybrid-search.ts:269-289`

```typescript
private classifyQueryType(query: string): QueryType {
  const lowerQuery = query.toLowerCase();

  // Exact match indicators (SKUs, error codes)
  if (/^[A-Z0-9-]+$/.test(query) || /error|code|sku/i.test(query)) {
    return 'exact_match';
  }

  // Technical indicators
  const technicalTerms = ['configure', 'implement', 'integrate', 'api', 'ssl'];
  if (technicalTerms.some(term => lowerQuery.includes(term))) {
    return 'technical';
  }

  // Conversational indicators
  if (lowerQuery.includes('how') || lowerQuery.includes('help')) {
    return 'conversational';
  }

  return 'conceptual';
}
```

**Query Types & Semantic Weights**:

| Type | Semantic Weight | Use Case |
|------|-----------------|----------|
| conceptual | 0.7 | "How do I improve collaboration?" |
| technical | 0.5 | "Configure SSL certificate" |
| conversational | 0.8 | "Having trouble with login" |
| exact_match | 0.3 | Product codes, error messages |

---

## 5. Database Schema Reference

### 5.1 Knowledge Base Tables

**File**: `packages/db/src/schema/index.ts`

```sql
-- Knowledge Documents
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  embedding VECTOR(1024),  -- Voyage Multimodal-3
  content_type TEXT DEFAULT 'text/plain',
  url TEXT,
  author TEXT,
  tags JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Chunks
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL,
  position INTEGER NOT NULL,  -- Order within document
  start_offset INTEGER,
  end_offset INTEGER,
  token_count INTEGER,
  parent_chunk_id UUID REFERENCES knowledge_chunks(id) ON DELETE SET NULL,  -- Small2Big
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_tenant_id ON knowledge_chunks(tenant_id);
CREATE INDEX idx_knowledge_chunks_parent ON knowledge_chunks(parent_chunk_id);
```

### 5.2 Session & Message Tables

```sql
-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES widgets(id),
  end_user_id UUID,
  is_demo BOOLEAN DEFAULT FALSE,
  mode TEXT DEFAULT 'text' CHECK (mode IN ('text', 'meeting')),
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Messages (with Phase 12 metadata)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments JSONB,
  metadata JSONB,  -- Contains full Phase 12 debug info
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### 5.3 Cost Tracking

```sql
CREATE TABLE cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  service TEXT NOT NULL CHECK (service IN ('vision', 'voice_stt', 'voice_tts', 'llm', 'embedding', 'livekit')),
  provider TEXT,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6) NOT NULL,
  cache_write_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_hit_rate DECIMAL(5, 4) DEFAULT 0,
  reranking_cost DECIMAL(10, 6) DEFAULT 0,
  memory_cost DECIMAL(10, 6) DEFAULT 0,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 6. API Endpoint Definitions

### 6.1 Chat Endpoints

**tRPC Router**: `packages/api-contract/src/routers/chat.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `chat.sendMessage` | Mutation | Send message and receive AI response |
| `chat.streamMessage` | Subscription | Stream AI response token-by-token |
| `chat.prepareVideoContext` | Mutation | Prepare context for LiveKit session |
| `chat.uploadChatFile` | Mutation | Upload file attachment |
| `chat.getChatFile` | Query | Get file with signed URL |
| `chat.validateVideoSession` | Mutation | Validate before video escalation |

**Input Schema**:
```typescript
const sendChatMessageSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  content: z.string().min(1).max(10000),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file']),
    url: z.string().url(),
    name: z.string().optional(),
    size: z.number().int().positive().optional(),
  })).optional(),
});
```

**Response Shape**:
```typescript
{
  userMessage: {
    id: string,
    role: 'user',
    content: string,
    attachments?: Attachment[],
    timestamp: Date
  },
  assistantMessage: {
    id: string,
    role: 'assistant',
    content: string,
    metadata: MessageMetadata,  // Full debug info
    timestamp: Date
  },
  usage: {
    inputTokens: number,
    outputTokens: number,
    totalTokens: number,
    cost: number
  }
}
```

### 6.2 Sessions Endpoints

**tRPC Router**: `packages/api-contract/src/routers/sessions.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `sessions.create` | Mutation | Create new chat session |
| `sessions.get` | Query | Get session by ID |
| `sessions.list` | Query | List sessions for tenant |
| `sessions.end` | Mutation | End active session |
| `sessions.getMessages` | Query | Get messages for session |

### 6.3 Knowledge Endpoints

**tRPC Router**: `packages/api-contract/src/routers/knowledge.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `knowledge.upload` | Mutation | Upload document to knowledge base |
| `knowledge.search` | Query | Search knowledge base |
| `knowledge.getDocument` | Query | Get document by ID |
| `knowledge.deleteDocument` | Mutation | Delete document |

---

## 7. Configuration Parameters

### 7.1 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/platform
REDIS_URL=redis://localhost:6379

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
VOYAGE_API_KEY=pa-...
COHERE_API_KEY=...

# Feature Flags
ZERO_DAY=false  # true = OpenAI-only (stable), false = Gemini+OpenAI+Claude (cost-optimized)

# RAG Configuration
RAG_TOP_K=5
RAG_MIN_SCORE=0.7
RAG_HYBRID_SEMANTIC_WEIGHT=0.7
RAG_HYBRID_KEYWORD_WEIGHT=0.3
RAG_USE_RERANKING=true
RAG_USE_SMALL2BIG=true

# Embedding Cache
EMBEDDING_CACHE_TTL=86400  # 24 hours

# Model Routing
COMPLEXITY_SIMPLE_THRESHOLD=0.4
COMPLEXITY_MODERATE_THRESHOLD=0.7
```

### 7.2 Chunking Configuration

```typescript
const DEFAULT_CHUNK_OPTIONS = {
  chunkSize: 1400,        // ~350 tokens per chunk
  overlapSize: 250,       // ~62 tokens overlap
  preserveSentences: true // Break at sentence boundaries
};
```

### 7.3 RAGAS Configuration

```typescript
const DEFAULT_RAGAS_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.0,
  weights: {
    faithfulness: 0.3,
    answerRelevancy: 0.3,
    contextPrecision: 0.2,
    contextRecall: 0.2,
  },
  parallelization: true,
  costTracking: true,
};
```

---

## 8. Performance Optimizations

### 8.1 Embedding Cache (90% Cost Reduction)

**File**: `packages/knowledge/src/retrieval/hybrid-search.ts:83-121`

```typescript
private async getQueryEmbedding(query: string): Promise<number[] | null> {
  // Generate cache key with tenant isolation
  const cacheKey = `embedding:query:${this.tenantId}:${queryHash}`;

  // Try cache first
  if (this.redis) {
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as number[];
    }
  }

  // Generate new embedding
  const embedding = await this.embeddingProvider.embed(query, 'query');

  // Cache for 24 hours
  if (this.redis && embedding) {
    await this.redis.setex(cacheKey, 86400, JSON.stringify(embedding));
  }

  return embedding;
}
```

### 8.2 Database Indexes

```sql
-- Vector similarity search (IVFFlat)
CREATE INDEX idx_knowledge_chunks_embedding
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search (GIN)
CREATE INDEX idx_knowledge_chunks_content_fts
  ON knowledge_chunks USING GIN (to_tsvector('english', content));

-- Foreign key lookups
CREATE INDEX idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_tenant_id ON knowledge_chunks(tenant_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_sessions_tenant_id ON sessions(tenant_id);
```

### 8.3 Connection Pooling

```typescript
// packages/db/src/index.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
  maxLifetimeSeconds: 3600,   // Rotate connections hourly
});
```

### 8.4 Response Time Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Session validation | < 50ms | ~20ms |
| RAG retrieval | < 500ms | ~300ms |
| Model inference | < 3s | ~1.5-2.5s |
| Total E2E | < 5s | ~3-4s |

---

## 9. Error Handling & Resilience

### 9.1 Graceful Degradation

**File**: `packages/api-contract/src/routers/chat.ts`

```typescript
// CRAG degradation
try {
  const cragService = new CRAGService();
  cragEvaluation = await cragService.evaluateQuery(input.content);
} catch (error) {
  cragSuccess = false;
  logger.warn('[CRAG] Query evaluation failed, using original query');
  finalQuery = input.content; // Continue with original
}

// Cohere reranking degradation
try {
  if (isCohereRerankingEnabled() && chunks.length > 0) {
    chunks = await cohereReranker.rerankSearchResults(query, chunks);
  }
} catch (error) {
  logger.warn('Cohere reranking failed, using base scores');
  // Continue with non-reranked results
}

// QA degradation
try {
  hallucinationDetection = await qaService.detectHallucination(response);
} catch (error) {
  qaSuccess = false;
  qualityScore = 0.8; // Default safe score
}
```

### 9.2 AI Provider Fallback

**File**: `packages/ai-core/src/router.ts:259-271`

```typescript
try {
  response = await primaryProvider.complete(request);
} catch (error) {
  if (this.config.enableFallback && decision.provider !== 'anthropic') {
    logger.warn('Primary provider failed, falling back to Anthropic');
    return await this.anthropic.complete({
      ...request,
      model: 'claude-3-5-sonnet-20241022',
    });
  }
  throw error;
}
```

### 9.3 Error Response Formatting

```typescript
// User-friendly error messages based on error type
let userMessage = 'AI providers unavailable. Please try again.';
if (error.message.includes('API key')) {
  userMessage = 'AI provider configuration error.';
} else if (error.message.includes('rate limit')) {
  userMessage = 'Rate limit exceeded. Please try again shortly.';
} else if (error.message.includes('network')) {
  userMessage = 'Network error connecting to AI provider.';
}

throw internalError({
  message: userMessage,
  cause: error,
});
```

---

## 10. Monitoring & Observability

### 10.1 Logging Strategy

**File**: `packages/shared/src/logger.ts`

```typescript
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('chat-router');

// Log levels by category
logger.info('[RAG] Query details', {
  query: input.content,
  chunksRetrieved: ragResult.totalChunks,
  ragLatency: ragLatencyMs,
});

logger.info('[AI Router] Response received', {
  model: aiResponse.model,
  provider: aiResponse.provider,
  inputTokens: aiResponse.usage.inputTokens,
});

logger.warn('[CRAG] Query evaluation failed', {
  error: error.message,
  query: input.content,
});

logger.error('Chat message processing error', {
  error: error.message,
  stack: error.stack,
  sessionId: input.sessionId,
});
```

### 10.2 Performance Metrics (Metadata)

Each response includes comprehensive performance metrics:

```typescript
performance: {
  totalLatencyMs: number,      // Total request time
  cragLatencyMs: number,       // CRAG evaluation time
  ragLatencyMs: number,        // RAG retrieval time
  modelLatencyMs: number,      // LLM inference time
  qaLatencyMs: number,         // Quality assurance time
  startTime: string,           // ISO timestamp
  endTime: string,             // ISO timestamp
}
```

### 10.3 Cost Tracking

```typescript
cost: {
  total: number,               // Total cost in USD
  inputTokens: number,         // Input token count
  outputTokens: number,        // Output token count
  cacheReadTokens?: number,    // Cached tokens read
  cacheWriteTokens?: number,   // Tokens written to cache
  rerankingCost?: number,      // Cohere reranking cost
}
```

### 10.4 Quality Metrics

```typescript
ragas: {
  faithfulness: number,        // 0.0 - 1.0
  answerRelevancy: number,     // 0.0 - 1.0
  contextRelevancy: number,    // 0.0 - 1.0
  contextPrecision: number,    // 0.0 - 1.0
  contextRecall: number,       // 0.0 - 1.0
  overall: number,             // Weighted composite
}
```

---

## 11. Security Implementation

### 11.1 Row-Level Security (RLS)

**File**: `packages/db/migrations/008_rls_policies.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation_knowledge_documents
  ON knowledge_documents
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Helper function
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 11.2 Input Validation

```typescript
const sendChatMessageSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  content: z.string()
    .min(1, 'Message content is required')
    .max(10000, 'Message too long'),
});
```

### 11.3 SQL Injection Prevention

All database queries use parameterized statements via Drizzle ORM:

```typescript
// SAFE - Drizzle parameterizes automatically
const results = await db.execute(sql`
  SELECT * FROM knowledge_chunks
  WHERE tenant_id = ${this.tenantId}
  AND content LIKE ${`%${searchTerm}%`}
`);
```

### 11.4 API Key Security

- API keys stored as SHA-256 hashes
- Only key prefix shown in UI (e.g., `pk_live_xxxx`)
- Secure comparison to prevent timing attacks

---

## 12. Extending the System

### 12.1 Adding a New Embedding Provider

**File**: Create `packages/knowledge/src/embeddings/new-provider.ts`

```typescript
import type { EmbeddingProvider } from '../types';

export class NewEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string, inputType: 'query' | 'document'): Promise<number[]> {
    // Implementation
  }

  async embedBatch(texts: string[], inputType: 'query' | 'document'): Promise<number[][]> {
    // Implementation
  }
}
```

### 12.2 Adding a New AI Provider

**File**: Create `packages/ai-core/src/providers/new-provider.ts`

```typescript
import type { AIProviderInterface, AICompletionRequest, AICompletionResponse } from '../types';

export class NewProvider implements AIProviderInterface {
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Implementation
  }

  async *streamComplete(request: AICompletionRequest): AsyncGenerator<string, AICompletionResponse> {
    // Implementation
  }
}
```

**Update Router**: `packages/ai-core/src/router.ts`

```typescript
// Add to routing logic
if (decision.provider === 'new-provider') {
  response = await this.newProvider.complete(request);
}
```

### 12.3 Adding Custom Retrieval Strategy

**File**: Create `packages/knowledge/src/retrieval/custom-retriever.ts`

```typescript
import type { RetrievalResult } from './hybrid-search';

export class CustomRetriever {
  async retrieve(query: string, topK: number): Promise<RetrievalResult[]> {
    // Custom retrieval logic
  }
}
```

### 12.4 Adding New Quality Metrics

**File**: Extend `packages/knowledge/src/evaluation/ragas.ts`

```typescript
interface CustomMetricResult {
  score: number;
  details: {
    // Custom metric details
  };
}

async evaluateCustomMetric(input: RAGASEvaluationInput): Promise<CustomMetricResult> {
  // Custom evaluation logic
}
```

---

## Appendix A: Quick Reference

### A.1 Key File Locations

| Component | File Path |
|-----------|-----------|
| Chat Router | `packages/api-contract/src/routers/chat.ts` |
| RAG Query Engine | `packages/knowledge/src/rag-query.ts` |
| Enhanced RAG | `packages/knowledge/src/rag-hybrid.ts` |
| Hybrid Search | `packages/knowledge/src/retrieval/hybrid-search.ts` |
| Small2Big | `packages/knowledge/src/retrieval/small2big.ts` |
| Embeddings | `packages/knowledge/src/embeddings.ts` |
| Reranker | `packages/knowledge/src/reranker.ts` |
| AI Router | `packages/ai-core/src/router.ts` |
| Complexity Analyzer | `packages/ai-core/src/routing/complexity-analyzer.ts` |
| RAGAS Evaluation | `packages/knowledge/src/evaluation/ragas.ts` |
| Database Schema | `packages/db/src/schema/index.ts` |
| Types | `packages/knowledge/src/types.ts` |

### A.2 Common Commands

```bash
# Development
pnpm dev                      # Start all services
pnpm dev:api                  # Start API server only
pnpm db:push                  # Push schema changes

# Testing
pnpm test                     # Run all tests
pnpm test --filter @platform/knowledge  # Test knowledge package

# Building
pnpm build                    # Build all packages
pnpm typecheck               # TypeScript validation

# Database
pnpm db:up                   # Start PostgreSQL + Redis
pnpm db:seed                 # Seed test data
```

### A.3 Cost Reference

| Provider | Model | Input Cost | Output Cost |
|----------|-------|------------|-------------|
| Google | gemini-1.5-flash | $0.35/1M | $1.05/1M |
| OpenAI | gpt-4o-mini | $0.15/1M | $0.60/1M |
| OpenAI | gpt-4o | $2.50/1M | $10.00/1M |
| Anthropic | claude-3-5-sonnet | $3.00/1M | $15.00/1M |
| Voyage | voyage-2 | $0.12/1M | - |
| Cohere | rerank-v3.5 | $2.00/1K searches | - |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| Phase 12 Week 11 | 2025-11-25 | Initial comprehensive documentation |

---

*Documentation maintained by the Platform Engineering Team*
