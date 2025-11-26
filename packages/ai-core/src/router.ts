/**
 * AI Provider Router
 * Intelligent routing to cost-optimize AI provider selection
 * Target: 75-85% cost reduction vs Claude-only baseline
 *
 * Feature Flag: ZERO_DAY environment variable
 * - ZERO_DAY=true:  OpenAI-only strategy (stable, 69% cost reduction)
 * - ZERO_DAY=false: Phase 12 Gemini strategy (77% cost reduction)
 */

import { createModuleLogger } from '@platform/shared';
import { requiresVisionModel } from './complexity';
import { calculateSavings } from './pricing';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { OpenAIProvider } from './providers/openai';
import { createComplexityAnalyzer } from './routing/complexity-analyzer';
import {
  classifyQueryComplexity,
  determineTierFromComplexity,
  getModelConfigForQuery,
} from './routing/dynamic-config';
import type {
  AICompletionRequest,
  AICompletionResponse,
  AIModel,
  AIProvider,
  Message,
} from './types';

const logger = createModuleLogger('ai-router');

/**
 * Feature Flag: ZERO_DAY routing strategy
 * - true:  Emergency fallback to proven OpenAI (stable but higher cost)
 * - false: Phase 12 documented Gemini strategy (lower cost)
 */
const ZERO_DAY_MODE =
  process.env.ZERO_DAY === 'true' || process.env.ZERO_DAY === '1';

// Log active strategy on module load
if (ZERO_DAY_MODE) {
  logger.warn('🚨 ZERO_DAY MODE ACTIVE: Using OpenAI-only routing (stable fallback)');
} else {
  logger.info('✅ Phase 12 Strategy: Using Gemini + OpenAI + Claude routing');
}

export interface RouterConfig {
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  enableFallback?: boolean;
  logRouting?: boolean;
}

export interface RoutingDecision {
  provider: AIProvider;
  model: AIModel;
  reasoning: string;
  complexityScore: number;
}

export class AIRouter {
  private openai: OpenAIProvider;
  private anthropic: AnthropicProvider;
  private google: GoogleProvider;
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
    this.openai = new OpenAIProvider({ apiKey: config.openaiApiKey });
    this.anthropic = new AnthropicProvider({ apiKey: config.anthropicApiKey });
    this.google = new GoogleProvider({ apiKey: config.googleApiKey });
  }

  /**
   * Determine optimal provider and model for request
   * Supports two strategies via ZERO_DAY feature flag
   */
  private selectProvider(messages: Message[]): RoutingDecision {
    // Check for vision requirements first (same for both strategies)
    if (requiresVisionModel(messages)) {
      return {
        provider: 'google',
        model: 'gemini-2.0-flash-exp',
        reasoning: 'Vision task detected, using Gemini Flash 2.5 (free during preview)',
        complexityScore: 0,
      };
    }

    // Extract user query for complexity analysis
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage?.content || '';

    // Use Phase 12 complexity analyzer
    const complexityAnalyzer = createComplexityAnalyzer();
    const complexity = complexityAnalyzer.analyze(query, {
      conversationHistory: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Route based on ZERO_DAY feature flag
    if (ZERO_DAY_MODE) {
      return this.selectStableProvider(complexity);
    } else {
      return this.selectDefaultProvider(complexity);
    }
  }

  /**
   * Stable Provider Strategy: OpenAI-focused routing (stable, proven)
   * Used when ZERO_DAY=true for emergency fallback
   * Cost reduction: 69% vs all-Claude baseline
   */
  private selectStableProvider(complexity: {
    score: number;
    level: string;
  }): RoutingDecision {
    if (complexity.score < 0.4) {
      // 70% of requests: Simple queries
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reasoning: `[STABLE] gpt-4o-mini (complexity: ${complexity.level}, score: ${complexity.score.toFixed(2)})`,
        complexityScore: complexity.score,
      };
    }

    if (complexity.score < 0.7) {
      // 25% of requests: Moderate complexity
      return {
        provider: 'openai',
        model: 'gpt-4o',
        reasoning: `[STABLE] gpt-4o (complexity: ${complexity.level}, score: ${complexity.score.toFixed(2)})`,
        complexityScore: complexity.score,
      };
    }

    // 5% of requests: Complex reasoning
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      reasoning: `[STABLE] claude-3-5-sonnet (complexity: ${complexity.level}, score: ${complexity.score.toFixed(2)})`,
      complexityScore: complexity.score,
    };
  }

  /**
   * Default Provider Strategy: Gemini + OpenAI + Claude routing (cost-optimized)
   * Used when ZERO_DAY=false or not set (follows Phase 12 documentation)
   * Cost reduction: 77% vs all-Claude baseline
   */
  private selectDefaultProvider(complexity: {
    score: number;
    level: string;
  }): RoutingDecision {
    if (complexity.score < 0.4) {
      // 70% of requests: Simple queries
      // Gemini Flash (free during preview, then $0.40/1M)
      return {
        provider: 'google',
        model: 'gemini-1.5-flash',
        reasoning: `[DEFAULT] gemini-1.5-flash (complexity: ${complexity.level}, score: ${complexity.score.toFixed(2)})`,
        complexityScore: complexity.score,
      };
    }

    if (complexity.score < 0.7) {
      // 25% of requests: Moderate complexity
      // GPT-4o-mini ($0.49/1M blended)
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reasoning: `[DEFAULT] gpt-4o-mini (complexity: ${complexity.level}, score: ${complexity.score.toFixed(2)})`,
        complexityScore: complexity.score,
      };
    }

    // 5% of requests: Complex reasoning
    // Claude Sonnet 4.5 ($11.55/1M blended)
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      reasoning: `[DEFAULT] claude-3-5-sonnet (complexity: ${complexity.level}, score: ${complexity.score.toFixed(2)})`,
      complexityScore: complexity.score,
    };
  }

  /**
   * Execute AI completion with intelligent routing
   * Phase 12 Week 3: Enhanced with dynamic configuration
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const decision = this.selectProvider(request.messages);

    // Phase 12 Week 3: Dynamic configuration
    const tier = determineTierFromComplexity(decision.complexityScore);
    const lastMessage = request.messages[request.messages.length - 1];
    const queryComplexity = classifyQueryComplexity(lastMessage?.content || '');
    const modelConfig = getModelConfigForQuery(tier, queryComplexity);

    if (this.config.logRouting) {
      logger.info('Routing decision', {
        provider: decision.provider,
        model: decision.model,
        reasoning: decision.reasoning,
        tier,
        queryComplexity,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
    }

    try {
      // Route to selected provider
      let response: AICompletionResponse;

      if (decision.provider === 'openai') {
        response = await this.openai.complete({
          ...request,
          model: decision.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          topP: modelConfig.topP,
        });
      } else if (decision.provider === 'google') {
        response = await this.google.complete({
          ...request,
          model: decision.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          topP: modelConfig.topP,
          topK: modelConfig.topK,
        });
      } else {
        response = await this.anthropic.complete({
          ...request,
          model: decision.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          topP: modelConfig.topP,
        });
      }

      // Log cost savings
      if (this.config.logRouting) {
        const savings = calculateSavings(response.usage.cost);
        logger.info('Cost analysis', {
          actualCost: response.usage.cost.toFixed(6),
          baselineCost: savings.baselineCost.toFixed(6),
          savings: savings.savings.toFixed(6),
          savingsPercent: `${savings.savingsPercent.toFixed(1)}%`,
        });
      }

      return response;
    } catch (error) {
      // Fallback to Anthropic if enabled and primary provider fails
      if (this.config.enableFallback && decision.provider !== 'anthropic') {
        logger.warn('Primary provider failed, falling back to Anthropic', { error });

        return await this.anthropic.complete({
          ...request,
          model: 'claude-3-5-sonnet-20241022',
        });
      }

      throw error;
    }
  }

  /**
   * Execute streaming completion with intelligent routing
   */
  async *streamComplete(
    request: AICompletionRequest
  ): AsyncGenerator<string, AICompletionResponse> {
    const decision = this.selectProvider(request.messages);

    if (this.config.logRouting) {
      logger.info('Streaming routing decision', {
        provider: decision.provider,
        model: decision.model,
        reasoning: decision.reasoning,
      });
    }

    try {
      if (decision.provider === 'openai') {
        return yield* this.openai.streamComplete({
          ...request,
          model: decision.model,
        });
      }
      if (decision.provider === 'google') {
        return yield* this.google.streamComplete({
          ...request,
          model: decision.model,
        });
      }
      return yield* this.anthropic.streamComplete({
        ...request,
        model: decision.model,
      });
    } catch (error) {
      // Fallback to Anthropic streaming if enabled
      if (this.config.enableFallback && decision.provider !== 'anthropic') {
        logger.warn('Primary provider failed, falling back to Anthropic', { error });

        return yield* this.anthropic.streamComplete({
          ...request,
          model: 'claude-3-5-sonnet-20241022',
        });
      }

      throw error;
    }
  }

  /**
   * Get routing decision without executing completion
   */
  getRoutingDecision(messages: Message[]): RoutingDecision {
    return this.selectProvider(messages);
  }
}
