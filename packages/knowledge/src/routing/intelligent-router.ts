/**
 * Intelligent Query Router (Phase 12 Week 7-8)
 *
 * Routes queries to optimal AI models based on:
 * - Complexity analysis
 * - Intent classification
 * - Performance requirements
 * - Cost constraints
 *
 * Cascading fallback strategy:
 * 1. Fast model (Gemini Flash-Lite 8B) - Simple queries
 * 2. Balanced model (GPT-4o-mini) - Moderate complexity
 * 3. Capable model (Claude Sonnet 4.5) - High complexity
 * 4. Premium model (GPT-4o) - Fallback if all fail
 */

import type { AIProviderInterface, AICompletionRequest, AICompletionResponse } from '@platform/ai-core';
import { ComplexityScorer, type ComplexityScore, type ComplexityAnalysisInput } from './complexity-scorer';
import { IntentClassifier, type IntentClassificationResult } from './intent-classifier';

// ==================== TYPES ====================

export interface RouteDecision {
  selectedModel: string;
  reasoning: string[];
  complexity: ComplexityScore;
  intent: IntentClassificationResult;
  estimatedCost: number; // USD
  estimatedLatency: number; // milliseconds
  fallbackChain: string[]; // Models to try in order
}

export interface RoutingConfig {
  // Model definitions
  models: {
    fast: string; // e.g., 'gemini-flash-lite-8b'
    balanced: string; // e.g., 'gpt-4o-mini'
    capable: string; // e.g., 'claude-sonnet-4.5'
    premium: string; // e.g., 'gpt-4o'
  };

  // Cost constraints (USD per 1M tokens)
  maxCostPerQuery: number;

  // Performance requirements
  maxLatencyMs: number;

  // Fallback behavior
  enableFallbacks: boolean;
  maxFallbackAttempts: number;

  // Intent-based routing overrides
  intentRouting: {
    [key: string]: {
      preferredModel?: 'fast' | 'balanced' | 'capable' | 'premium';
      requiresKnowledge?: boolean;
      maxLatencyMs?: number;
    };
  };
}

const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  models: {
    fast: 'gemini-flash-lite-8b',
    balanced: 'gpt-4o-mini',
    capable: 'claude-sonnet-4.5',
    premium: 'gpt-4o',
  },
  maxCostPerQuery: 0.01, // $0.01 per query
  maxLatencyMs: 5000, // 5 seconds
  enableFallbacks: true,
  maxFallbackAttempts: 3,
  intentRouting: {
    factual_query: {
      preferredModel: 'fast',
      requiresKnowledge: true,
      maxLatencyMs: 2000,
    },
    technical_support: {
      preferredModel: 'balanced',
      requiresKnowledge: true,
      maxLatencyMs: 4000,
    },
    analytical: {
      preferredModel: 'capable',
      requiresKnowledge: false,
      maxLatencyMs: 6000,
    },
    creative: {
      preferredModel: 'capable',
      requiresKnowledge: false,
      maxLatencyMs: 6000,
    },
    troubleshooting: {
      preferredModel: 'capable',
      requiresKnowledge: true,
      maxLatencyMs: 8000,
    },
  },
};

// Model pricing (USD per 1M tokens, input/output average)
const MODEL_PRICING: Record<string, number> = {
  'gemini-flash-lite-8b': 0.05,
  'gpt-4o-mini': 0.15,
  'claude-sonnet-4.5': 3.0,
  'gpt-4o': 5.0,
};

// Model latency estimates (milliseconds per 1K tokens)
const MODEL_LATENCY: Record<string, number> = {
  'gemini-flash-lite-8b': 200,
  'gpt-4o-mini': 300,
  'claude-sonnet-4.5': 800,
  'gpt-4o': 600,
};

// ==================== INTELLIGENT ROUTER ====================

export class IntelligentRouter {
  private complexityScorer: ComplexityScorer;
  private intentClassifier: IntentClassifier;

  constructor(
    private aiProvider: AIProviderInterface,
    private config: RoutingConfig = DEFAULT_ROUTING_CONFIG
  ) {
    this.complexityScorer = new ComplexityScorer(aiProvider);
    this.intentClassifier = new IntentClassifier(aiProvider);
  }

  /**
   * Analyze query and determine optimal routing
   */
  async analyzeRoute(input: ComplexityAnalysisInput): Promise<RouteDecision> {
    const reasoning: string[] = [];

    // 1. Analyze complexity
    const complexity = await this.complexityScorer.analyze(input);
    reasoning.push(`Complexity analysis: ${complexity.overallScore.toFixed(2)} (${complexity.recommendedModel})`);

    // 2. Classify intent
    const intent = await this.intentClassifier.classify({
      query: input.query,
      conversationHistory: input.conversationHistory,
    });
    reasoning.push(`Intent: ${intent.primaryIntent} (confidence: ${(intent.confidence * 100).toFixed(1)}%)`);

    // 3. Determine model based on complexity and intent
    let selectedModel = this.selectModel(complexity, intent, reasoning);

    // 4. Build fallback chain
    const fallbackChain = this.buildFallbackChain(selectedModel);

    // 5. Estimate cost and latency
    const estimatedTokens = this.estimateTokens(input.query);
    const estimatedCost = (MODEL_PRICING[selectedModel] || 0.1) * estimatedTokens / 1_000_000;
    const estimatedLatency = (MODEL_LATENCY[selectedModel] || 500) * estimatedTokens / 1_000;

    reasoning.push(`Selected: ${selectedModel} (cost: $${estimatedCost.toFixed(4)}, latency: ${estimatedLatency.toFixed(0)}ms)`);

    // 6. Check constraints
    if (estimatedCost > this.config.maxCostPerQuery) {
      reasoning.push(`⚠️ Warning: Estimated cost exceeds limit ($${this.config.maxCostPerQuery})`);
    }
    if (estimatedLatency > this.config.maxLatencyMs) {
      reasoning.push(`⚠️ Warning: Estimated latency exceeds limit (${this.config.maxLatencyMs}ms)`);
    }

    return {
      selectedModel,
      reasoning,
      complexity,
      intent,
      estimatedCost,
      estimatedLatency,
      fallbackChain,
    };
  }

  /**
   * Execute query with intelligent routing and fallbacks
   */
  async execute(
    request: AICompletionRequest,
    routeDecision?: RouteDecision
  ): Promise<AICompletionResponse & { usedModel: string; fallbackAttempts: number }> {
    // Analyze route if not provided
    if (!routeDecision) {
      const lastMessage = request.messages.length > 0 ? request.messages[request.messages.length - 1] : undefined;
      const query = lastMessage && typeof lastMessage.content === 'string' ? lastMessage.content : '';

      routeDecision = await this.analyzeRoute({
        query,
        conversationHistory: request.messages.slice(0, -1).map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : '',
        })),
      });
    }

    // Try selected model and fallbacks
    const modelsToTry = [routeDecision.selectedModel, ...routeDecision.fallbackChain];
    let lastError: Error | undefined;
    let fallbackAttempts = 0;

    for (const model of modelsToTry) {
      if (fallbackAttempts >= this.config.maxFallbackAttempts) {
        break;
      }

      try {
        const response = await this.aiProvider.complete({
          ...request,
          model: model as any,
        });

        return {
          ...response,
          usedModel: model,
          fallbackAttempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        fallbackAttempts++;
        console.warn(`Model ${model} failed (attempt ${fallbackAttempts}):`, lastError.message);

        // Don't try fallbacks if explicitly disabled
        if (!this.config.enableFallbacks) {
          break;
        }
      }
    }

    // All models failed
    throw new Error(
      `All routing attempts failed after ${fallbackAttempts} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Select model based on complexity and intent
   */
  private selectModel(
    complexity: ComplexityScore,
    intent: IntentClassificationResult,
    reasoning: string[]
  ): string {
    // Check for intent-based routing overrides
    const intentConfig = this.config.intentRouting[intent.primaryIntent];
    if (intentConfig?.preferredModel) {
      reasoning.push(`Intent override: using ${intentConfig.preferredModel} model for ${intent.primaryIntent}`);
      return this.config.models[intentConfig.preferredModel];
    }

    // Use complexity-based recommendation
    switch (complexity.recommendedModel) {
      case 'fast':
        return this.config.models.fast;
      case 'balanced':
        return this.config.models.balanced;
      case 'capable':
        return this.config.models.capable;
      default:
        return this.config.models.balanced;
    }
  }

  /**
   * Build fallback chain (models to try if selected model fails)
   */
  private buildFallbackChain(selectedModel: string): string[] {
    const allModels = [
      this.config.models.fast,
      this.config.models.balanced,
      this.config.models.capable,
      this.config.models.premium,
    ];

    // Remove selected model and return rest
    return allModels.filter(m => m !== selectedModel);
  }

  /**
   * Estimate token count for cost/latency calculation
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4) + 500; // +500 for response
  }

  /**
   * Get routing statistics for monitoring
   */
  getRoutingStats(): {
    config: RoutingConfig;
    modelPricing: typeof MODEL_PRICING;
    modelLatency: typeof MODEL_LATENCY;
  } {
    return {
      config: this.config,
      modelPricing: MODEL_PRICING,
      modelLatency: MODEL_LATENCY,
    };
  }
}
