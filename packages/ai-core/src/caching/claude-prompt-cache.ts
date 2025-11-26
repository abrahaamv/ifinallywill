/**
 * Claude/Anthropic Prompt Caching Implementation
 * Enhanced prompt caching with 90% cost reduction on cached tokens
 *
 * Week 1, Days 1-2: Phase 12 Implementation
 *
 * Claude's prompt caching:
 * - Caches up to 4 breakpoints in a prompt
 * - 90% discount on cache reads ($0.30 → $0.03 per 1M tokens for Sonnet)
 * - 25% surcharge on cache writes ($3.00 → $3.75 per 1M tokens)
 * - 5-minute cache lifetime
 */

import Anthropic from '@anthropic-ai/sdk';
import { calculateCost } from '../pricing';
import type {
  AICompletionRequest,
  AICompletionResponse,
  AIModel,
  AIProviderInterface,
  ProviderConfig,
} from '../types';

interface CacheConfig {
  systemPrompt?: boolean; // Cache system prompt
  knowledgeBase?: boolean; // Cache KB context
  conversationHistory?: boolean; // Cache history (for long conversations)
  customBreakpoints?: number[]; // Custom cache breakpoint indices
}

interface CachingOptions {
  enableCaching?: boolean;
  cacheConfig?: CacheConfig;
  sessionId?: string;
  tenantId?: string;
}

interface CacheStatistics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  totalCachedTokens: number;
  totalSavings: number;
}

export class ClaudeProviderWithCaching implements AIProviderInterface {
  private client: Anthropic;
  private defaultModel: AIModel = 'claude-sonnet-4.5';
  private cacheStats: Map<string, CacheStatistics> = new Map();

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async complete(
    request: AICompletionRequest & CachingOptions
  ): Promise<AICompletionResponse> {
    const model = request.model || this.defaultModel;
    const enableCaching = request.enableCaching ?? true;
    const cacheConfig = request.cacheConfig || {
      systemPrompt: true,
      knowledgeBase: true,
      conversationHistory: false,
    };

    // Separate system message from conversation
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    try {
      // Build system prompt with cache breakpoints
      let systemConfig:
        | string
        | Array<{
            type: 'text';
            text: string;
            cache_control?: { type: 'ephemeral' };
          }>
        | undefined;

      if (systemMessage && enableCaching) {
        // Split system message into cacheable sections
        // Typical structure: base instructions + KB context + examples
        const sections = this.splitSystemPrompt(systemMessage.content);

        systemConfig = sections.map((section, index) => ({
          type: 'text' as const,
          text: section,
          // Add cache_control to last section (most recent, most likely to change)
          ...(index === sections.length - 1 &&
            cacheConfig.systemPrompt && {
              cache_control: { type: 'ephemeral' as const },
            }),
        }));
      } else if (systemMessage) {
        systemConfig = systemMessage.content;
      }

      // Build conversation messages with optional caching for long histories
      const formattedMessages = conversationMessages.map((msg, index) => {
        const isLastUserMessage =
          index === conversationMessages.length - 1 && msg.role === 'user';

        // Cache the conversation history (excluding current query)
        if (
          enableCaching &&
          cacheConfig.conversationHistory &&
          conversationMessages.length > 10 && // Only cache if history is substantial
          index === conversationMessages.length - 2 && // Second to last message
          !isLastUserMessage
        ) {
          return {
            role: msg.role as 'user' | 'assistant',
            content: [
              {
                type: 'text' as const,
                text: msg.content,
                cache_control: { type: 'ephemeral' as const },
              },
            ],
          };
        }

        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      });

      const completion = await this.client.messages.create({
        model: model as string,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.3,
        system: systemConfig,
        messages: formattedMessages,
      });

      const content = completion.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('Invalid response from Claude');
      }

      // Extract cache statistics from response
      const usage = completion.usage as any;
      const cacheWriteTokens = usage.cache_creation_input_tokens || 0;
      const cacheReadTokens = usage.cache_read_input_tokens || 0;
      const regularInputTokens = completion.usage.input_tokens;
      const totalInputTokens = regularInputTokens + cacheWriteTokens + cacheReadTokens;

      // Calculate cost with cache economics
      // Cache write: 25% surcharge ($3.00 → $3.75 for Sonnet input)
      // Cache read: 90% discount ($3.00 → $0.30 for Sonnet input)
      // Regular: Standard pricing
      const baseInputCost = calculateCost(model, regularInputTokens, 0);
      const cacheWriteCost = calculateCost(model, cacheWriteTokens, 0) * 1.25;
      const cacheReadCost = calculateCost(model, cacheReadTokens, 0) * 0.1;
      const outputCost = calculateCost(model, 0, completion.usage.output_tokens);

      const totalCost = baseInputCost + cacheWriteCost + cacheReadCost + outputCost;

      // Calculate savings (compared to no caching)
      const wouldBeCost = calculateCost(
        model,
        totalInputTokens,
        completion.usage.output_tokens
      );
      const savings = wouldBeCost - totalCost;

      // Update cache statistics
      this.updateCacheStats(request.tenantId || 'default', {
        cacheReadTokens,
        cacheWriteTokens,
        savings,
      });

      return {
        content: content.text,
        model,
        provider: 'anthropic',
        usage: {
          inputTokens: regularInputTokens,
          outputTokens: completion.usage.output_tokens,
          totalTokens: totalInputTokens + completion.usage.output_tokens,
          cost: totalCost,
          cacheWriteTokens,
          cacheReadTokens,
          cacheHitRate:
            totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0,
        },
        finishReason:
          completion.stop_reason === 'end_turn'
            ? 'stop'
            : completion.stop_reason === 'max_tokens'
              ? 'length'
              : 'stop',
        metadata: {
          cacheSavings: savings,
          cacheEnabled: enableCaching,
          cacheBreakpoints: cacheConfig,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude completion with caching failed: ${error.message}`);
      }
      throw error;
    }
  }

  async *streamComplete(
    request: AICompletionRequest & CachingOptions
  ): AsyncGenerator<string, AICompletionResponse> {
    const model = request.model || this.defaultModel;
    const enableCaching = request.enableCaching ?? true;
    const cacheConfig = request.cacheConfig || {
      systemPrompt: true,
      knowledgeBase: true,
    };

    const systemMessage = request.messages.find((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    let systemConfig:
      | string
      | Array<{
          type: 'text';
          text: string;
          cache_control?: { type: 'ephemeral' };
        }>
      | undefined;

    if (systemMessage && enableCaching) {
      const sections = this.splitSystemPrompt(systemMessage.content);

      systemConfig = sections.map((section, index) => ({
        type: 'text' as const,
        text: section,
        ...(index === sections.length - 1 &&
          cacheConfig.systemPrompt && {
            cache_control: { type: 'ephemeral' as const },
          }),
      }));
    } else if (systemMessage) {
      systemConfig = systemMessage.content;
    }

    const formattedMessages = conversationMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const stream = await this.client.messages.stream({
      model: model as string,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.3,
      system: systemConfig,
      messages: formattedMessages,
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheWriteTokens = 0;
    let cacheReadTokens = 0;

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullContent += chunk.delta.text;
        yield chunk.delta.text;
      } else if (chunk.type === 'message_start') {
        const usage = chunk.message.usage as any;
        inputTokens = chunk.message.usage.input_tokens;
        cacheWriteTokens = usage.cache_creation_input_tokens || 0;
        cacheReadTokens = usage.cache_read_input_tokens || 0;
      } else if (chunk.type === 'message_delta') {
        outputTokens = chunk.usage.output_tokens;
      }
    }

    const totalInputTokens = inputTokens + cacheWriteTokens + cacheReadTokens;
    const baseInputCost = calculateCost(model, inputTokens, 0);
    const cacheWriteCost = calculateCost(model, cacheWriteTokens, 0) * 1.25;
    const cacheReadCost = calculateCost(model, cacheReadTokens, 0) * 0.1;
    const outputCost = calculateCost(model, 0, outputTokens);
    const totalCost = baseInputCost + cacheWriteCost + cacheReadCost + outputCost;

    const wouldBeCost = calculateCost(model, totalInputTokens, outputTokens);
    const savings = wouldBeCost - totalCost;

    this.updateCacheStats(request.tenantId || 'default', {
      cacheReadTokens,
      cacheWriteTokens,
      savings,
    });

    return {
      content: fullContent,
      model,
      provider: 'anthropic',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: totalInputTokens + outputTokens,
        cost: totalCost,
        cacheWriteTokens,
        cacheReadTokens,
        cacheHitRate: totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0,
      },
      finishReason: 'stop',
      metadata: {
        cacheSavings: savings,
        cacheEnabled: enableCaching,
      },
    };
  }

  /**
   * Split system prompt into cacheable sections
   * Claude supports up to 4 cache breakpoints
   */
  private splitSystemPrompt(systemPrompt: string): string[] {
    // Look for natural breakpoints in the prompt
    const sections: string[] = [];

    // Common patterns: role definition, instructions, examples, context
    const breakpoints = [
      '# Instructions',
      '# Context',
      '# Examples',
      '# Knowledge Base',
      'CONTEXT:',
      'EXAMPLES:',
    ];

    let currentSection = systemPrompt;
    for (const breakpoint of breakpoints) {
      const index = currentSection.indexOf(breakpoint);
      if (index !== -1) {
        if (index > 0) {
          sections.push(currentSection.substring(0, index).trim());
        }
        currentSection = currentSection.substring(index);
      }
    }

    // Add remaining content
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }

    // If no breakpoints found, return as single section
    return sections.length > 0 ? sections : [systemPrompt];
  }

  /**
   * Update cache statistics for monitoring
   */
  private updateCacheStats(
    tenantId: string,
    data: {
      cacheReadTokens: number;
      cacheWriteTokens: number;
      savings: number;
    }
  ): void {
    const stats = this.cacheStats.get(tenantId) || {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      totalCachedTokens: 0,
      totalSavings: 0,
    };

    stats.totalRequests++;
    if (data.cacheReadTokens > 0) {
      stats.cacheHits++;
    } else {
      stats.cacheMisses++;
    }
    stats.cacheHitRate = stats.cacheHits / stats.totalRequests;
    stats.totalCachedTokens += data.cacheReadTokens;
    stats.totalSavings += data.savings;

    this.cacheStats.set(tenantId, stats);
  }

  /**
   * Get cache statistics for a tenant
   */
  public getCacheStats(tenantId?: string): CacheStatistics | Map<string, CacheStatistics> {
    if (tenantId) {
      return (
        this.cacheStats.get(tenantId) || {
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          cacheHitRate: 0,
          totalCachedTokens: 0,
          totalSavings: 0,
        }
      );
    }
    return this.cacheStats;
  }

  /**
   * Clear cache statistics
   */
  public clearStats(tenantId?: string): void {
    if (tenantId) {
      this.cacheStats.delete(tenantId);
    } else {
      this.cacheStats.clear();
    }
  }
}
