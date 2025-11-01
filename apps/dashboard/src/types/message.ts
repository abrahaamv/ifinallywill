/**
 * Enhanced Message Types with Phase 12 Metadata
 * Comprehensive developer information for debugging and monitoring
 */

export interface RAGASMetrics {
  faithfulness: number; // 0-1
  answerRelevancy: number; // 0-1
  contextRelevancy: number; // 0-1
  contextPrecision: number; // 0-1
  contextRecall: number; // 0-1
  overall: number; // 0-1
}

export interface ComplexityMetrics {
  level: 'simple' | 'moderate' | 'complex';
  score: number; // 0-1
  factors: {
    entityCount: number;
    depth: number;
    specificity: number;
    technicalTerms: number;
    ambiguity: number;
  };
}

export interface ConfidenceMetrics {
  score: number; // 0-1
  indicators: {
    uncertainty: number;
    specificity: number;
    consistency: number;
    factuality: number;
  };
  requiresEscalation: boolean;
}

export interface RAGContext {
  chunksRetrieved: number;
  processingTimeMs: number;
  topRelevance: 'high' | 'medium' | 'low' | 'none';
  method: 'hybrid' | 'semantic' | 'bm25';
  rerankingApplied: boolean;
  chunks: Array<{
    id: string;
    content: string;
    score: number;
    source: string;
  }>;
}

export interface ModelRoutingInfo {
  selectedModel: string;
  modelTier: 'fast' | 'balanced' | 'powerful';
  provider: 'openai' | 'anthropic' | 'google';
  reasoning: string;
  fallbacksAvailable: number;
  wasEscalated: boolean;
  attemptNumber: number;
}

export interface CostBreakdown {
  total: number; // USD
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  rerankingCost?: number;
  memoryCost?: number;
  clusteringCost?: number;
}

export interface PerformanceMetrics {
  totalLatencyMs: number;
  ragLatencyMs?: number;
  modelLatencyMs: number;
  rerankingLatencyMs?: number;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
}

export interface PromptInfo {
  systemPrompt: string;
  queryType: 'factual-lookup' | 'technical-explanation' | 'code-generation' | 'troubleshooting' | 'creative' | 'conversational';
  groundingApplied: boolean;
  citationsRequired: boolean;
  uncertaintyGuidance: boolean;
}

export interface MessageMetadata {
  // Model & Routing
  model?: string; // Optional to match tRPC message metadata
  modelRouting?: ModelRoutingInfo;

  // Complexity & Confidence
  complexity?: ComplexityMetrics;
  confidence?: ConfidenceMetrics;

  // RAG & Knowledge
  rag?: RAGContext;

  // Prompt Engineering
  prompt?: PromptInfo;

  // Quality Metrics
  ragas?: RAGASMetrics;

  // Cost & Performance
  cost?: CostBreakdown;
  performance?: PerformanceMetrics;

  // Legacy fields (backward compatibility)
  tokensUsed?: number;
  costUsd?: number;
  latencyMs?: number;
  ragChunksRetrieved?: number;
  ragProcessingTimeMs?: number;
  ragTopRelevance?: 'high' | 'medium' | 'low' | 'none';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}
