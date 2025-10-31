# Phase 10 Implementation Guide: Integrating Technical Optimizations with Product Strategy

**Last Updated**: 2025-10-11
**Status**: Ready for Implementation
**Timeline**: 4-6 weeks

---

## Executive Summary

This document maps **5 validated technical optimizations** from deep research to the **12 core product features** in the product strategy. It provides a prioritized implementation roadmap that integrates performance improvements, cost optimizations, and quality enhancements within the 4-week product development timeline.

**Key Integration Points**:
- **Week 1**: Implement prompt caching (87% cost reduction) + reranking (20-40% accuracy improvement) → Supports Knowledge Management + Cost Intelligence
- **Week 2**: Deploy adaptive frame processing + LlamaIndex memory → Supports Screen Sharing + Conversation Management
- **Week 3**: Implement knowledge gap detection + quality monitoring → Supports AI-Powered Optimization + Performance Dashboard
- **Week 4**: Production readiness + comprehensive monitoring → Ensures quality at scale

**Cost Impact**: Combined optimizations deliver **92-95% total cost reduction** vs baseline (GPT-4o + 30 FPS vision), supporting the "Cost Transparency" differentiator.

---

## Part 1: Optimization Mapping to Product Features

### 1.1 Knowledge Management System ↔ RAG Optimizations

**Product Feature** (Week 1):
- Document upload & processing
- URL crawling & sitemap import
- RAG retrieval with Voyage embeddings
- Hybrid search (vector + keyword + BM25)

**Research Recommendations to Integrate**:

#### A. Reranking (IMMEDIATE - Day 2)
**Status**: ✅ Validated - 20-40% P@5 improvement, multiple independent benchmarks confirm 15-25% accuracy gain

**Implementation**:
```typescript
// packages/knowledge/src/retrieval/reranker.ts

import Cohere from 'cohere-ai';

export class CohereReranker {
  private client: Cohere.Client;

  constructor(apiKey: string) {
    this.client = new Cohere.Client({ apiKey });
  }

  async rerank(query: string, documents: string[], topK: number = 5): Promise<RerankResult[]> {
    const response = await this.client.rerank({
      model: 'rerank-english-v3.0',
      query,
      documents,
      top_n: topK,
    });

    return response.results.map((result) => ({
      index: result.index,
      document: documents[result.index],
      relevanceScore: result.relevance_score,
    }));
  }
}

// Integration into existing RAG pipeline
// packages/knowledge/src/retrieval/hybrid-search.ts

export async function hybridSearchWithReranking(
  query: string,
  embeddingService: VoyageEmbeddingService,
  reranker: CohereReranker
): Promise<RetrievalResult[]> {
  // Step 1: Hybrid retrieval (existing logic) - fetch top 20
  const vectorResults = await semanticSearch(query, embeddingService, topK: 20);
  const keywordResults = await keywordSearch(query, topK: 20);
  const bm25Results = await bm25Search(query, topK: 20);

  const combinedResults = mergeResults([vectorResults, keywordResults, bm25Results], topK: 20);

  // Step 2: Rerank top 20 → top 5
  const documents = combinedResults.map(r => r.content);
  const reranked = await reranker.rerank(query, documents, topK: 5);

  return reranked.map(r => combinedResults[r.index]);
}
```

**Cost Analysis**:
- Cohere Rerank: $2.00 per 1,000 searches
- At 10K queries/month: $20/month
- At 100K queries/month: $200/month
- Break-even vs self-hosted: 10M queries/month

**Decision**: Use Cohere API until >10M queries/month, then consider self-hosted BAAI/bge-reranker-v2-m3

**Product Impact**:
- 20-40% improvement in top-5 retrieval accuracy
- Directly supports "Resolution Rate" KPI (target: 60%+)
- Reduces knowledge gaps by surfacing better documents

**Timeline**: Day 2 (1 day implementation)

#### B. Semantic Chunking (IMMEDIATE - Day 1)
**Status**: ✅ Already in plan (product_strategy_implementation_plan.md line 132: "Semantic chunking (1000 tokens, 200 overlap)")

**Implementation**:
```typescript
// packages/knowledge/src/processing/chunker.ts

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export class SemanticChunker {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''], // Semantic boundaries
    });
  }

  async chunkDocument(text: string, documentId: string): Promise<DocumentChunk[]> {
    const chunks = await this.splitter.splitText(text);

    return chunks.map((content, index) => ({
      id: `${documentId}_chunk_${index}`,
      documentId,
      content,
      chunkIndex: index,
      tokenCount: this.estimateTokens(content),
    }));
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

**Product Impact**:
- Better context preservation across chunk boundaries
- Fewer "out of context" errors in RAG responses
- Supports high resolution rate

**Timeline**: Day 1 (already planned)

### 1.2 Agent Configuration Studio ↔ Prompt Engineering

**Product Feature** (Week 1):
- Personality configuration (tone, reply length, behavior instructions)
- Model selection (GPT-4o-mini 70% / GPT-4o 30%)
- Screen sharing settings

**Research Recommendations to Integrate**:

#### A. Anthropic Prompt Caching (IMMEDIATE - Day 3)
**Status**: ✅ Validated - 53-90% cost reduction (cached tokens: $0.30/M vs $3.00/M)

**Implementation Strategy**:
```typescript
// packages/ai-core/src/providers/anthropic.ts

import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(params: {
    systemPrompt: string; // CACHEABLE
    ragContext: string; // CACHEABLE
    toolDefinitions: object[]; // CACHEABLE
    userMessage: string; // DYNAMIC
    conversationHistory: Message[]; // DYNAMIC
  }): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: params.systemPrompt,
          cache_control: { type: 'ephemeral' }, // CACHE: System prompt
        },
        {
          type: 'text',
          text: `# Retrieved Knowledge\n\n${params.ragContext}`,
          cache_control: { type: 'ephemeral' }, // CACHE: RAG context
        },
      ],
      messages: [
        ...params.conversationHistory, // Previous turns (dynamic)
        { role: 'user', content: params.userMessage }, // Current message (dynamic)
      ],
      tools: params.toolDefinitions, // CACHE: Tool definitions
    });

    return response.content[0].text;
  }
}
```

**Cache Management**:
- **5-minute TTL**: LiveKit sessions naturally maintain state within window
- **Cache key structure**: `tenant_id:agent_id:system_prompt_hash:rag_context_hash`
- **Invalidation**: On agent configuration update or knowledge base refresh

**Cost Impact Example**:
```
Baseline (no caching):
- System prompt: 500 tokens × $3.00/M = $0.0015
- RAG context: 2,000 tokens × $3.00/M = $0.0060
- Tool definitions: 500 tokens × $3.00/M = $0.0015
- User message: 100 tokens × $3.00/M = $0.0003
- TOTAL INPUT: 3,100 tokens × $3.00/M = $0.0093/request

With caching (90% of input cached):
- Cached: 3,000 tokens × $0.30/M = $0.0009
- Dynamic: 100 tokens × $3.00/M = $0.0003
- TOTAL INPUT: $0.0012/request

SAVINGS: $0.0081/request (87% reduction)

At 10K conversations/month: $81/month saved
At 100K conversations/month: $810/month saved
```

**Product Integration**:
- Add "Prompt Caching Enabled" toggle in Agent Configuration UI
- Show cache hit rate in Cost Intelligence Dashboard
- Display savings calculation: "Saved $127 this month through prompt caching (85% hit rate)"

**Timeline**: Day 3 (2 days implementation + testing)

### 1.3 Screen Sharing Core ↔ Frame Processing Optimizations

**Product Feature** (Week 1, already built + Week 2 UI):
- 1 FPS intelligent capture (96% cost reduction vs 30 FPS)
- pHash frame deduplication (60-75% reduction)
- Session recording storage (S3 + retention policies)
- Recording playback interface

**Research Recommendations to Integrate**:

#### A. Adaptive Frame Thresholds (IMMEDIATE - Day 8)
**Status**: ✅ Validated - 15-20% fewer false positives for code, 25-30% better video detection

**Implementation**:
```python
# livekit-agent/frame_processing.py

import cv2
import numpy as np
import imagehash
from PIL import Image

class AdaptiveFrameProcessor:
    def __init__(self):
        self.threshold_map = {
            'code_text': 10,      # Strict matching (high edge density)
            'static_ui': 12,      # Standard matching
            'documentation': 15,  # Moderate matching (mixed content)
            'video': 20,          # Loose matching (motion blur)
        }
        self.stability_counter = 0
        self.current_content_type = 'static_ui'

    def detect_content_type(self, frame: np.ndarray) -> str:
        """
        Classify content type based on Laplacian variance

        High variance (>500): Code/text (high edge density)
        Medium variance (200-500): Static UI, documentation
        Low variance (<200): Video, motion blur
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()

        if variance > 500:
            return 'code_text'
        elif variance > 200:
            # Further classify: Check edge density for docs vs UI
            edges = cv2.Canny(gray, 50, 150)
            edge_ratio = np.count_nonzero(edges) / edges.size

            if edge_ratio > 0.15:  # High edge ratio → documentation with images
                return 'documentation'
            else:
                return 'static_ui'
        else:
            return 'video'

    def get_adaptive_threshold(self, frame: np.ndarray) -> int:
        """Get Hamming distance threshold based on content type"""
        detected_type = self.detect_content_type(frame)

        # Stability counter prevents thrashing when content type changes
        if detected_type != self.current_content_type:
            self.stability_counter += 1
            if self.stability_counter >= 3:  # Require 3 consecutive frames
                self.current_content_type = detected_type
                self.stability_counter = 0
        else:
            self.stability_counter = 0

        return self.threshold_map[self.current_content_type]

    def is_frame_duplicate(
        self,
        current_frame: np.ndarray,
        previous_hash: imagehash.ImageHash
    ) -> bool:
        """Check if frame is duplicate using adaptive threshold"""
        # Convert to PIL Image for pHash
        pil_image = Image.fromarray(cv2.cvtColor(current_frame, cv2.COLOR_BGR2RGB))
        current_hash = imagehash.phash(pil_image)

        # Get adaptive threshold
        threshold = self.get_adaptive_threshold(current_frame)

        # Calculate Hamming distance
        hamming_distance = current_hash - previous_hash

        return hamming_distance <= threshold

# Integration into existing agent
# livekit-agent/agent.py (update existing VisionAwareAgent)

class VisionAwareAgent(voice.Agent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.frame_processor = AdaptiveFrameProcessor()  # NEW
        self.last_frame_hash = None
        self.frames_captured = 0
        self.frames_deduplicated = 0

    async def on_video_frame(self, frame: rtc.VideoFrame):
        """Process video frame with adaptive deduplication"""
        # Convert to numpy array
        np_frame = frame.to_ndarray(format='bgr24')

        # Check if duplicate using adaptive threshold
        current_hash = imagehash.phash(Image.fromarray(cv2.cvtColor(np_frame, cv2.COLOR_BGR2RGB)))

        if self.last_frame_hash is not None:
            is_duplicate = self.frame_processor.is_frame_duplicate(np_frame, self.last_frame_hash)

            if is_duplicate:
                self.frames_deduplicated += 1
                logger.debug(f"Frame skipped (duplicate), threshold: {self.frame_processor.get_adaptive_threshold(np_frame)}")
                return  # Skip processing

        # Frame is unique, process it
        self.frames_captured += 1
        self.last_frame_hash = current_hash

        # Send to vision LLM (existing logic)
        await self._process_vision_frame(np_frame)

        # Log deduplication stats every 100 frames
        if self.frames_captured % 100 == 0:
            total_frames = self.frames_captured + self.frames_deduplicated
            dedup_rate = (self.frames_deduplicated / total_frames) * 100 if total_frames > 0 else 0
            logger.info(f"Deduplication stats: {dedup_rate:.1f}% frames skipped ({self.frames_deduplicated}/{total_frames})")
```

**Cost Impact**:
```
Baseline (fixed threshold=10):
- 1 FPS capture = 60 frames/minute
- pHash dedup (60% reduction) = 24 frames/minute analyzed
- Cost: 24 frames × $0.075/1K images (Gemini Flash-Lite) = $0.0018/minute

With adaptive thresholds:
- Code content: 70-75% reduction (strict threshold) = 15 frames/minute
- Video content: 50-55% reduction (loose threshold) = 27 frames/minute
- Mixed content: 60-65% reduction = 21-24 frames/minute
- Average: 65% reduction = 21 frames/minute analyzed

SAVINGS: 3 frames/minute = 12.5% additional savings on top of fixed threshold
Total cost: $0.00158/minute (12% cheaper)
```

**Product Impact**:
- Better frame selection for code troubleshooting (fewer false positives)
- More frames captured during video playback (better context)
- Real-time cost optimization visible in dashboard

**Timeline**: Day 8 (1-2 days implementation)

#### B. Vision Model Routing (ALREADY IMPLEMENTED)
**Status**: ✅ Already in codebase (livekit-agent/agent.py attempt-based escalation)

**Current Implementation** (Attempt-Based Escalation):
- **Attempt 1** (60% of resolutions): Gemini Flash-Lite 8B + pHash → $0.06/resolution
- **Attempt 2** (25% of resolutions): Gemini Flash + pHash → $0.08/resolution
- **Attempt 3** (15% of resolutions): Claude Sonnet 4.5 + pHash → $0.40/resolution

**Philosophy**: "Upgrade the brain, not the eyes"
- Maintain pHash optimization (threshold=10) across all retry attempts
- Escalate AI reasoning capability on low confidence, not frame quality
- **Worst-case**: All 3 attempts = $0.54/resolution (under $0.70 overage price)

**Validation**: Confidence scoring on response quality determines escalation need

**No Action Required**: Already delivering 85% cost reduction vs baseline

### 1.4 AI-Powered Optimization ↔ Knowledge Gap Detection

**Product Feature** (Week 3):
- Cluster unanswered questions (neural clustering)
- Identify frequency and impact (resolution failures)
- Generate article outlines (GPT-4)
- One-click article creation

**Research Recommendations to Integrate**:

#### A. Knowledge Gap Detection Algorithm (IMMEDIATE - Day 15-16)
**Status**: ✅ Planned in product strategy, research provides implementation details

**Implementation**:
```typescript
// packages/workers/src/jobs/detect-knowledge-gaps.ts

import { OpenAI } from 'openai';
import { VoyageEmbeddingService } from '@platform/knowledge';
import { cluster } from 'ml-hclust'; // Hierarchical clustering
import { db } from '@platform/db';

export async function detectKnowledgeGaps(tenantId: string) {
  // Step 1: Fetch failed conversations (escalated or low confidence <50%)
  const failedConversations = await db
    .select({
      sessionId: sessions.id,
      query: messages.content,
      confidence: messages.metadata.confidence,
      escalated: sessions.escalated,
    })
    .from(sessions)
    .innerJoin(messages, eq(messages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.tenantId, tenantId),
        gte(sessions.createdAt, sql`NOW() - INTERVAL '30 days'`),
        or(
          eq(sessions.escalated, true),
          lt(messages.metadata.confidence, 0.5)
        )
      )
    );

  console.log(`Found ${failedConversations.length} failed conversations for tenant ${tenantId}`);

  // Step 2: Extract questions from conversations
  const questions = failedConversations
    .filter((conv) => conv.query && conv.query.length > 10)
    .map((conv) => conv.query);

  if (questions.length < 5) {
    console.log('Not enough failed conversations to detect gaps');
    return;
  }

  // Step 3: Generate embeddings for all questions
  const embeddingService = new VoyageEmbeddingService(process.env.VOYAGE_API_KEY!);
  const embeddings = await embeddingService.embedBatch(questions);

  // Step 4: Cluster similar questions using DBSCAN
  // (Alternative: Use HDBSCAN for better density-based clustering)
  const clusters = clusterQuestions(embeddings, {
    eps: 0.3, // Cosine distance threshold
    minPts: 3, // Minimum 3 similar questions to form cluster
  });

  console.log(`Found ${clusters.length} question clusters`);

  // Step 5: For each cluster, calculate impact score
  const gaps = await Promise.all(
    clusters.map(async (cluster) => {
      const clusterQuestions = cluster.indices.map((idx) => questions[idx]);
      const frequency = clusterQuestions.length;

      // Calculate escalation rate for this cluster
      const clusterConversations = cluster.indices.map((idx) => failedConversations[idx]);
      const escalationRate =
        clusterConversations.filter((c) => c.escalated).length / clusterConversations.length;

      // Impact score: frequency × escalation_rate × 100
      const impactScore = frequency * escalationRate * 100;

      // Generate canonical question (cluster centroid)
      const canonicalQuestion = await generateCanonicalQuestion(clusterQuestions);

      // Generate article outline using GPT-4
      const suggestedArticle = await generateArticleOutline(canonicalQuestion, clusterQuestions);

      return {
        tenantId,
        question: canonicalQuestion,
        frequency,
        impactScore,
        status: 'open',
        suggestedArticle,
        relatedQuestions: clusterQuestions,
      };
    })
  );

  // Step 6: Insert/update knowledge_gaps table
  for (const gap of gaps) {
    await db
      .insert(knowledgeGaps)
      .values(gap)
      .onConflictDoUpdate({
        target: [knowledgeGaps.tenantId, knowledgeGaps.question],
        set: {
          frequency: gap.frequency,
          impactScore: gap.impactScore,
          relatedQuestions: gap.relatedQuestions,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Inserted ${gaps.length} knowledge gaps for tenant ${tenantId}`);
}

async function generateCanonicalQuestion(questions: string[]): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a knowledge base analyst. Given a list of similar user questions, generate a single canonical question that captures the common intent.',
      },
      {
        role: 'user',
        content: `Similar questions:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nGenerate a canonical question:`,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content!.trim();
}

async function generateArticleOutline(
  canonicalQuestion: string,
  examples: string[]
): Promise<{ title: string; outline: string[] }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a technical writer. Given a common user question, generate a help article outline that would answer it comprehensively.',
      },
      {
        role: 'user',
        content: `Question: ${canonicalQuestion}\n\nExample variations:\n${examples.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nGenerate:\n1. A clear article title\n2. A numbered outline with 5-7 sections`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });

  return JSON.parse(response.choices[0].message.content!);
}

function clusterQuestions(
  embeddings: number[][],
  params: { eps: number; minPts: number }
): { indices: number[] }[] {
  // Implement DBSCAN clustering
  // For simplicity, using hierarchical clustering here
  const distanceMatrix = computeDistanceMatrix(embeddings);
  const clusterTree = cluster(distanceMatrix, { method: 'average' });

  // Cut tree at threshold to get flat clusters
  const flatClusters = cutTree(clusterTree, params.eps);

  // Group indices by cluster ID
  const clusterMap = new Map<number, number[]>();
  flatClusters.forEach((clusterId, index) => {
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, []);
    }
    clusterMap.get(clusterId)!.push(index);
  });

  // Filter out clusters with < minPts
  return Array.from(clusterMap.values())
    .filter((indices) => indices.length >= params.minPts)
    .map((indices) => ({ indices }));
}

function computeDistanceMatrix(embeddings: number[][]): number[][] {
  const n = embeddings.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = cosineSimilarity(embeddings[i], embeddings[j]);
      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return 1 - dotProduct / (normA * normB); // Convert to distance
}
```

**Product Integration**:
```typescript
// apps/dashboard/src/pages/optimize/knowledge-gaps.tsx

export default function KnowledgeGapsPage() {
  const { data: gaps } = trpc.platform.optimization.knowledgeGaps.useQuery({ limit: 50 });
  const generateArticle = trpc.platform.optimization.generateArticle.useMutation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Knowledge Gaps</h1>
        <Button onClick={() => runDetectionJob()}>Refresh Analysis</Button>
      </div>

      <div className="grid gap-4">
        {gaps?.map((gap) => (
          <Card key={gap.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{gap.question}</CardTitle>
                  <CardDescription>
                    {gap.frequency} occurrences • Impact score: {gap.impactScore.toFixed(1)}
                  </CardDescription>
                </div>
                <Badge variant={gap.impactScore > 50 ? 'destructive' : 'warning'}>
                  {gap.impactScore > 50 ? 'High Priority' : 'Medium Priority'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Suggested Article */}
              <div>
                <h3 className="font-semibold mb-2">Suggested Article</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">{gap.suggestedArticle.title}</p>
                  <ol className="mt-2 space-y-1">
                    {gap.suggestedArticle.outline.map((section, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">
                        {idx + 1}. {section}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Related Questions */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    View {gap.relatedQuestions.length} similar questions
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-1">
                    {gap.relatedQuestions.slice(0, 5).map((q, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">
                        • {q}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => generateArticle.mutate({ gapId: gap.id })}>
                  Create Article
                </Button>
                <Button variant="outline" onClick={() => dismissGap(gap.id)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Timeline**: Day 15-16 (2 days implementation)

### 1.5 Cost Intelligence Dashboard ↔ Monitoring & Analytics

**Product Feature** (Week 2):
- Real-time cost tracking
- Budget management (caps, warnings, overages)
- Cost breakdown (service, agent, conversation, user)
- Savings calculator vs industry baseline

**Research Recommendations to Integrate**:

#### A. Multi-Signal Correlation Monitoring (IMMEDIATE - Week 4, Day 29-30)
**Status**: ✅ Validated - Leading indicators of user dissatisfaction before complaints

**Implementation**:
```typescript
// packages/workers/src/jobs/monitor-quality.ts

import { db } from '@platform/db';
import { sendSlackAlert, sendEmailAlert } from '@platform/shared';

interface QualityMetrics {
  retryRate: number; // % of users rephrasing questions
  sessionCompletion: number; // % of sessions completing naturally
  p95Latency: number; // 95th percentile latency (ms)
  p99Latency: number; // 99th percentile latency (ms)
  escalationRate: number; // % of conversations escalated
  avgConfidence: number; // Average LLM confidence score
}

export async function monitorQualityMetrics(tenantId: string) {
  // Fetch metrics for last 1 hour
  const metrics = await calculateMetrics(tenantId, '1 hour');

  // Check thresholds and alert if breached
  const alerts: string[] = [];

  // 1. Retry Rate (strongest predictor)
  if (metrics.retryRate > 0.3) {
    alerts.push(
      `🚨 CRITICAL: Retry rate ${(metrics.retryRate * 100).toFixed(1)}% (threshold: 30%). Users are rephrasing questions frequently.`
    );
  } else if (metrics.retryRate > 0.2) {
    alerts.push(
      `⚠️ WARNING: Retry rate ${(metrics.retryRate * 100).toFixed(1)}% (threshold: 20%). Monitor for quality issues.`
    );
  }

  // 2. Session Completion
  if (metrics.sessionCompletion < 0.75) {
    alerts.push(
      `🚨 CRITICAL: Session completion ${(metrics.sessionCompletion * 100).toFixed(1)}% (threshold: 75%). Users abandoning mid-conversation.`
    );
  }

  // 3. P95 Latency
  if (metrics.p95Latency > 1000) {
    alerts.push(
      `⚠️ WARNING: P95 latency ${metrics.p95Latency}ms (threshold: 1000ms). Users experiencing slow responses.`
    );
  }

  // 4. P99 Latency
  if (metrics.p99Latency > 3000) {
    alerts.push(
      `🚨 CRITICAL: P99 latency ${metrics.p99Latency}ms (threshold: 3000ms). Significant tail latency causing abandonment.`
    );
  }

  // 5. Escalation Rate
  if (metrics.escalationRate > 0.3) {
    alerts.push(
      `⚠️ WARNING: Escalation rate ${(metrics.escalationRate * 100).toFixed(1)}% (threshold: 30%). RAG quality or AI routing issues.`
    );
  }

  // 6. Average Confidence
  if (metrics.avgConfidence < 0.6) {
    alerts.push(
      `⚠️ WARNING: Average confidence ${(metrics.avgConfidence * 100).toFixed(1)}% (threshold: 60%). Knowledge base gaps detected.`
    );
  }

  // Send alerts if any thresholds breached
  if (alerts.length > 0) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    await sendSlackAlert({
      channel: tenant.slackChannel,
      message: `Quality Alert for ${tenant.name}\n\n${alerts.join('\n')}`,
    });

    await sendEmailAlert({
      to: tenant.adminEmail,
      subject: `Quality Alert: ${alerts.length} issues detected`,
      body: alerts.join('\n'),
    });
  }
}

async function calculateMetrics(tenantId: string, timeWindow: string): Promise<QualityMetrics> {
  const sessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tenantId, tenantId),
        gte(sessions.createdAt, sql`NOW() - INTERVAL '${timeWindow}'`)
      )
    );

  const messages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.tenantId, tenantId),
        gte(messages.createdAt, sql`NOW() - INTERVAL '${timeWindow}'`)
      )
    );

  // Calculate retry rate (users rephrasing same question)
  const retryRate = calculateRetryRate(messages);

  // Calculate session completion (natural end vs abandonment)
  const sessionCompletion = sessions.filter((s) => s.status === 'resolved').length / sessions.length;

  // Calculate latency percentiles
  const latencies = messages
    .filter((m) => m.metadata.latency)
    .map((m) => m.metadata.latency as number)
    .sort((a, b) => a - b);

  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0;

  // Calculate escalation rate
  const escalationRate = sessions.filter((s) => s.escalated).length / sessions.length;

  // Calculate average confidence
  const confidences = messages
    .filter((m) => m.metadata.confidence)
    .map((m) => m.metadata.confidence as number);

  const avgConfidence =
    confidences.length > 0 ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;

  return {
    retryRate,
    sessionCompletion,
    p95Latency,
    p99Latency,
    escalationRate,
    avgConfidence,
  };
}

function calculateRetryRate(messages: Message[]): number {
  // Group messages by session
  const sessionMessages = new Map<string, Message[]>();
  messages.forEach((msg) => {
    if (!sessionMessages.has(msg.sessionId)) {
      sessionMessages.set(msg.sessionId, []);
    }
    sessionMessages.get(msg.sessionId)!.push(msg);
  });

  let retryCount = 0;
  let totalMessages = 0;

  // Check each session for retries (similar consecutive user messages)
  sessionMessages.forEach((msgs) => {
    const userMessages = msgs.filter((m) => m.role === 'user');

    for (let i = 1; i < userMessages.length; i++) {
      const current = userMessages[i].content.toLowerCase();
      const previous = userMessages[i - 1].content.toLowerCase();

      // Check similarity (simple word overlap)
      const currentWords = new Set(current.split(' '));
      const previousWords = new Set(previous.split(' '));
      const overlap = new Set([...currentWords].filter((w) => previousWords.has(w)));
      const similarity = overlap.size / Math.max(currentWords.size, previousWords.size);

      if (similarity > 0.6) {
        retryCount++;
      }
    }

    totalMessages += userMessages.length;
  });

  return totalMessages > 0 ? retryCount / totalMessages : 0;
}

// Schedule monitoring job (runs every 15 minutes)
// packages/api/src/jobs/scheduler.ts

const qualityMonitorQueue = new Queue('quality-monitor', process.env.REDIS_URL);

qualityMonitorQueue.add({}, { repeat: { cron: '*/15 * * * *' } }); // Every 15 minutes

qualityMonitorQueue.process(async (job) => {
  const tenants = await db.select().from(tenants);

  for (const tenant of tenants) {
    await monitorQualityMetrics(tenant.id);
  }
});
```

**Product Integration**:
```typescript
// apps/dashboard/src/pages/analytics/real-time-health.tsx

export default function RealTimeHealthPage() {
  const { data: metrics } = trpc.platform.analytics.realTimeMetrics.useQuery(
    {},
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Real-Time Health Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        {/* Retry Rate (strongest indicator) */}
        <Card className={metrics.retryRate > 0.3 ? 'border-red-500' : ''}>
          <CardHeader>
            <CardTitle>Retry Rate</CardTitle>
            <CardDescription>Users rephrasing questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(metrics.retryRate * 100).toFixed(1)}%
            </div>
            <Progress value={metrics.retryRate * 100} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Target: &lt;20% (current: {metrics.retryRate > 0.3 ? '🚨 Critical' : metrics.retryRate > 0.2 ? '⚠️ Warning' : '✅ Healthy'})
            </p>
          </CardContent>
        </Card>

        {/* Session Completion */}
        <Card className={metrics.sessionCompletion < 0.75 ? 'border-red-500' : ''}>
          <CardHeader>
            <CardTitle>Session Completion</CardTitle>
            <CardDescription>Natural conversation endings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(metrics.sessionCompletion * 100).toFixed(1)}%
            </div>
            <Progress value={metrics.sessionCompletion * 100} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Target: &gt;75% (current: {metrics.sessionCompletion < 0.75 ? '🚨 Critical' : '✅ Healthy'})
            </p>
          </CardContent>
        </Card>

        {/* P95 Latency */}
        <Card className={metrics.p95Latency > 1000 ? 'border-yellow-500' : ''}>
          <CardHeader>
            <CardTitle>P95 Latency</CardTitle>
            <CardDescription>95th percentile response time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.p95Latency}ms</div>
            <Progress
              value={Math.min((metrics.p95Latency / 2000) * 100, 100)}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Target: &lt;1000ms (current: {metrics.p95Latency > 1000 ? '⚠️ Warning' : '✅ Healthy'})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.recentAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">{alert.message}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(alert.timestamp)} ago
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Timeline**: Day 29-30 (2 days implementation + integration with dashboard)

### 1.6 Memory System Integration

**Product Feature**: Not explicitly in product strategy, but needed for multi-turn conversations

**Research Recommendation**: LlamaIndex Memory → Custom PostgreSQL migration path

#### A. LlamaIndex Memory Implementation (IMMEDIATE - Day 9-10)
**Status**: ✅ Validated - Production-ready, native multi-tenant support, 50-150ms latency

**Implementation**:
```typescript
// packages/memory/src/llama-memory.ts

import {
  Memory,
  FactExtractionMemoryBlock,
  VectorMemoryBlock,
  ConversationMemoryBlock,
} from 'llamaindex';
import { VoyageEmbeddingService } from '@platform/knowledge';
import { db } from '@platform/db';

export class TenantMemoryService {
  private memory: Memory;
  private tenantId: string;

  constructor(tenantId: string, sessionId: string) {
    this.tenantId = tenantId;

    // Initialize memory with PostgreSQL storage
    this.memory = new Memory({
      sessionId: `${tenantId}:${sessionId}`, // Tenant-scoped session ID
      storage: {
        type: 'postgres',
        connectionString: process.env.DATABASE_URL,
        tableName: 'memory_store',
      },
      blocks: [
        // Short-term memory: Recent conversation (last 10 messages)
        new ConversationMemoryBlock({
          maxMessages: 10,
          windowSize: 2048, // tokens
        }),

        // Entity extraction: Track user, product, features mentioned
        new FactExtractionMemoryBlock({
          llm: 'gpt-4o-mini',
          extractionPrompt: `Extract key entities from conversation:
            - User information (name, role, company)
            - Products mentioned
            - Features discussed
            - Issues reported
            - Action items`,
        }),

        // Semantic memory: Long-term context via vector search
        new VectorMemoryBlock({
          embeddingService: new VoyageEmbeddingService(process.env.VOYAGE_API_KEY!),
          topK: 5,
          similarityThreshold: 0.7,
        }),
      ],
    });
  }

  async addMessage(role: 'user' | 'assistant', content: string, metadata?: object) {
    await this.memory.addMessage({
      role,
      content,
      metadata: {
        ...metadata,
        tenantId: this.tenantId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async getContext(): Promise<string> {
    // Retrieve multi-block context
    const context = await this.memory.getContext();

    return `
# Recent Conversation
${context.conversation}

# Known Facts
${context.facts.map((f) => `- ${f.fact} (confidence: ${f.confidence})`).join('\n')}

# Relevant Past Context
${context.semantic.map((s) => `- ${s.content} (similarity: ${s.score})`).join('\n')}
    `.trim();
  }

  async searchMemory(query: string): Promise<string[]> {
    const results = await this.memory.search(query, { topK: 3 });
    return results.map((r) => r.content);
  }

  async clearSession() {
    await this.memory.clear();
  }
}

// Integration into LiveKit agent
// livekit-agent/agent.py

class VisionAwareAgent(voice.Agent):
    def __init__(self, tenant_id: str, session_id: str):
        super().__init__()
        self.tenant_id = tenant_id
        self.session_id = session_id
        self.memory = TenantMemoryService(tenant_id, session_id)  # NEW

    async def on_user_speech(self, text: str, llm_instance: llm.LLM):
        # Add user message to memory
        await self.memory.add_message('user', text)

        # Get memory context
        memory_context = await self.memory.get_context()

        # Combine with RAG context
        rag_context = await self.backend.retrieve_knowledge(self.tenant_id, text)

        # Generate response with memory + RAG context
        full_context = f"{memory_context}\n\n# Retrieved Knowledge\n{rag_context}"
        response = await llm_instance.generate(text, context=full_context)

        # Add assistant response to memory
        await self.memory.add_message('assistant', response)

        return response

    async def on_session_end(self):
        # Memory persists in PostgreSQL, no manual save needed
        logger.info(f"Session ended, memory persisted for {self.tenant_id}:{self.session_id}")
```

**Cost Analysis**:
```
LlamaIndex Memory Costs:
- Fact extraction: GPT-4o-mini ($0.15/1M tokens)
  - ~500 tokens per extraction = $0.000075 per message
- Vector embeddings: Voyage ($0.08/1M tokens)
  - ~100 tokens per message = $0.000008 per message
- PostgreSQL storage: Included (existing database)

Total: ~$0.00008/message for memory

At 10K conversations/month (avg 10 messages each):
- 100K messages × $0.00008 = $8/month

Marginal cost compared to LLM costs ($400-500/month)
```

**Product Impact**:
- Multi-turn conversations with full context retention
- Entity tracking (user mentions product, agent remembers)
- Semantic search of past conversations
- Foundation for personalization features (Phase 11+)

**Timeline**: Day 9-10 (2 days implementation)

---

## Part 2: Pricing Strategy & Billing Architecture

### 2.1 Pricing Model Decision (Phase 10 MVP)

**Model Selected**: **Hybrid Outcome-Based Pricing** (Seat + Resolution Usage)

**Rationale**:
- Combines predictable recurring revenue (seats) with value-aligned usage charges (resolutions)
- Leverages 75-85% cost advantage to undercut competitors (Intercom $0.99, Zendesk $1.50-2.00)
- Clear, transparent pricing builds trust and showcases cost efficiency
- Enables land-and-expand strategy (start with Professional, grow to Enterprise)

#### Pricing Tiers

**Professional Tier: $89/seat/month**
- 50 AI resolutions included per seat
- Unlimited text chat interactions
- 500 voice minutes included
- 100 video minutes included
- Standard response time
- Email + community support
- Up to 1GB knowledge base storage
- Additional resolutions: **$0.75 each** (25% below Intercom's $0.99)

**Enterprise Tier: $149/seat/month**
- 150 AI resolutions included per seat
- Unlimited multi-modal interactions
- 2,000 voice minutes included
- 500 video minutes included
- Priority routing and response
- Dedicated success manager
- 24/7 phone + email support
- Up to 10GB knowledge base storage
- SSO, advanced security, audit logs
- Additional resolutions: **$0.75 each** (same as Professional)

**Additional Usage Beyond Included Amounts**:
- AI resolutions: **$0.75 each** (25% below Intercom)
- Voice minutes: **$0.015/minute** (competitive with LiveKit pricing)
- Video minutes: **$0.025/minute**
- Screen sharing: Included in video rate
- Knowledge base storage: **$0.05/GB/month** (2x markup on S3)

#### Free Tier Strategy

**14-Day Free Trial** (Credit card required):
- Full Professional tier features
- 5 seats maximum
- 50 AI resolutions (with abuse limits)
- 200 voice minutes (with abuse limits)
- 50 video minutes (with abuse limits)
- Remove "Powered by" branding
- Email support during trial
- Converts to text-only free tier after 14 days

**Perpetual Free Tier** (After trial expires):
- 2 seats maximum
- **Text chat ONLY** (no voice/video to prevent infrastructure abuse)
- 25 AI resolutions per month
- 500MB knowledge base storage
- "Powered by [Platform]" branding in widget
- Community support only
- Email verification + phone verification for signup

**Conversion Targets**:
- Trial-to-paid: **40%+** (credit card requirement improves conversion 2.6x)
- Free-to-paid: **4-6%** (above 2.6% industry average)

#### Pricing Page Requirements

**Public Transparent Pricing** (NO "Contact Sales" for SMB):
- Clear tier comparison table
- Real-time cost calculator (conversations, minutes, storage)
- Savings comparison vs competitors (Intercom, Zendesk)
- FAQ addressing common pricing questions
- Self-serve signup for Professional tier
- "Contact Sales" button for Enterprise (100+ seats)

**Cost Transparency Differentiator**:
- Show exact per-resolution cost ($0.75 vs Intercom $0.99)
- Highlight 75-85% infrastructure cost savings passed to customers
- Real-time usage dashboard in admin panel
- No hidden fees, no surprise charges

### 2.2 Database Schema Additions for Pricing

#### New Tables

**1. `subscription_plans` Table**
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- 'free', 'professional', 'enterprise'
  display_name VARCHAR(100) NOT NULL,
  price_per_seat_monthly INTEGER NOT NULL, -- cents (8900, 14900)
  included_resolutions INTEGER NOT NULL, -- 0, 50, 150
  included_voice_minutes INTEGER NOT NULL, -- 0, 500, 2000
  included_video_minutes INTEGER NOT NULL, -- 0, 100, 500
  included_storage_gb INTEGER NOT NULL, -- 0.5, 1, 10
  features JSONB NOT NULL, -- Array of feature flags
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);

-- Seed data
INSERT INTO subscription_plans (name, display_name, price_per_seat_monthly, included_resolutions, included_voice_minutes, included_video_minutes, included_storage_gb, features) VALUES
  ('free', 'Free', 0, 25, 0, 0, 0.5, '["text_chat", "community_support"]'::jsonb),
  ('professional', 'Professional', 8900, 50, 500, 100, 1, '["text_chat", "voice", "video", "email_support", "integrations"]'::jsonb),
  ('enterprise', 'Enterprise', 14900, 150, 2000, 500, 10, '["text_chat", "voice", "video", "priority_support", "sso", "audit_logs", "dedicated_manager"]'::jsonb);
```

**2. `tenant_subscriptions` Table**
```sql
CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  seats_purchased INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'trial', 'canceled', 'past_due'
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_seats CHECK (seats_purchased > 0),
  CONSTRAINT valid_status CHECK (status IN ('active', 'trial', 'canceled', 'past_due', 'unpaid'))
);

CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_trial_ends ON tenant_subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
```

**3. `usage_quotas` Table**
```sql
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Included amounts (from plan)
  included_resolutions INTEGER NOT NULL,
  included_voice_minutes INTEGER NOT NULL,
  included_video_minutes INTEGER NOT NULL,
  included_storage_gb INTEGER NOT NULL,

  -- Used amounts (tracked in real-time)
  used_resolutions INTEGER DEFAULT 0,
  used_voice_minutes INTEGER DEFAULT 0,
  used_video_minutes INTEGER DEFAULT 0,
  used_storage_gb DECIMAL(10,2) DEFAULT 0,

  -- Overage amounts (calculated)
  overage_resolutions INTEGER GENERATED ALWAYS AS (GREATEST(used_resolutions - included_resolutions, 0)) STORED,
  overage_voice_minutes INTEGER GENERATED ALWAYS AS (GREATEST(used_voice_minutes - included_voice_minutes, 0)) STORED,
  overage_video_minutes INTEGER GENERATED ALWAYS AS (GREATEST(used_video_minutes - included_video_minutes, 0)) STORED,
  overage_storage_gb DECIMAL(10,2) GENERATED ALWAYS AS (GREATEST(used_storage_gb - included_storage_gb, 0)) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_period CHECK (period_end > period_start),
  CONSTRAINT valid_usage CHECK (
    used_resolutions >= 0 AND
    used_voice_minutes >= 0 AND
    used_video_minutes >= 0 AND
    used_storage_gb >= 0
  )
);

CREATE UNIQUE INDEX idx_usage_quotas_tenant_period ON usage_quotas(tenant_id, period_start);
CREATE INDEX idx_usage_quotas_subscription ON usage_quotas(subscription_id);
```

**4. `resolutions` Table**
```sql
CREATE TABLE resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Resolution details
  status VARCHAR(20) NOT NULL, -- 'successful', 'failed', 'escalated'
  resolution_type VARCHAR(30), -- 'direct_answer', 'knowledge_base', 'guided_workflow'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00

  -- User satisfaction (optional, collected post-resolution)
  user_rating INTEGER, -- 1-5 stars
  user_feedback TEXT,

  -- Metadata
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('successful', 'failed', 'escalated')),
  CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0 AND 1),
  CONSTRAINT valid_rating CHECK (user_rating BETWEEN 1 AND 5 OR user_rating IS NULL)
);

CREATE INDEX idx_resolutions_tenant ON resolutions(tenant_id);
CREATE INDEX idx_resolutions_session ON resolutions(session_id);
CREATE INDEX idx_resolutions_status ON resolutions(status);
CREATE INDEX idx_resolutions_resolved_at ON resolutions(resolved_at);
```

**5. `overage_charges` Table**
```sql
CREATE TABLE overage_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
  quota_id UUID NOT NULL REFERENCES usage_quotas(id) ON DELETE CASCADE,

  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Overage quantities
  overage_resolutions INTEGER DEFAULT 0,
  overage_voice_minutes INTEGER DEFAULT 0,
  overage_video_minutes INTEGER DEFAULT 0,
  overage_storage_gb DECIMAL(10,2) DEFAULT 0,

  -- Pricing (cents per unit)
  price_per_resolution INTEGER DEFAULT 75, -- $0.75
  price_per_voice_minute INTEGER DEFAULT 2, -- $0.015 rounded to nearest cent
  price_per_video_minute INTEGER DEFAULT 3, -- $0.025 rounded to nearest cent
  price_per_storage_gb INTEGER DEFAULT 5, -- $0.05

  -- Total charges (cents)
  resolutions_charge INTEGER GENERATED ALWAYS AS (overage_resolutions * price_per_resolution) STORED,
  voice_minutes_charge INTEGER GENERATED ALWAYS AS (overage_voice_minutes * price_per_voice_minute) STORED,
  video_minutes_charge INTEGER GENERATED ALWAYS AS (overage_video_minutes * price_per_video_minute) STORED,
  storage_charge INTEGER GENERATED ALWAYS AS (CAST(overage_storage_gb * price_per_storage_gb AS INTEGER)) STORED,
  total_charge INTEGER GENERATED ALWAYS AS (
    (overage_resolutions * price_per_resolution) +
    (overage_voice_minutes * price_per_voice_minute) +
    (overage_video_minutes * price_per_video_minute) +
    CAST(overage_storage_gb * price_per_storage_gb AS INTEGER)
  ) STORED,

  -- Stripe invoice details
  stripe_invoice_id VARCHAR(255),
  stripe_invoice_status VARCHAR(50),
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_period CHECK (period_end > period_start),
  CONSTRAINT valid_overages CHECK (
    overage_resolutions >= 0 AND
    overage_voice_minutes >= 0 AND
    overage_video_minutes >= 0 AND
    overage_storage_gb >= 0
  )
);

CREATE INDEX idx_overage_charges_tenant ON overage_charges(tenant_id);
CREATE INDEX idx_overage_charges_subscription ON overage_charges(subscription_id);
CREATE INDEX idx_overage_charges_quota ON overage_charges(quota_id);
CREATE INDEX idx_overage_charges_period ON overage_charges(period_start, period_end);
CREATE INDEX idx_overage_charges_stripe_invoice ON overage_charges(stripe_invoice_id);
```

**6. Update `budget_alerts` Table** (Multi-Threshold)
```sql
-- Extend existing budget_alerts table
ALTER TABLE budget_alerts
  ADD COLUMN threshold_70_triggered BOOLEAN DEFAULT false,
  ADD COLUMN threshold_90_triggered BOOLEAN DEFAULT false,
  ADD COLUMN threshold_100_triggered BOOLEAN DEFAULT false,
  ADD COLUMN threshold_110_triggered BOOLEAN DEFAULT false,
  ADD COLUMN threshold_120_triggered BOOLEAN DEFAULT false,
  ADD COLUMN last_alert_sent_at TIMESTAMPTZ,
  ADD COLUMN alert_frequency_hours INTEGER DEFAULT 24; -- Prevent alert spam

-- Add indexes
CREATE INDEX idx_budget_alerts_triggered ON budget_alerts(tenant_id, threshold_100_triggered);

-- Update existing constraint
ALTER TABLE budget_alerts
  DROP CONSTRAINT IF EXISTS budget_alerts_amount_check,
  ADD CONSTRAINT valid_budget_amount CHECK (budget_amount > 0);
```

#### RLS Policies for New Tables

```sql
-- subscription_plans: Read-only for all authenticated tenants
CREATE POLICY "Tenants can view all subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- tenant_subscriptions: Tenant-isolated
CREATE POLICY "Tenants can view own subscriptions"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Tenants can update own subscriptions"
  ON tenant_subscriptions FOR UPDATE
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- usage_quotas: Tenant-isolated
CREATE POLICY "Tenants can view own usage quotas"
  ON usage_quotas FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "System can update usage quotas"
  ON usage_quotas FOR UPDATE
  TO service_role
  USING (true);

-- resolutions: Tenant-isolated
CREATE POLICY "Tenants can view own resolutions"
  ON resolutions FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "System can insert resolutions"
  ON resolutions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- overage_charges: Tenant-isolated
CREATE POLICY "Tenants can view own overage charges"
  ON overage_charges FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "System can insert overage charges"
  ON overage_charges FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overage_charges ENABLE ROW LEVEL SECURITY;
```

### 2.3 Pricing Implementation Roadmap

#### Phase 10 Week 1: Database + Core Billing Logic

**Day 1-2: Schema Migration**
- [ ] Create migration `010_pricing_billing.sql`
- [ ] Create 6 new tables (subscription_plans, tenant_subscriptions, usage_quotas, resolutions, overage_charges, budget_alerts updates)
- [ ] Add RLS policies for all new tables
- [ ] Seed subscription_plans with 3 tiers (free, professional, enterprise)
- [ ] Test migration rollback and forward

**Day 3-4: Stripe Integration**
- [ ] Set up Stripe account + test mode
- [ ] Install Stripe SDK: `pnpm add stripe @stripe/stripe-js`
- [ ] Create Stripe webhook endpoint (`packages/api/src/webhooks/stripe.ts`)
- [ ] Handle webhook events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Implement subscription creation flow (Professional tier self-serve)
- [ ] Test Stripe test mode with test cards

**Day 5-7: Usage Tracking Service**
- [ ] Create `packages/billing/src/usage-tracker.ts`
- [ ] Implement real-time usage tracking:
  - Resolution completed → increment `usage_quotas.used_resolutions`
  - Voice call → increment `usage_quotas.used_voice_minutes`
  - Video session → increment `usage_quotas.used_video_minutes`
  - Storage upload → update `usage_quotas.used_storage_gb`
- [ ] Add usage tracking to LiveKit agent (Python)
- [ ] Add usage tracking to dashboard API (TypeScript)
- [ ] Implement usage aggregation job (runs every 15 minutes)

#### Phase 10 Week 2: Pricing Page + Dashboard

**Day 8-10: Public Pricing Page**
- [ ] Create `apps/landing/src/pages/pricing.tsx`
- [ ] Build pricing tier comparison table
- [ ] Add real-time cost calculator (interactive)
  - Input: conversations/month, avg voice minutes, avg video minutes
  - Output: Estimated monthly cost, savings vs competitors
- [ ] Add FAQ section (common pricing questions)
- [ ] Add "Start Free Trial" CTA (Professional tier)
- [ ] Add "Contact Sales" CTA (Enterprise tier, 100+ seats)
- [ ] Mobile responsive design

**Day 11-14: Usage Dashboard + Alerts**
- [ ] Create `apps/dashboard/src/pages/billing/usage.tsx`
- [ ] Real-time usage display:
  - Progress bars showing % of included amounts used
  - Resolutions: 35/50 (70% used)
  - Voice minutes: 320/500 (64% used)
  - Video minutes: 45/100 (45% used)
  - Storage: 0.7/1 GB (70% used)
- [ ] Overage forecast:
  - "At current rate, you'll use 65 resolutions this month (+15 overage = +$11.25)"
- [ ] Cost breakdown chart (daily/weekly/monthly trends)
- [ ] Budget alert configuration:
  - Set budget cap (optional hard limit)
  - Alert thresholds: 70%, 90%, 100%, 110%, 120%
  - Email + Slack webhook notifications
- [ ] Export usage data (CSV for finance teams)

#### Phase 10 Week 3: Resolution Tracking + Overage Billing

**Day 15-17: Resolution Classification**
- [ ] Add resolution tracking to LiveKit agent:
  - Successful resolution: confidence >70%, user satisfied
  - Failed resolution: confidence <50%, user frustrated
  - Escalated: explicit user request for human agent
- [ ] Implement resolution confidence scoring (LLM-based)
- [ ] Store resolution data in `resolutions` table
- [ ] Add resolution rate to Performance Dashboard (Week 3 existing work)

**Day 18-21: Overage Billing**
- [ ] Create billing job (`packages/workers/src/jobs/calculate-overages.ts`)
- [ ] Run at end of billing period:
  - Calculate overage quantities from `usage_quotas`
  - Create `overage_charges` record
  - Generate Stripe invoice for overage
  - Send invoice email to tenant admin
- [ ] Test overage calculation accuracy
- [ ] Add overage charges to billing history page

#### Phase 10 Week 4: Free Trial + Abuse Prevention

**Day 22-24: Free Trial Flow**
- [ ] Build trial signup flow:
  - Email + credit card required (Stripe SetupIntent)
  - Create tenant with `status='trial'`
  - Set `trial_ends_at` to 14 days from now
- [ ] Implement trial expiration job (runs daily):
  - Find trials expiring today
  - Send "Trial Ending" email (Day 12)
  - Convert to free tier (text-only) or paid plan
- [ ] Build trial upgrade flow (self-serve)

**Day 25-27: Abuse Prevention**
- [ ] Email verification (existing)
- [ ] Phone/SMS verification for free tier signups (Twilio)
- [ ] Rate limiting:
  - Free tier: 50 API calls/hour max
  - Professional: 500 API calls/hour max
  - Enterprise: 2000 API calls/hour max
- [ ] Device fingerprinting (FingerprintJS)
- [ ] Behavioral monitoring:
  - Flag accounts maxing limits immediately after signup
  - Alert admin for manual review
  - Auto-suspend suspicious accounts (restore after review)
- [ ] Duplicate account detection (email/phone/fingerprint)

**Day 28-30: Testing + Documentation**
- [ ] End-to-end pricing flow testing:
  - Free trial signup → trial usage → conversion → overage → payment
- [ ] Test all Stripe webhook scenarios
- [ ] Test budget alerts at all thresholds
- [ ] Test abuse prevention (create test accounts)
- [ ] Write pricing system documentation
- [ ] Write runbooks for common billing issues

### 2.4 Competitive Positioning

**Our Pricing vs Competitors**:

| Platform | Base Plan | Resolution Cost | Seat Cost | Our Advantage |
|----------|-----------|----------------|-----------|---------------|
| **Intercom Fin** | $85-139/seat | $0.99 flat | $29-139/seat | ✅ 25% cheaper resolutions ($0.75) |
| **Zendesk AI** | $55-169/seat | $1.00-2.00 | $55-169/seat | ✅ 25-62% cheaper resolutions |
| **Thunai** | $9+/seat | Unknown | $9+ | ✅ Multi-modal + enterprise features |
| **Salesforce** | $125-550/user | $2.00/conv | $125-550/user | ✅ 62% cheaper resolutions |
| **Our Platform** | **$89-149/seat** | **$0.75** | **$89-149/seat** | 🎯 Best price-to-feature ratio |

**Value Proposition**:
- **25% cheaper than Intercom** on per-resolution cost
- **Native multi-modal** (voice, video, screen sharing) included
- **Transparent cost tracking** (real-time usage dashboard)
- **75-85% infrastructure cost savings** passed to customers
- **Public transparent pricing** (no "Contact Sales" required for SMB)
- **14-day trial with full features** (credit card required for high conversion)

---

## Part 3: Prioritized Implementation Roadmap

### Week 1: Foundation + Quick Wins

**Day 1-2: Database + Reranking (HIGHEST ROI)**
- [x] Create 9 new database tables (product strategy)
- [x] Add RLS policies for tenant isolation
- [x] Write migration 009_platform_features.sql
- [x] **[NEW]** Implement Cohere reranking in RAG pipeline (20-40% accuracy improvement, $20-200/month)
- [x] **[NEW]** Integrate reranking into knowledge retrieval endpoint

> **📌 Phase 12 Integration Note**: This Week 1 RAG foundation (semantic chunking + Cohere reranking) will be extended in Phase 12 with advanced enterprise support features including BM25 hybrid search, RRF fusion algorithm, and RAGAS evaluation framework for customer support optimization.

**Day 3-4: Prompt Caching + Knowledge UI (87% COST REDUCTION)**
- [x] Build knowledge management UI (product strategy)
- [x] **[NEW]** Implement Anthropic prompt caching (87% cost reduction on Claude calls)
- [x] **[NEW]** Refactor system prompts for cache-control markers
- [x] **[NEW]** Add cache hit rate tracking in cost dashboard
- [x] Test caching with 5-minute TTL window

**Day 5-7: Agent Configuration (PRODUCT DIFFERENTIATION)**
- [x] Build agent configuration page (product strategy)
- [x] **[NEW]** Implement progressive disclosure UI (80% of users need defaults only)
- [x] **[NEW]** Add cost estimate calculator (real-time, per-conversation)
- [x] **[NEW]** Add preset configurations (Professional, Friendly, Technical, Custom)

**Week 1 Validation**:
- ✅ Reranking improves top-5 retrieval by 20-40% (measure with A/B test)
- ✅ Prompt caching delivers 80%+ hit rate (5-minute TTL sufficient for LiveKit sessions)
- ✅ Cost per conversation drops by 50%+ (combined reranking + caching + existing three-tier routing)
- ✅ 80% of beta users stay in default presets (validates progressive disclosure)

### Week 2: Conversations + Memory + Adaptive Frames

**Day 8-9: Conversation Management + Adaptive Frames (12% ADDITIONAL SAVINGS)**
- [x] Build conversations list page (product strategy)
- [x] Build conversation detail page with transcript
- [x] **[NEW]** Implement adaptive frame thresholds (12% additional cost savings on vision)
- [x] **[NEW]** Add content type detection (code/UI/docs/video)
- [x] **[NEW]** Track deduplication stats per content type

**Day 10-11: Memory System + Escalations (MULTI-TURN CONTEXT)**
- [x] **[NEW]** Implement LlamaIndex memory service (multi-tenant PostgreSQL storage)
- [x] **[NEW]** Integrate memory into LiveKit agent (context retention across messages)
- [x] Build escalation routing service (product strategy)
- [x] Build escalations list page

**Day 12-14: Cost Intelligence (DIFFERENTIATOR)**
- [x] Build cost dashboard (product strategy)
- [x] Implement cost aggregation job (runs every 15 min)
- [x] Build budget configuration page
- [x] Add budget warning system (80%, 90%, 100%)
- [x] **[NEW]** Add caching savings breakdown
- [x] **[NEW]** Add deduplication savings breakdown

**Week 2 Validation**:
- ✅ Adaptive frames reduce vision costs by 10-15% (measure dedup rate by content type)
- ✅ Memory system retains context across multi-turn conversations (test with 10+ message sessions)
- ✅ Cost dashboard shows real-time data with 87%+ savings vs baseline
- ✅ Budget warnings work correctly (test by setting low cap)

### Week 3: Intelligence + Monitoring

**Day 15-16: Knowledge Gap Detection (AI OPTIMIZATION DIFFERENTIATOR)**
- [x] Implement knowledge gap detection job (product strategy + research integration)
- [x] **[NEW]** Cluster similar questions using DBSCAN + embeddings
- [x] **[NEW]** Calculate impact score (frequency × escalation_rate)
- [x] **[NEW]** Generate article outlines with GPT-4
- [x] Build knowledge gap list page with suggested articles

> **📌 Phase 12 Integration Note**: This Week 3 knowledge gap detection will be integrated with Phase 12's RAGAS evaluation framework (faithfulness, answer relevancy, context precision/recall) for comprehensive quality assurance and automated knowledge base enhancement.

**Day 17-18: Topic Performance Analytics**
- [x] Implement topic extraction from conversations (product strategy)
- [x] Build topic performance calculation job
- [x] Build topic performance matrix page (scatter plot)

**Day 19-21: Performance Dashboard + Monitoring (PROACTIVE QUALITY)**
- [x] Build performance dashboard (5 KPI cards)
- [x] Add resolution rate + escalation rate charts
- [x] **[NEW]** Implement multi-signal quality monitoring (retry rate, session completion, latency)
- [x] **[NEW]** Set up automated alerts (Slack + email)
- [x] **[NEW]** Add real-time health dashboard

**Week 3 Validation**:
- ✅ Knowledge gaps detected and clustered correctly (review top 10 gaps with domain expert)
- ✅ Article outlines are actionable (50%+ of outlines lead to actual article creation)
- ✅ Quality alerts trigger correctly (test by artificially degrading metrics)
- ✅ Retry rate <20%, session completion >75%, P95 latency <1 second

### Week 4: Deployment + Polish + Production Readiness

**Day 22-23: Widget Deployment**
- [x] Build widget configuration page (product strategy)
- [x] Add live widget preview
- [x] Generate embed code snippet
- [x] Add installation guides (HTML, React, Next.js)

**Day 24-25: Testing & Integrations**
- [x] Build batch testing interface (product strategy)
- [x] Implement Slack integration (OAuth + escalation notifications)
- [x] Implement Zendesk integration (ticket creation on escalation)

**Day 26-27: Team Management + API**
- [x] Build team members page (product strategy)
- [x] Implement role-based access control
- [x] Build API keys page
- [x] Build webhook configuration page

**Day 28-30: Final Polish + Monitoring Setup (PRODUCTION READY)**
- [x] End-to-end testing (full user flows)
- [x] Performance optimization (bundle size, load times)
- [x] **[NEW]** Set up production monitoring (Sentry, Datadog, or custom)
- [x] **[NEW]** Configure quality monitoring alerts
- [x] **[NEW]** Add cost anomaly detection
- [x] **[NEW]** Set up uptime monitoring (status page)
- [x] Write deployment documentation
- [x] Production deployment checklist

**Week 4 Validation**:
- ✅ Can complete full user journey end-to-end
- ✅ All quality monitoring alerts working
- ✅ Performance targets met (<3s page load, <200ms API response, <1s P95 latency)
- ✅ Cost tracking accurate to within 5%
- ✅ Ready for 10 beta customers

---

## Part 3: Cost Impact Summary

### Current Cost Optimization (Already Implemented)
- **Three-tier attempt-based escalation** (Gemini Flash-Lite 60% / Flash 25% / Claude 15%): **85% savings**
  - Philosophy: "Upgrade the brain, not the eyes" - retry with better models, not more frames
  - Cost: $0.06 → $0.08 → $0.40 per resolution (worst-case $0.54, under $0.70 overage)
  - Users charged on 1 FPS baseline, optimizations (pHash, adaptive thresholds) = profit
- Dashboard chat routing (GPT-4o-mini 70% / GPT-4o 30%): **75% savings**
- 1 FPS screen capture (vs 30 FPS): **96% savings**
- pHash frame deduplication (fixed threshold): **60-75% reduction**

**Combined baseline cost reduction**: **82-85%** (already in product_strategy_implementation_plan.md)

### New Optimizations (Phase 10)
- Anthropic prompt caching (Week 1, Day 3-4): **87% reduction on Claude calls** (15% of traffic)
  - Impact: 15% × 87% = **13% additional overall savings**
- Adaptive frame thresholds (Week 2, Day 8-9): **12% additional savings on vision**
  - Impact: Vision is 30% of cost → 30% × 12% = **3.6% additional overall savings**
- Cohere reranking (Week 1, Day 2): **Marginal cost** ($20-200/month) but **20-40% accuracy improvement** → reduces escalations → lowers human agent costs

**New total cost reduction**: **85% + 13% + 3.6% = 92-95% vs naive baseline** (GPT-4o + 30 FPS vision + no caching + no deduplication)

### Cost Breakdown Example (1,000 Conversations/Month)

**Naive Baseline** (no optimizations):
- LLM (GPT-4o only): 1,000 × 500 input × $5/M = $2.50
- LLM (GPT-4o output): 1,000 × 150 output × $15/M = $2.25
- Vision (30 FPS, 6 min avg): 1,000 × 10,800 frames × $0.30/1K = $3,240
- **TOTAL: $3,244.75/month**

**With Phase 10 Optimizations** (Actual Cost to Us):
- LLM (GPT-4o-mini 70% / GPT-4o 30%): $0.45 (text)
- Vision (attempt-based escalation + 1 FPS + pHash + adaptive thresholds + caching):
  - **Pricing Model**: Users charged on 1 FPS baseline, our optimizations = profit margin
  - Frames: 1,000 × 360 frames (1 FPS) × 0.3 (dedup) × 0.88 (adaptive) = 95K frames analyzed
  - Flash-Lite (60%): 57K × $0.075/1K = $4.28
  - Flash (25%): 24K × $0.20/1K = $4.80
  - Claude (15%, with caching 87% reduction): 14K × $3/1K × 0.13 = $5.46
  - Vision total: $14.54
- Reranking: 1,000 × $0.002 = $2.00
- Embeddings: 1,000 × $0.01 = $10.00
- Memory: 1,000 × 10 messages × $0.00008 = $0.80
- **TOTAL COST TO US: $27.79/month**
- **USER PRICING**: Based on 1 FPS baseline (see Phase 11 pricing tiers)
- **PROFIT MARGIN**: pHash (60-75% savings) + adaptive thresholds (12% savings) = our margin

**SAVINGS: $3,244.75 - $27.79 = $3,216.96/month (99.1% reduction)**

Note: Naive baseline is artificially high (30 FPS vision is unrealistic). More realistic industry baseline (GPT-4o text + Gemini Flash vision at 1 FPS) would be ~$150-200/month, making our savings **85-90%** vs realistic baseline.

---

## Part 4: Success Metrics Integration

### Technical Validation (Pre-Launch)

**Performance**:
- ✅ Page load time: <3 seconds (LCP) - [Already in product strategy]
- ✅ API response time: <200ms (p95) - [Already in product strategy]
- ✅ **[NEW]** P95 latency: <1 second (quality monitoring threshold)
- ✅ **[NEW]** P99 latency: <3 seconds (abandonment threshold)
- ✅ **[NEW]** Cache hit rate: >80% (prompt caching effectiveness)
- ✅ **[NEW]** Deduplication rate: 60-75% (adaptive frame thresholds working)

**Quality**:
- ✅ **[NEW]** Retry rate: <20% (strongest predictor of user satisfaction)
- ✅ **[NEW]** Session completion: >75% (users completing conversations naturally)
- ✅ **[NEW]** Reranking improvement: 20-40% top-5 accuracy (A/B test validation)
- ✅ Resolution rate: >50% (target: 60%+) - [Already in product strategy]

**Cost**:
- ✅ Average cost per conversation: <$0.10 - [Already in product strategy]
- ✅ **[NEW]** Combined savings vs baseline: >90% (prompt caching + adaptive frames + existing optimizations)
- ✅ **[NEW]** Budget overages: 0 (budget enforcement working)

### Product Metrics (Beta Phase - Months 1-3)

**Engagement**:
- Target: >50 conversations/week per customer - [Already in product strategy]
- **[NEW]** Knowledge gap resolution: >30% of detected gaps lead to article creation
- **[NEW]** Optimization suggestions acted on: >40% (AI-powered recommendations useful)

**Quality**:
- Target: >50% resolution rate (target: 60%) - [Already in product strategy]
- **[NEW]** Resolution rate with reranking: >60% (20-40% improvement from baseline)
- **[NEW]** Escalation rate: <25% (target: <25%) - Multi-signal monitoring prevents quality degradation

**Retention**:
- Target: >80% 30-day retention - [Already in product strategy]
- **[NEW]** Memory-enabled conversations: 100% (LlamaIndex integration complete)
- **[NEW]** Cost transparency: 100% visibility (customers see real-time costs)

---

## Part 5: Risk Mitigation (Research Findings)

### Research Validation vs Product Assumptions

**Validated Claims** ✅:
- Reranking 20-40% improvement: ✅ Confirmed by multiple independent benchmarks (15-25% typical, up to 39% in best cases)
- Prompt caching 90% reduction: ✅ Confirmed for appropriate use cases (53-90% range, 90% achievable for document Q&A)
- Adaptive frame thresholds 15-20% improvement: ✅ Confirmed for code content specifically

**Optimistic Claims** ⚠️:
- RAFT 30-76% improvement: ⚠️ True but requires upfront investment ($1K-2.7K), defer until volume justifies
- Model distillation 90%+ quality: ⚠️ Achievable for well-defined tasks but 70-95% range more realistic
- Vision models replace OCR: ⚠️ True for code/handwriting/diagrams but traditional OCR still cheaper for clean text

**Product Strategy Adjustments**:
- ✅ Implement reranking immediately (Week 1): Highest ROI, lowest risk
- ✅ Implement prompt caching immediately (Week 1): Validated 87% savings, 5-min TTL works for LiveKit
- ✅ Implement adaptive frame thresholds (Week 2): 12% additional savings with minimal complexity
- ✅ Implement LlamaIndex memory (Week 2): Production-ready, multi-tenant support, 50-150ms latency
- ✅ Keep hybrid vision approach: Use vision models for code/errors, traditional OCR for clean UI (already doing this with adaptive thresholds)

### Technical Risks (Research-Informed Mitigation)

**Risk: Prompt Caching Cache Miss Rate High**
- Research finding: 5-minute TTL requires maintaining conversation state
- Mitigation: LiveKit sessions naturally maintain state within 5-min window
- Contingency: If cache hit rate <80%, investigate session persistence issues
- Monitoring: Track cache hit rate per tenant in cost dashboard

**Risk: Adaptive Frame Thresholds Cause Thrashing**
- Research finding: Content type changes can cause threshold oscillation
- Mitigation: 3-frame stability counter prevents thrashing (implemented in research code)
- Monitoring: Track content type transitions per session

**Risk: LlamaIndex Memory Latency >150ms**
- Research finding: LlamaIndex adds 50-150ms latency vs in-memory
- Mitigation: PostgreSQL storage with proper indexing keeps latency <100ms
- Contingency: Migrate to custom PostgreSQL if latency consistently >200ms
- Timeline: Month 6-12 if needed

**Risk: Reranking Costs Spiral**
- Research finding: Cohere charges $2/1K searches, self-hosted break-even at 10M queries/month
- Mitigation: Monitor reranking costs in cost dashboard, alert if >$500/month
- Contingency: Switch to self-hosted BAAI/bge-reranker-v2-m3 when costs justify GPU infrastructure
- Timeline: Month 12+ when query volume >10M/month

---

## Part 6: Implementation Checklist

### Week 1: Foundation + Quick Wins
- [ ] Day 1-2: Database + Reranking
  - [ ] Create 9 new tables (product strategy)
  - [ ] Add RLS policies
  - [ ] Implement Cohere reranking in RAG pipeline
  - [ ] A/B test: reranking vs baseline (measure top-5 accuracy)
  - [ ] Integration test: full RAG flow with reranking
- [ ] Day 3-4: Prompt Caching + Knowledge UI
  - [ ] Refactor system prompts for cache-control markers
  - [ ] Implement caching in AnthropicProvider
  - [ ] Add cache hit rate tracking
  - [ ] Build knowledge management UI
  - [ ] Test: 5-minute TTL sufficient for LiveKit sessions
- [ ] Day 5-7: Agent Configuration
  - [ ] Build agent configuration page
  - [ ] Implement progressive disclosure UI (presets)
  - [ ] Add cost estimate calculator
  - [ ] Test: 80% of users stay in defaults

### Week 2: Conversations + Memory + Adaptive Frames
- [ ] Day 8-9: Conversations + Adaptive Frames
  - [ ] Build conversation list/detail pages
  - [ ] Implement adaptive frame thresholds (Python agent)
  - [ ] Add content type detection (Laplacian variance)
  - [ ] Test: dedup rate 60-75% maintained, 12% additional savings
- [ ] Day 10-11: Memory + Escalations
  - [ ] Implement LlamaIndex memory service
  - [ ] Integrate memory into LiveKit agent
  - [ ] Build escalation routing service
  - [ ] Test: context retention across 10+ message sessions
- [ ] Day 12-14: Cost Intelligence
  - [ ] Build cost dashboard
  - [ ] Implement cost aggregation job (15 min intervals)
  - [ ] Build budget configuration + warnings
  - [ ] Add caching + deduplication savings breakdown
  - [ ] Test: budget warnings at 80%, 90%, 100%

### Week 3: Intelligence + Monitoring
- [ ] Day 15-16: Knowledge Gap Detection
  - [ ] Implement detection job (clustering + impact scoring)
  - [ ] Build knowledge gap list page
  - [ ] Generate article outlines with GPT-4
  - [ ] Test: top 10 gaps are actionable
- [ ] Day 17-18: Topic Performance
  - [ ] Implement topic extraction
  - [ ] Build topic performance matrix
  - [ ] Test: scatter plot shows actionable insights
- [ ] Day 19-21: Performance Dashboard + Monitoring
  - [ ] Build performance dashboard (5 KPI cards)
  - [ ] Implement multi-signal quality monitoring
  - [ ] Set up automated alerts (Slack + email)
  - [ ] Build real-time health dashboard
  - [ ] Test: alerts trigger correctly when thresholds breached

### Week 4: Deployment + Polish
- [ ] Day 22-25: Widget + Testing + Integrations
  - [ ] Build widget configuration page
  - [ ] Build batch testing interface
  - [ ] Implement Slack integration
  - [ ] Implement Zendesk integration
- [ ] Day 26-27: Team + API
  - [ ] Build team management pages
  - [ ] Build API keys + webhook pages
- [ ] Day 28-30: Production Readiness
  - [ ] End-to-end testing (full user flows)
  - [ ] Performance optimization
  - [ ] Set up production monitoring (Sentry/Datadog)
  - [ ] Configure quality monitoring alerts
  - [ ] Add cost anomaly detection
  - [ ] Deployment documentation
  - [ ] **FINAL VALIDATION**: All success metrics met, ready for 10 beta customers

---

## Conclusion

This Phase 10 implementation plan integrates **5 validated technical optimizations** from deep research with the **12 core product features** from the product strategy. It provides a clear 4-week roadmap that:

1. **Prioritizes Quick Wins** (Week 1): Reranking + prompt caching deliver immediate 20-50% improvements with minimal complexity
2. **Builds Core Product** (Weeks 1-2): Knowledge management, agent config, conversations, cost intelligence (product strategy)
3. **Adds Intelligence** (Week 3): AI-powered optimization (knowledge gaps, topic performance) + proactive monitoring
4. **Ensures Production Readiness** (Week 4): Testing, integrations, monitoring, deployment

**Combined Impact**:
- **92-95% cost reduction** vs naive baseline (82-85% existing + 13% caching + 3.6% adaptive frames)
- **20-40% accuracy improvement** from reranking (validated)
- **Proactive quality monitoring** prevents user dissatisfaction before complaints
- **Multi-turn conversations** with full context retention (memory system)
- **AI-powered optimization suggestions** (knowledge gaps, topic performance) - huge differentiator

**Risk Mitigation**:
- All 5 optimizations validated by independent research
- Incremental rollout with A/B testing
- Monitoring and alerts prevent regressions
- Focus on immediate ROI, defer complex optimizations until scale justifies investment

**Next Step**: Review this plan, approve scope, and begin Week 1 Day 1 (database + reranking implementation). 🚀

---

## Appendix: Future Considerations (Month 6-12+)

This section contains deferred optimizations that were evaluated but determined to require higher scale or upfront investment before implementation. These are preserved as annotations for future reference when triggers are met.

### A. RAFT Fine-Tuning (DEFERRED)

**Status**: ✅ Validated - 30-76% accuracy improvement on benchmarks, but requires significant upfront investment

**Cost-Benefit Analysis**:
- **Dataset generation**: $500-2,000 (GPT-4 for synthetic data)
- **Fine-tuning**: $500-700 (Vertex AI, 10K examples, 4 epochs)
- **Total upfront**: $1,000-2,700
- **Break-even**: 100K requests/day (2 days), 10K requests/day (20 days), 1K requests/day (200 days)

**When to Implement**:
- Query volume reaches 50K+ per month
- Beta customers report frequent RAG failures despite reranking
- Resolution rate remains <50% after implementing reranking
- Budget available for upfront ML investment

**Implementation Approach**:
1. Generate (query, retrieved_docs, answer) triplets with distractor documents
2. Fine-tune Gemini Flash or Llama 3.1 on Vertex AI
3. A/B test: RAFT vs standard RAG (measure accuracy improvement)
4. Monitor quality improvements and cost savings
5. Full rollout if accuracy gain justifies cost

**Research Validation**: UC Berkeley paper (arXiv:2403.10131) shows 73.3% vs 58.8% on PubMed QA, 76.35 percentage point improvement on API docs

**Trigger for Reconsideration**: Month 6-12, when query volume justifies $1K-2.7K upfront cost and operational scale demands higher accuracy

---

### B. Model Distillation (DEFERRED)

**Status**: ✅ Validated - 70-95% quality retention with 50-80% cost savings vs Claude

**Target**: Distill Claude Sonnet 4.5 → Llama 3.1 8B (open-source, self-hostable)

**Cost-Benefit Analysis**:
- **Training cost**: $16-96 for LoRA fine-tuning on cloud GPUs
- **Inference cost**: $0.50-2.00 per million tokens (self-hosted) vs Claude $3.00/M
- **Break-even**: 100K requests/day (2 days), 10K requests/day (20 days)
- **Current Claude usage**: 15% of queries = not yet economical

**When to Implement**:
- Claude Sonnet usage reaches 10K+ daily requests
- Cost monitoring shows Claude costs >$1K/month
- Open-source licensing and self-hosting capabilities mature
- Quality retention validated at 85%+ for domain-specific tasks

**Implementation Approach**:
1. Collect Claude Sonnet request/response pairs (10K-50K examples)
2. Fine-tune Llama 3.1 8B using LoRA (torchtune or HuggingFace)
3. Deploy self-hosted inference server (vLLM or TGI)
4. A/B test: Distilled Llama vs Claude (measure quality retention)
5. Gradual rollout: 10% → 50% → 100% if quality maintained

**Research Validation**: Google's supervised fine-tuning supports up to 1M text examples, quality retention 70-95% depending on task complexity

**Trigger for Reconsideration**: Month 6-12, when Claude Sonnet usage (currently 15% of queries) hits 10K+ daily requests and cost justifies investment

---

### C. Custom PostgreSQL Memory Migration (DEFERRED)

**Status**: Planned migration path when LlamaIndex limitations encountered

**When to Migrate**:
- Memory query latency consistently >200ms
- Need custom memory retrieval logic not supported by LlamaIndex
- LlamaIndex feature limitations discovered in production
- Cost optimization requires fine-grained control over embeddings/queries

**Migration Strategy**:
1. **Design custom schema**:
   - `memory_events` table (session_id, tenant_id, event_type, content, timestamp)
   - `memory_entities` table (entity_type, entity_value, confidence, session_id)
   - `memory_vectors` table (embedding, content, session_id) with pgvector
2. **Implement incremental migration**:
   - New sessions → custom PostgreSQL
   - Old sessions → continue using LlamaIndex
   - Dual-write period for validation
3. **Add custom retrieval logic**:
   - Optimized SQL queries for entity lookup
   - Hybrid search (vector + full-text + recency weighting)
   - Session-specific caching for frequently accessed context
4. **A/B test**: Custom vs LlamaIndex (latency, accuracy, cost)
5. **Full cutover** after 30-day validation period

**Expected Performance**:
- **Latency**: 50-150ms (LlamaIndex) → 10-50ms (custom optimized)
- **Cost**: Marginal PostgreSQL storage increase, no external API costs
- **Flexibility**: Full control over retrieval logic, custom embeddings, advanced caching

**Trigger for Reconsideration**: Month 6-12, defer until reaching 10K+ active users or LlamaIndex latency consistently exceeds 200ms

---

### D. Self-Hosted Reranker (DEFERRED)

**Status**: Economically viable only at extreme scale (>10M queries/month)

**When to Implement**:
- Query volume exceeds 10M per month
- Cohere API costs >$20K/month
- Compliance requirements mandate data residency
- GPU infrastructure available or cost-justified

**Cost-Benefit Analysis**:
- **Self-hosted infrastructure**: $500-2,000/month (A100 GPU)
- **Cohere API**: $2/1K searches = $20K/month at 10M queries
- **Break-even**: 10M queries/month
- **Current scale**: Likely <1M queries/month in first 6-12 months

**Implementation Approach**:
1. Deploy BAAI/bge-reranker-v2-m3 on A100 GPU (Docker + FastAPI)
2. Implement request batching for efficiency (up to 100 docs/batch)
3. Add caching layer (Redis) for frequently seen query/doc pairs
4. A/B test: Self-hosted vs Cohere API (latency, quality, cost)
5. Gradual migration: 10% → 50% → 100% traffic

**Model**: BAAI/bge-reranker-v2-m3 (open-source, competitive with Cohere)

**Trigger for Reconsideration**: Month 12+, when query volume >10M/month and Cohere API costs exceed self-hosted GPU infrastructure

---

### E. Progressive Disclosure Dashboard UX (REMOVED)

**Status**: ✅ Validated UX pattern but NOT a technical optimization

**Reason for Removal**: This was UX guidance, not a cost/performance optimization. Moved to appendix as it may be useful for future dashboard redesign.

**Research Finding**: 70% of users never change defaults beyond model selection

**Implementation Example** (preserved for reference):
```typescript
// apps/dashboard/src/pages/agent/configuration.tsx
export default function AgentConfigurationPage() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {/* Preset Configurations (Default View - 80% of users) */}
      <div className="grid grid-cols-2 gap-4">
        <PresetCard title="Professional" description="Formal tone, concise replies" />
        <PresetCard title="Friendly" description="Conversational, detailed explanations" />
        <PresetCard title="Technical" description="Code-focused, expert terminology" />
        <PresetCard title="Custom" description="Configure all settings manually" />
      </div>

      {/* Advanced Settings (Collapsed by default) */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Advanced Settings
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Temperature (0-2)</Label>
            <Slider min={0} max={2} step={0.1} />
            <p className="text-sm text-muted-foreground">
              Lower = more focused, Higher = more creative
            </p>
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input type="number" min={100} max={4000} />
          </div>
          {/* More advanced options... */}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

**Product Impact** (if implemented):
- 80% of users stay in default presets → faster time to value
- 20% power users get full configurability in Advanced Settings
- Reduced cognitive load and decision paralysis

**Trigger for Reconsideration**: Phase 11+ dashboard UX improvements, after collecting real user behavior data on which settings are actually changed

---

### F. Function Calling Pattern ✅ INFRASTRUCTURE READY (Phase 10 Complete)

**Status**: ✅ **IMPLEMENTED** - Function calling infrastructure added in Phase 10, empty and ready for Phase 13+ external integrations

**Implementation Details** (livekit-agent/agent.py):
- **Lines 34-168**: Complete function calling infrastructure with `@function_tool` import, pattern documentation, and `AVAILABLE_TOOLS` list
- **Lines 874-896**: VisionAwareAgent updated with conditional tools parameter support
- **Current State**: `AVAILABLE_TOOLS = []` (empty list - zero performance impact)
- **Hardcoded Operations Preserved**: RAG search (~line 301) and cost logging (~line 556) remain unchanged for optimal Phase 10-12 performance

**Phase 10-12 Strategy (CURRENT)**:
- Keep core operations hardcoded (simple, predictable, faster, lower token costs)
- Infrastructure ready but inactive (no tools in AVAILABLE_TOOLS list)
- New tools will be added to function calling system from day 1
- Zero performance impact: empty tools list = no token overhead

**Phase 13+ Strategy (FUTURE)**:
When external integrations arrive (Salesforce, Zendesk, Calendar, Payment APIs), uncomment placeholder tools or create new ones:

```python
# Example: Adding Zendesk integration
@function_tool
async def create_zendesk_ticket(
    subject: str,
    description: str,
    priority: str = "normal"
) -> str:
    """Create a support ticket in Zendesk when escalation is needed."""
    # Implementation here
    return ticket_confirmation

# Add to AVAILABLE_TOOLS list
AVAILABLE_TOOLS = [
    create_zendesk_ticket,
    # Other tools...
]
```

**What This Infrastructure Enables (When Tools Added)**:
1. **LLM-Orchestrated Tool Calling**: LLM intelligently decides when to call external APIs based on conversation context
2. **Multi-Step Reasoning**: LLM chains multiple tool calls (e.g., search Zendesk → create ticket → update CRM)
3. **Dynamic Workflows**: LLM adapts tool usage based on user needs
4. **Expanded Backend Integration**: Easily add external integrations without modifying agent core logic

**Why This Approach Works**:
- ✅ Phase 10-12: Zero overhead, optimal performance (hardcoded operations)
- ✅ Phase 13+: Zero friction when adding new tools (just uncomment and implement)
- ✅ Data-driven: Revisit hardcoded→tool migration when real usage patterns emerge
- ✅ Future-proof: Infrastructure ready for 3+ planned external integrations

**Decision Point for Migrating Hardcoded Operations** (Phase 13+, Month 6-12):
- Need more sophisticated RAG triggering (LLM decides when knowledge lookup helps vs. relying on conversation context alone)
- Adding multiple backend integrations (CRM, calendar, ticketing systems) where LLM needs to orchestrate calls
- Want LLM to chain operations dynamically (e.g., "search knowledge base, then check if user has seen this article before, then summarize")
- User feedback indicates agent should be more autonomous in deciding when to use tools

**Current Implementation** (Phase 10 - See livekit-agent/agent.py lines 34-168, 874-896):
- ✅ Infrastructure added with `@function_tool` import
- ✅ Comprehensive documentation and pattern examples (3 placeholder tools: Zendesk, Calendar, CRM)
- ✅ `AVAILABLE_TOOLS = []` list ready for Phase 13+ integrations
- ✅ VisionAwareAgent constructor accepts tools conditionally
- ✅ Logger shows tool count: "✅ VisionAwareAgent created with 0 tools available"

**Benefits of Phase 10 Approach**:
- ✅ Zero performance impact now (empty tools list = no token overhead)
- ✅ Zero friction when Phase 13+ arrives (uncomment and implement)
- ✅ Clear documentation for future developers
- ✅ Preserves 85% cost savings from existing three-tier AI routing
- ✅ Data-driven migration: revisit hardcoded→tool conversion when real usage emerges

**Trade-offs of Future Tool Implementation** (when tools are added):
- ⚠️ Higher token costs (tool definitions in prompt context: ~250 tokens per query = 35% increase)
- ⚠️ Slower responses (LLM decision-making overhead)
- ⚠️ Less predictable behavior (LLM autonomy in tool selection)
- ⚠️ Harder debugging (tool calls depend on LLM reasoning)

**When to Revisit**: Phase 13+ (Month 6-12) when external integrations (Salesforce, Zendesk, Calendar, Payment APIs) are planned, OR when user feedback indicates need for more sophisticated tool orchestration

---

### Summary: When to Revisit Deferred Optimizations

| Optimization | Trigger | Timeline | Investment |
|-------------|---------|----------|-----------|
| **RAFT Fine-Tuning** | 50K+ queries/month OR resolution rate <50% | Month 6-12 | $1K-2.7K upfront |
| **Model Distillation** | 10K+ Claude calls/day OR Claude costs >$1K/month | Month 6-12 | $16-96 training |
| **Custom PostgreSQL Memory** | Latency >200ms OR 10K+ active users | Month 6-12 | 3-12 months dev |
| **Self-Hosted Reranker** | >10M queries/month OR Cohere >$20K/month | Month 12+ | $500-2K/month GPU |
| **Progressive Disclosure UI** | Dashboard UX redesign phase | Phase 11+ | 2-3 days |
| **✅ Function Calling Pattern** | ✅ **COMPLETED Phase 10** (infrastructure ready) | Phase 13+ for tool additions | 0 (infrastructure done) |

**Monitoring Strategy**: Track these metrics in Cost Intelligence Dashboard to automatically flag when triggers are approaching:
- Query volume (daily/monthly)
- Claude Sonnet usage percentage
- LlamaIndex memory latency (P95)
- Reranking API costs
- Resolution rate trends

This appendix ensures deferred optimizations are not forgotten and provides clear criteria for when each should be reconsidered.
