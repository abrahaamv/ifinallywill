/**
 * Anthropic Provider Tests
 * Validates Claude AI integration and error handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicProvider } from '../providers/anthropic';
import type { AICompletionRequest } from '../types';

// Mock Anthropic SDK with class syntax for proper constructor mocking
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class {
      messages = {
        create: vi.fn(),
      };
      constructor(_config: unknown) {}
    },
  };
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const Anthropic = await import('@anthropic-ai/sdk');
    provider = new AnthropicProvider({ apiKey: 'test-api-key' });
    mockCreate = (provider as any).client.messages.create;
    vi.clearAllMocks();
  });

  describe('complete', () => {
    it('should successfully complete a basic request', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
        model: 'claude-3-5-sonnet-20241022',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);

      expect(response.content).toBe('Hello! How can I help?');
      // Phase 10: Usage now includes caching fields, use toMatchObject to check core fields
      expect(response.usage).toMatchObject({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      });
      // Phase 10: Cost may be in usage.cost due to caching implementation
      expect(response.usage.cost || response.cost).toBeGreaterThan(0);
    });

    it('should handle system messages correctly', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Professional response' }],
        usage: { input_tokens: 20, output_tokens: 10 },
        model: 'claude-3-5-sonnet-20241022',
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
          system: 'You are a professional assistant',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      );
    });

    it('should use custom model when specified', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'claude-3-5-sonnet-20241022',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
        })
      );
    });

    it('should use custom temperature and maxTokens', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'claude-3-5-sonnet-20241022',
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

    it('should throw error when no content returned', async () => {
      mockCreate.mockResolvedValue({
        content: [],
        usage: { input_tokens: 10, output_tokens: 0 },
        model: 'claude-3-5-sonnet-20241022',
      });

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'No content returned from Anthropic'
      );
    });

    it('should throw error for non-text response type', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'image', source: {} }],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'claude-3-5-sonnet-20241022',
      });

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'Unexpected response type from Anthropic'
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow('API rate limit exceeded');
    });

    it('should calculate cost correctly', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
        },
        model: 'claude-3-5-sonnet-20241022',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const response = await provider.complete(request);

      // Claude Sonnet: $3/1M input, $15/1M output
      // (1000/1M * 3) + (500/1M * 15) = 0.003 + 0.0075 = 0.0105
      // Phase 10: Cost may be in usage.cost due to caching implementation
      const cost = response.usage.cost || response.cost;
      expect(cost).toBeCloseTo(0.0105, 6);
    });
  });
});
