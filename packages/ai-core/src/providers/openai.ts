/**
 * OpenAI Provider Implementation
 * Primary provider for cost-optimized AI routing
 */

import OpenAI from 'openai';
import { calculateCost } from '../pricing';
import type {
  AICompletionRequest,
  AICompletionResponse,
  AIModel,
  AIProviderInterface,
  ProviderConfig,
} from '../types';

export class OpenAIProvider implements AIProviderInterface {
  private client: OpenAI;
  private defaultModel: AIModel = 'gpt-4o-mini';

  constructor(config: ProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
    });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.defaultModel;

    try {
      const completion = await this.client.chat.completions.create({
        model: model as string,
        messages: request.messages.map((msg) => ({
          role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('No completion choices returned');
      }

      const usage = completion.usage;
      if (!usage) {
        throw new Error('No usage data returned');
      }

      const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

      return {
        content: choice.message.content || '',
        model,
        provider: 'openai',
        usage: {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost,
        },
        finishReason:
          (choice.finish_reason as 'stop' | 'length' | 'content_filter' | null) || 'stop',
      };
    } catch (error) {
      console.error('[OpenAI Provider] Completion failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        model,
      });

      if (error instanceof Error) {
        throw new Error(`OpenAI completion failed: ${error.message}`);
      }
      throw error;
    }
  }

  async *streamComplete(
    request: AICompletionRequest
  ): AsyncGenerator<string, AICompletionResponse> {
    const model = request.model || this.defaultModel;

    const stream = await this.client.chat.completions.create({
      model: model as string,
      messages: request.messages.map((msg) => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      stream: true,
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        outputTokens += 1; // Approximate
        yield delta;
      }
    }

    // Approximate input tokens (1 token ~= 4 chars)
    inputTokens = Math.ceil(request.messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4);

    const cost = calculateCost(model, inputTokens, outputTokens);

    return {
      content: fullContent,
      model,
      provider: 'openai',
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
