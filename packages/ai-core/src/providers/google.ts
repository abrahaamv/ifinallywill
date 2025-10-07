/**
 * Google AI Provider Implementation
 * Vision-optimized provider for screen capture analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AIProviderInterface,
  AICompletionRequest,
  AICompletionResponse,
  ProviderConfig,
  AIModel
} from '../types';
import { calculateCost } from '../pricing';

export class GoogleProvider implements AIProviderInterface {
  private client: GoogleGenerativeAI;
  private defaultModel: AIModel = 'gemini-2.0-flash-exp';

  constructor(config: ProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.defaultModel;

    try {
      const genModel = this.client.getGenerativeModel({
        model: model as string,
      });

      // Convert messages to Gemini format
      const history = request.messages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const lastMessage = request.messages[request.messages.length - 1];
      if (!lastMessage) {
        throw new Error('No messages provided');
      }

      const chat = genModel.startChat({
        history,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 4096,
        },
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      const text = response.text();

      // Approximate token counts (Gemini doesn't provide exact counts during preview)
      const inputTokens = Math.ceil(
        request.messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
      );
      const outputTokens = Math.ceil(text.length / 4);

      const cost = calculateCost(model, inputTokens, outputTokens);

      return {
        content: text,
        model,
        provider: 'google',
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
        },
        finishReason: 'stop',
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google AI completion failed: ${error.message}`);
      }
      throw error;
    }
  }

  async *streamComplete(request: AICompletionRequest): AsyncGenerator<string, AICompletionResponse> {
    const model = request.model || this.defaultModel;

    const genModel = this.client.getGenerativeModel({
      model: model as string,
    });

    const history = request.messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = request.messages[request.messages.length - 1];
    if (!lastMessage) {
      throw new Error('No messages provided');
    }

    const chat = genModel.startChat({
      history,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 4096,
      },
    });

    const result = await chat.sendMessageStream(lastMessage.content);
    let fullContent = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullContent += chunkText;
      yield chunkText;
    }

    const inputTokens = Math.ceil(
      request.messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
    );
    const outputTokens = Math.ceil(fullContent.length / 4);
    const cost = calculateCost(model, inputTokens, outputTokens);

    return {
      content: fullContent,
      model,
      provider: 'google',
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
