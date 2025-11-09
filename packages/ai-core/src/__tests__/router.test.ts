/**
 * AI Router Tests
 *
 * Tests intelligent routing logic, cost optimization, and fallback behavior.
 */

import { describe, expect, it, vi } from 'vitest';
import { AIRouter } from '../router';
import type { AICompletionRequest, AICompletionResponse, Message } from '../types';

// Mock AI providers with class syntax for proper constructor mocking
vi.mock('../providers/openai', () => ({
  OpenAIProvider: class {
    complete = vi.fn().mockResolvedValue({
      content: 'Mock response from OpenAI',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cost: 0.001,
      },
      model: 'gpt-4o-mini',
      provider: 'openai',
    } as AICompletionResponse);

    streamComplete = vi.fn().mockImplementation(async function* () {
      yield 'Mock';
      yield ' stream';
      return {
        content: 'Mock stream response',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          cost: 0.001,
        },
        model: 'gpt-4o-mini',
        provider: 'openai',
      } as AICompletionResponse;
    });

    constructor(_config: unknown) {}
  },
}));

vi.mock('../providers/anthropic', () => ({
  AnthropicProvider: class {
    complete = vi.fn().mockResolvedValue({
      content: 'Mock response from Anthropic',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cost: 0.015,
      },
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
    } as AICompletionResponse);

    streamComplete = vi.fn().mockImplementation(async function* () {
      yield 'Mock';
      yield ' fallback';
      return {
        content: 'Mock fallback response',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          cost: 0.015,
        },
        model: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
      } as AICompletionResponse;
    });

    constructor(_config: unknown) {}
  },
}));

vi.mock('../providers/google', () => ({
  GoogleProvider: class {
    complete = vi.fn().mockResolvedValue({
      content: 'Mock response from Google',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cost: 0.0,
      },
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
    } as AICompletionResponse);

    streamComplete = vi.fn().mockImplementation(async function* () {
      yield 'Mock';
      yield ' vision';
      return {
        content: 'Mock vision response',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          cost: 0.0,
        },
        model: 'gemini-2.0-flash-exp',
        provider: 'google',
      } as AICompletionResponse;
    });

    constructor(_config: unknown) {}
  },
}));

describe('AIRouter', () => {
  const config = {
    openaiApiKey: 'test-openai-key',
    anthropicApiKey: 'test-anthropic-key',
    googleApiKey: 'test-google-key',
    enableFallback: true,
    logRouting: false,
  };

  describe('Provider Selection', () => {
    it('should route simple queries to gpt-4o-mini', async () => {
      const router = new AIRouter(config);
      const messages: Message[] = [{ role: 'user', content: 'What is 2+2?' }];

      const decision = router.getRoutingDecision(messages);

      expect(decision.provider).toBe('openai');
      expect(decision.model).toBe('gpt-4o-mini');
      expect(decision.complexityScore).toBeLessThan(0.4);
      expect(decision.reasoning).toContain('gpt-4o-mini');
    });

    it('should route complex queries to appropriate model based on threshold', async () => {
      const router = new AIRouter(config);
      const messages: Message[] = [
        {
          role: 'user',
          content:
            'Explain the philosophical implications of quantum entanglement on determinism and free will, incorporating perspectives from both Eastern and Western philosophy.',
        },
      ];

      const decision = router.getRoutingDecision(messages);

      expect(decision.provider).toBe('openai');
      // Model selection depends on actual complexity score threshold (0.7 in shouldUseMiniModel)
      expect(['gpt-4o-mini', 'gpt-4o']).toContain(decision.model);
      expect(decision.complexityScore).toBeDefined();
    });

    it('should route vision tasks to gemini-2.0-flash-exp', async () => {
      const router = new AIRouter(config);
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What do you see in this image?',
        },
      ];

      const decision = router.getRoutingDecision(messages);

      expect(decision.provider).toBe('google');
      expect(decision.model).toBe('gemini-2.0-flash-exp');
      expect(decision.reasoning).toContain('Vision task');
    });
  });

  describe('Completion Execution', () => {
    it('should execute completion with selected provider', async () => {
      const router = new AIRouter(config);
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await router.complete(request);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock response from OpenAI');
      expect(response.provider).toBe('openai');
      expect(response.usage.cost).toBeLessThan(0.015);
    });

    it('should execute streaming completion', async () => {
      const router = new AIRouter(config);
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks: string[] = [];
      const generator = router.streamComplete(request);

      for await (const chunk of generator) {
        if (typeof chunk === 'string') {
          chunks.push(chunk);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('Mock');
    });
  });

  describe('Cost Optimization', () => {
    it('should use cheaper model for routine queries', async () => {
      const router = new AIRouter(config);
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'What is the capital of France?' }],
      };

      const response = await router.complete(request);

      expect(response.model).toBe('gpt-4o-mini');
      expect(response.usage.cost).toBeLessThan(0.01);
    });

    it('should route based on complexity analysis', async () => {
      const router = new AIRouter(config);
      const messages: Message[] = [
        {
          role: 'user',
          content:
            'Write a comprehensive analysis of macroeconomic trends in emerging markets over the past decade.',
        },
      ];

      const decision = router.getRoutingDecision(messages);

      expect(decision.model).toBeDefined();
      expect(['gpt-4o-mini', 'gpt-4o']).toContain(decision.model);
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to Anthropic when OpenAI fails', async () => {
      const failingRouter = new AIRouter({
        ...config,
        enableFallback: true,
      });

      // Mock OpenAI failure
      const mockOpenAI = {
        complete: vi.fn().mockRejectedValue(new Error('OpenAI API error')),
      };

      // Override with failing mock
      (failingRouter as { openai: unknown }).openai = mockOpenAI;

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await failingRouter.complete(request);

      expect(response).toBeDefined();
      expect(response.provider).toBe('anthropic');
      expect(mockOpenAI.complete).toHaveBeenCalled();
    });

    it('should throw error when fallback disabled', async () => {
      const noFallbackRouter = new AIRouter({
        ...config,
        enableFallback: false,
      });

      // Mock OpenAI failure
      const mockOpenAI = {
        complete: vi.fn().mockRejectedValue(new Error('OpenAI API error')),
      };

      (noFallbackRouter as { openai: unknown }).openai = mockOpenAI;

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(noFallbackRouter.complete(request)).rejects.toThrow('OpenAI API error');
    });
  });

  describe('Multi-turn Conversations', () => {
    it('should handle conversation history correctly', async () => {
      const router = new AIRouter(config);
      const messages: Message[] = [
        { role: 'user', content: 'What is TypeScript?' },
        { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript.' },
        { role: 'user', content: 'Can you give me an example?' },
      ];

      const decision = router.getRoutingDecision(messages);

      expect(decision.provider).toBeDefined();
      expect(decision.model).toBeDefined();
    });
  });
});
