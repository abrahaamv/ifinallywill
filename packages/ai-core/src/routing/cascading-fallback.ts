/**
 * Phase 12 Week 2: Cascading Fallback Logic
 * Intelligent model selection with automatic fallback on failures
 */

import { createModuleLogger } from '@platform/shared';
import type { ComplexityScore } from './complexity-analyzer';

const logger = createModuleLogger('CascadingFallback');

export type ModelTier = 'fast' | 'balanced' | 'powerful';

export interface ModelConfig {
  tier: ModelTier;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  maxTokens: number;
  costPer1MTokens: number; // USD
  latencyMs: number; // Average response time
  capabilities: string[];
}

export interface FallbackStrategy {
  primary: ModelConfig;
  fallbacks: ModelConfig[];
  maxRetries: number;
  timeout: number; // milliseconds
}

export interface RoutingDecision {
  selectedModel: ModelConfig;
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  fallbacksAvailable: number;
}

/**
 * Model tier configurations based on Phase 12 cost optimization
 */
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Fast tier: GPT-4o-mini (70% of queries)
  'gpt-4o-mini': {
    tier: 'fast',
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 16384,
    costPer1MTokens: 0.15,
    latencyMs: 800,
    capabilities: ['basic-reasoning', 'simple-queries', 'factual-lookup'],
  },

  // Balanced tier: GPT-4o (25% of queries)
  'gpt-4o': {
    tier: 'balanced',
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 128000,
    costPer1MTokens: 5.0,
    latencyMs: 1500,
    capabilities: ['advanced-reasoning', 'multi-step', 'technical-analysis'],
  },

  // Balanced tier: Claude Haiku (alternative)
  'claude-haiku': {
    tier: 'balanced',
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 200000,
    costPer1MTokens: 1.0,
    latencyMs: 1200,
    capabilities: ['advanced-reasoning', 'code-generation', 'analysis'],
  },

  // Powerful tier: Claude Sonnet (5% of queries)
  'claude-sonnet': {
    tier: 'powerful',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 200000,
    costPer1MTokens: 3.0,
    latencyMs: 2000,
    capabilities: ['complex-reasoning', 'deep-analysis', 'creative-tasks', 'code-generation'],
  },

  // Powerful tier: Claude Opus (rare, high-complexity)
  'claude-opus': {
    tier: 'powerful',
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    maxTokens: 200000,
    costPer1MTokens: 15.0,
    latencyMs: 3000,
    capabilities: ['expert-reasoning', 'research', 'comprehensive-analysis'],
  },

  // Fast tier: Gemini Flash (experimental)
  'gemini-flash': {
    tier: 'fast',
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    maxTokens: 1000000,
    costPer1MTokens: 0.0,
    latencyMs: 600,
    capabilities: ['basic-reasoning', 'multimodal', 'fast-response'],
  },
};

/**
 * Cascading Fallback Manager
 *
 * Routes queries to optimal models with automatic fallback:
 * 1. Analyze complexity
 * 2. Select primary model
 * 3. Configure fallback chain
 * 4. Handle failures gracefully
 */
export class CascadingFallbackManager {
  constructor() {
    // No initialization needed
  }

  /**
   * Route query to optimal model based on complexity
   */
  route(complexityScore: ComplexityScore, requiresCodeGen = false): RoutingDecision {
    let selectedModel: ModelConfig;
    let reasoning: string;

    const { level, score } = complexityScore;

    // Simple queries: GPT-4o-mini (70%)
    if (level === 'simple' && !requiresCodeGen) {
      selectedModel = MODEL_CONFIGS['gpt-4o-mini']!;
      reasoning = 'Simple query routed to fast, cost-effective model';
    }
    // Moderate queries: GPT-4o or Claude Haiku (25%)
    else if (level === 'moderate') {
      if (requiresCodeGen) {
        selectedModel = MODEL_CONFIGS['claude-haiku']!;
        reasoning = 'Moderate complexity with code generation → Claude Haiku';
      } else {
        selectedModel = MODEL_CONFIGS['gpt-4o']!;
        reasoning = 'Moderate complexity → GPT-4o for balanced performance';
      }
    }
    // Complex queries: Claude Sonnet/Opus (5%)
    else {
      if (score > 0.8) {
        selectedModel = MODEL_CONFIGS['claude-opus']!;
        reasoning = 'Very high complexity (>0.8) → Claude Opus for expert reasoning';
      } else {
        selectedModel = MODEL_CONFIGS['claude-sonnet']!;
        reasoning = 'High complexity → Claude Sonnet for deep analysis';
      }
    }

    // Build fallback chain
    const fallbacks = this.buildFallbackChain(selectedModel);

    // Estimate costs (assuming 1000 tokens avg)
    const estimatedTokens = 1000;
    const estimatedCost = (selectedModel.costPer1MTokens / 1000000) * estimatedTokens;

    logger.info('Model routing decision', {
      complexity: level,
      score: score.toFixed(3),
      selectedModel: selectedModel.model,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      fallbackCount: fallbacks.length,
    });

    return {
      selectedModel,
      reasoning,
      estimatedCost,
      estimatedLatency: selectedModel.latencyMs,
      fallbacksAvailable: fallbacks.length,
    };
  }

  /**
   * Get fallback strategy for a model
   */
  getStrategy(model: ModelConfig): FallbackStrategy {
    const fallbacks = this.buildFallbackChain(model);

    return {
      primary: model,
      fallbacks,
      maxRetries: 3,
      timeout: 30000,
    };
  }

  /**
   * Build intelligent fallback chain
   *
   * Strategy:
   * - If primary fails, try same tier alternative provider
   * - Then escalate to higher tier
   * - Always have at least 2 fallbacks
   */
  private buildFallbackChain(primary: ModelConfig): ModelConfig[] {
    const chain: ModelConfig[] = [];

    // Same tier, different provider
    const sameTierAlternative = Object.values(MODEL_CONFIGS).find(
      (m) => m.tier === primary.tier && m.provider !== primary.provider
    );
    if (sameTierAlternative) {
      chain.push(sameTierAlternative);
    }

    // Escalate to higher tier
    if (primary.tier === 'fast') {
      chain.push(MODEL_CONFIGS['gpt-4o']!);
      chain.push(MODEL_CONFIGS['claude-sonnet']!);
    } else if (primary.tier === 'balanced') {
      chain.push(MODEL_CONFIGS['claude-sonnet']!);
      chain.push(MODEL_CONFIGS['claude-opus']!);
    } else {
      // Already powerful, use alternatives
      const powerfulAlternative = Object.values(MODEL_CONFIGS).find(
        (m) => m.tier === 'powerful' && m.model !== primary.model
      );
      if (powerfulAlternative) {
        chain.push(powerfulAlternative);
      }
    }

    return chain;
  }

  /**
   * Handle model failure and select fallback
   */
  handleFailure(
    failedModel: ModelConfig,
    error: Error,
    attemptNumber: number
  ): ModelConfig | null {
    logger.warn('Model execution failed, attempting fallback', {
      model: failedModel.model,
      error: error.message,
      attempt: attemptNumber,
    });

    const strategy = this.getStrategy(failedModel);

    if (attemptNumber >= strategy.maxRetries) {
      logger.error('Max retries exceeded, no fallback available');
      return null;
    }

    const fallbackIndex = attemptNumber - 1;
    const fallback = strategy.fallbacks[fallbackIndex];

    if (!fallback) {
      logger.error('No fallback model available for attempt', { attemptNumber });
      return null;
    }

    logger.info('Fallback model selected', {
      from: failedModel.model,
      to: fallback.model,
      attempt: attemptNumber,
    });

    return fallback;
  }

  /**
   * Estimate cost savings from intelligent routing
   *
   * Baseline: All queries use Claude Opus
   * Optimized: 70% mini, 25% balanced, 5% powerful
   */
  estimateCostSavings(monthlyQueries: number): {
    baseline: number;
    optimized: number;
    savings: number;
    savingsPercent: number;
  } {
    const avgTokensPerQuery = 1000;

    // Baseline: All queries use Claude Opus ($15/1M tokens)
    const baselineCost =
      (monthlyQueries * avgTokensPerQuery * MODEL_CONFIGS['claude-opus']!.costPer1MTokens) /
      1000000;

    // Optimized routing
    const simpleQueries = monthlyQueries * 0.7; // 70%
    const moderateQueries = monthlyQueries * 0.25; // 25%
    const complexQueries = monthlyQueries * 0.05; // 5%

    const simpleCost =
      (simpleQueries * avgTokensPerQuery * MODEL_CONFIGS['gpt-4o-mini']!.costPer1MTokens) / 1000000;
    const moderateCost =
      (moderateQueries * avgTokensPerQuery * MODEL_CONFIGS['gpt-4o']!.costPer1MTokens) / 1000000;
    const complexCost =
      (complexQueries * avgTokensPerQuery * MODEL_CONFIGS['claude-sonnet']!.costPer1MTokens) /
      1000000;

    const optimizedCost = simpleCost + moderateCost + complexCost;

    const savings = baselineCost - optimizedCost;
    const savingsPercent = (savings / baselineCost) * 100;

    return {
      baseline: baselineCost,
      optimized: optimizedCost,
      savings,
      savingsPercent,
    };
  }
}

/**
 * Create a cascading fallback manager instance
 */
export function createFallbackManager(): CascadingFallbackManager {
  return new CascadingFallbackManager();
}
