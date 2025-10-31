/**
 * Anthropic Provider Implementation
 * Fallback provider for complex reasoning tasks
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

export class AnthropicProvider implements AIProviderInterface {
  private client: Anthropic;
  private defaultModel: AIModel = 'claude-3-5-sonnet-20241022';

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.defaultModel;
    const enableCaching = request.enableCaching ?? false;

    // Separate system message from conversation
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    try {
      // Phase 10: Prompt caching with cache_control blocks
      // System message caching (most common use case - RAG context, instructions)
      let systemConfig: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> | undefined;

      if (systemMessage) {
        if (enableCaching && systemMessage.cache) {
          // Use cache_control for system message
          systemConfig = [
            {
              type: 'text',
              text: systemMessage.content,
              cache_control: { type: 'ephemeral' },
            },
          ];
        } else {
          systemConfig = systemMessage.content;
        }
      }

      const completion = await this.client.messages.create({
        model: model as string,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: systemConfig,
        messages: conversationMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      });

      const content = completion.content[0];
      if (!content) {
        throw new Error('No content returned from Anthropic');
      }
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }

      // Phase 10: Track cache statistics
      const cacheWriteTokens = (completion.usage as any).cache_creation_input_tokens || 0;
      const cacheReadTokens = (completion.usage as any).cache_read_input_tokens || 0;
      const totalInputTokens = completion.usage.input_tokens + cacheWriteTokens;

      // Calculate cache hit rate: cached tokens / total input tokens
      const cacheHitRate =
        totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0;

      const cost = calculateCost(
        model,
        completion.usage.input_tokens,
        completion.usage.output_tokens
      );

      return {
        content: content.text,
        model,
        provider: 'anthropic',
        usage: {
          inputTokens: completion.usage.input_tokens,
          outputTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
          cost,
          cacheWriteTokens,
          cacheReadTokens,
          cacheHitRate,
        },
        finishReason:
          completion.stop_reason === 'end_turn'
            ? 'stop'
            : completion.stop_reason === 'max_tokens'
              ? 'length'
              : 'stop',
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic completion failed: ${error.message}`);
      }
      throw error;
    }
  }

  async *streamComplete(
    request: AICompletionRequest
  ): AsyncGenerator<string, AICompletionResponse> {
    const model = request.model || this.defaultModel;
    const enableCaching = request.enableCaching ?? false;

    const systemMessage = request.messages.find((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    // Phase 10: Prompt caching with cache_control blocks
    // Note: Cache statistics are not available in streaming responses
    let systemConfig: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> | undefined;

    if (systemMessage) {
      if (enableCaching && systemMessage.cache) {
        // Use cache_control for system message
        systemConfig = [
          {
            type: 'text',
            text: systemMessage.content,
            cache_control: { type: 'ephemeral' },
          },
        ];
      } else {
        systemConfig = systemMessage.content;
      }
    }

    const stream = await this.client.messages.stream({
      model: model as string,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      system: systemConfig,
      messages: conversationMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullContent += chunk.delta.text;
        yield chunk.delta.text;
      } else if (chunk.type === 'message_start') {
        inputTokens = chunk.message.usage.input_tokens;
      } else if (chunk.type === 'message_delta') {
        outputTokens = chunk.usage.output_tokens;
      }
    }

    const cost = calculateCost(model, inputTokens, outputTokens);

    return {
      content: fullContent,
      model,
      provider: 'anthropic',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost,
      },
      finishReason: 'stop',
    };
  }
}
