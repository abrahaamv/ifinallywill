/**
 * OpenAI Provider Tests
 * Validates GPT-4o integration and cost optimization routing
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from '../providers/openai';
import type { AICompletionRequest } from '../types';

// Mock OpenAI SDK with class syntax for proper constructor mocking
vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };
      constructor(_config: unknown) {}
    },
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const OpenAI = await import('openai');
    provider = new OpenAIProvider({ apiKey: 'test-api-key' });
    mockCreate = (provider as any).client.chat.completions.create;
    vi.clearAllMocks();
  });

  describe('complete', () => {
    it('should successfully complete a basic request', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Hello! How can I assist you today?' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);

      expect(response.content).toBe('Hello! How can I assist you today?');
      expect(response.provider).toBe('openai');
      expect(response.model).toBe('gpt-4o-mini');
      expect(response.usage).toEqual({
        inputTokens: 10,
        outputTokens: 8,
        totalTokens: 18,
        cost: expect.any(Number),
      });
      expect(response.finishReason).toBe('stop');
    });

    it('should handle system messages correctly', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Professional response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [
          { role: 'system', content: 'You are a professional assistant' },
          { role: 'user', content: 'Hello' },
        ],
      };

      await provider.complete(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a professional assistant' },
            { role: 'user', content: 'Hello' },
          ],
        })
      );
    });

    it('should use custom model when specified', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
        })
      );
    });

    it('should use custom temperature and maxTokens', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.9,
        maxTokens: 2000,
      };

      await provider.complete(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
          max_tokens: 2000,
        })
      );
    });

    it('should throw error when no completion choices returned', async () => {
      mockCreate.mockResolvedValue({
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      });

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'No completion choices returned'
      );
    });

    it('should throw error when no usage data returned', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: undefined,
      });

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow('No usage data returned');
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'OpenAI completion failed: API rate limit exceeded'
      );
    });

    it('should calculate cost correctly for gpt-4o-mini', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const response = await provider.complete(request);

      // gpt-4o-mini: $0.15/1M input, $0.6/1M output
      // (1000/1M * 0.15) + (500/1M * 0.6) = 0.00015 + 0.0003 = 0.00045
      expect(response.usage.cost).toBeCloseTo(0.00045, 6);
    });

    it('should calculate cost correctly for gpt-4o', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Test' }],
      };

      const response = await provider.complete(request);

      // gpt-4o: $2.5/1M input, $10.0/1M output
      // (1000/1M * 2.5) + (500/1M * 10.0) = 0.0025 + 0.005 = 0.0075
      expect(response.usage.cost).toBeCloseTo(0.0075, 6);
    });

    it('should handle empty message content', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: null },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);

      expect(response.content).toBe('');
    });

    it('should handle different finish reasons', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Partial response' },
            finish_reason: 'length',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4096,
          total_tokens: 4106,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Write a long essay' }],
      };

      const response = await provider.complete(request);

      expect(response.finishReason).toBe('length');
    });

    it('should convert assistant messages correctly', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Follow-up response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 10,
          total_tokens: 40,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'First question' },
          { role: 'assistant', content: 'First answer' },
          { role: 'user', content: 'Second question' },
        ],
      };

      await provider.complete(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'First question' },
            { role: 'assistant', content: 'First answer' },
            { role: 'user', content: 'Second question' },
          ],
        })
      );
    });
  });

  describe('streamComplete', () => {
    it('should stream completion chunks', async () => {
      const mockStream = [
        { choices: [{ delta: { content: 'Hello ' } }] },
        { choices: [{ delta: { content: 'from ' } }] },
        { choices: [{ delta: { content: 'GPT!' } }] },
      ];

      mockCreate.mockResolvedValue(
        (async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })()
      );

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks: string[] = [];
      const generator = provider.streamComplete(request);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello ', 'from ', 'GPT!']);
    });

    it('should handle stream with missing delta content', async () => {
      const mockStream = [
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: {} }] },
        { choices: [{ delta: { content: ' World' } }] },
      ];

      mockCreate.mockResolvedValue(
        (async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })()
      );

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const chunks: string[] = [];
      const generator = provider.streamComplete(request);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' World']);
    });

    it('should return final response with aggregated content', async () => {
      const mockStream = [
        { choices: [{ delta: { content: 'Hello ' } }] },
        { choices: [{ delta: { content: 'World' } }] },
      ];

      mockCreate.mockResolvedValue(
        (async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })()
      );

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const generator = provider.streamComplete(request);
      const chunks: string[] = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toBe('Hello World');
    });

    it('should call create with stream: true', async () => {
      const mockStream = [{ choices: [{ delta: { content: 'Test' } }] }];

      mockCreate.mockResolvedValue(
        (async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })()
      );

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.streamComplete(request);

      for await (const chunk of generator) {
        // Consume stream
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        })
      );
    });
  });
});
