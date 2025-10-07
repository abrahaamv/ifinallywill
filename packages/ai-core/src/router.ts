/**
 * AI Provider Router
 * Intelligent routing to cost-optimize AI provider selection
 * Target: 75-85% cost reduction vs Claude-only baseline
 */

import type {
  AICompletionRequest,
  AICompletionResponse,
  AIModel,
  AIProvider,
  Message,
} from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { analyzeComplexity, shouldUseMiniModel, requiresVisionModel } from './complexity';
import { calculateSavings } from './pricing';

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
   */
  private selectProvider(messages: Message[]): RoutingDecision {
    // Check for vision requirements first
    if (requiresVisionModel(messages)) {
      return {
        provider: 'google',
        model: 'gemini-2.0-flash-exp',
        reasoning: 'Vision task detected, using Gemini Flash 2.5 (free during preview)',
        complexityScore: 0,
      };
    }

    // Analyze message complexity
    const complexity = analyzeComplexity(messages);

    // Route based on complexity score
    if (shouldUseMiniModel(complexity)) {
      // 70% of requests: Simple/routine queries
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reasoning: `Low complexity (${complexity.score.toFixed(2)}): ${complexity.reasoning}`,
        complexityScore: complexity.score,
      };
    } else {
      // 30% of requests: Complex reasoning/creativity
      return {
        provider: 'openai',
        model: 'gpt-4o',
        reasoning: `High complexity (${complexity.score.toFixed(2)}): ${complexity.reasoning}`,
        complexityScore: complexity.score,
      };
    }
  }

  /**
   * Execute AI completion with intelligent routing
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const decision = this.selectProvider(request.messages);

    if (this.config.logRouting) {
      console.log('[AIRouter] Routing decision:', {
        provider: decision.provider,
        model: decision.model,
        reasoning: decision.reasoning,
      });
    }

    try {
      // Route to selected provider
      let response: AICompletionResponse;

      if (decision.provider === 'openai') {
        response = await this.openai.complete({
          ...request,
          model: decision.model,
        });
      } else if (decision.provider === 'google') {
        response = await this.google.complete({
          ...request,
          model: decision.model,
        });
      } else {
        response = await this.anthropic.complete({
          ...request,
          model: decision.model,
        });
      }

      // Log cost savings
      if (this.config.logRouting) {
        const savings = calculateSavings(response.usage.cost);
        console.log('[AIRouter] Cost analysis:', {
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
        console.warn('[AIRouter] Primary provider failed, falling back to Anthropic:', error);

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
  async *streamComplete(request: AICompletionRequest): AsyncGenerator<string, AICompletionResponse> {
    const decision = this.selectProvider(request.messages);

    if (this.config.logRouting) {
      console.log('[AIRouter] Streaming routing decision:', {
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
      } else if (decision.provider === 'google') {
        return yield* this.google.streamComplete({
          ...request,
          model: decision.model,
        });
      } else {
        return yield* this.anthropic.streamComplete({
          ...request,
          model: decision.model,
        });
      }
    } catch (error) {
      // Fallback to Anthropic streaming if enabled
      if (this.config.enableFallback && decision.provider !== 'anthropic') {
        console.warn('[AIRouter] Primary provider failed, falling back to Anthropic:', error);

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
