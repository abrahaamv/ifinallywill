/**
 * Google Provider Tests
 * Validates Gemini AI integration and vision optimization
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GoogleProvider } from '../providers/google';
import type { AICompletionRequest } from '../types';

// Mock Google Generative AI SDK
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn(),
    })),
  };
});

describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  let mockGetGenerativeModel: ReturnType<typeof vi.fn>;
  let mockStartChat: ReturnType<typeof vi.fn>;
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    provider = new GoogleProvider({ apiKey: 'test-api-key' });

    mockSendMessage = vi.fn();
    mockStartChat = vi.fn().mockReturnValue({
      sendMessage: mockSendMessage,
    });
    mockGetGenerativeModel = vi.fn().mockReturnValue({
      startChat: mockStartChat,
    });

    (provider as any).client.getGenerativeModel = mockGetGenerativeModel;
    vi.clearAllMocks();
  });

  describe('complete', () => {
    it('should successfully complete a basic request', async () => {
      const mockResponse = {
        response: {
          text: () => 'Hello! How can I assist you today?',
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.complete(request);

      expect(response.content).toBe('Hello! How can I assist you today?');
      expect(response.provider).toBe('google');
      expect(response.model).toBe('gemini-2.0-flash-exp');
      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBe(
        response.usage.inputTokens + response.usage.outputTokens
      );
    });

    it('should convert message history to Gemini format', async () => {
      const mockResponse = {
        response: { text: () => 'Response' },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'First response' },
          { role: 'user', content: 'Second message' },
        ],
      };

      await provider.complete(request);

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'First message' }] },
          { role: 'model', parts: [{ text: 'First response' }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });

      expect(mockSendMessage).toHaveBeenCalledWith('Second message');
    });

    it('should use custom model when specified', async () => {
      const mockResponse = {
        response: { text: () => 'Response' },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        model: 'gemini-2.0-flash-exp',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await provider.complete(request);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-exp',
      });
    });

    it('should use custom temperature and maxTokens', async () => {
      const mockResponse = {
        response: { text: () => 'Response' },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.9,
        maxTokens: 2000,
      };

      await provider.complete(request);

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2000,
        },
      });
    });

    it('should throw error when no messages provided', async () => {
      const request: AICompletionRequest = {
        messages: [],
      };

      await expect(provider.complete(request)).rejects.toThrow('No messages provided');
    });

    it('should handle API errors gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('API rate limit exceeded'));

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(provider.complete(request)).rejects.toThrow(
        'Google AI completion failed: API rate limit exceeded'
      );
    });

    it('should calculate cost as zero for Gemini Flash preview', async () => {
      const mockResponse = {
        response: { text: () => 'A'.repeat(1000) },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      const response = await provider.complete(request);

      // Gemini Flash is free during preview
      expect(response.usage.cost).toBe(0);
    });

    it('should approximate token counts correctly', async () => {
      const mockResponse = {
        response: { text: () => 'Response text' },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'This is a test message' }],
      };

      const response = await provider.complete(request);

      // Tokens ~= characters / 4
      const expectedInputTokens = Math.ceil('This is a test message'.length / 4);
      const expectedOutputTokens = Math.ceil('Response text'.length / 4);

      expect(response.usage.inputTokens).toBe(expectedInputTokens);
      expect(response.usage.outputTokens).toBe(expectedOutputTokens);
    });

    it('should handle multi-turn conversations', async () => {
      const mockResponse = {
        response: { text: () => 'Continued response' },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'What is AI?' },
          { role: 'assistant', content: 'AI stands for Artificial Intelligence.' },
          { role: 'user', content: 'Tell me more' },
        ],
      };

      const response = await provider.complete(request);

      expect(response.content).toBe('Continued response');
      expect(mockStartChat).toHaveBeenCalledWith(
        expect.objectContaining({
          history: [
            { role: 'user', parts: [{ text: 'What is AI?' }] },
            { role: 'model', parts: [{ text: 'AI stands for Artificial Intelligence.' }] },
          ],
        })
      );
    });
  });

  describe('streamComplete', () => {
    it('should stream completion chunks', async () => {
      const mockStream = [
        { text: () => 'Hello ' },
        { text: () => 'from ' },
        { text: () => 'Gemini!' },
      ];

      const mockSendMessageStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })(),
      });

      mockStartChat.mockReturnValue({
        sendMessageStream: mockSendMessageStream,
      });

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const chunks: string[] = [];
      const generator = provider.streamComplete(request);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello ', 'from ', 'Gemini!']);
    });

    it('should return final response with aggregated content', async () => {
      const mockStream = [{ text: () => 'Hello ' }, { text: () => 'World' }];

      const mockSendMessageStream = vi.fn().mockResolvedValue({
        stream: (async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })(),
      });

      mockStartChat.mockReturnValue({
        sendMessageStream: mockSendMessageStream,
      });

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
  });
});
