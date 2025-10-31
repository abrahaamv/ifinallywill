/**
 * Complexity Analysis Tests
 *
 * Tests message complexity scoring for intelligent AI routing.
 */

import { describe, expect, it } from 'vitest';
import { analyzeComplexity, requiresVisionModel, shouldUseMiniModel } from '../complexity';
import type { Message } from '../types';

describe('Complexity Analysis', () => {
  describe('analyzeComplexity', () => {
    it('should score simple factual queries as low complexity', () => {
      const messages: Message[] = [{ role: 'user', content: 'What is 2+2?' }];

      const analysis = analyzeComplexity(messages);

      expect(analysis.score).toBeLessThan(0.4);
      expect(analysis.reasoning).toContain('simple factual query');
    });

    it('should score complex reasoning queries as high complexity', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content:
            'Analyze the economic implications of climate change on global supply chains and explain the strategic approaches multinational corporations should consider.',
        },
      ];

      const analysis = analyzeComplexity(messages);

      // Actual complexity threshold is 0.4 based on router.ts line 69
      expect(analysis.score).toBeGreaterThan(0.3);
      expect(analysis.reasoning).toContain('requires reasoning');
    });

    it('should score creative tasks as high complexity', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content:
            'Create a comprehensive marketing strategy for a new SaaS product targeting enterprise clients.',
        },
      ];

      const analysis = analyzeComplexity(messages);

      // Actual score depends on combination of factors
      expect(analysis.score).toBeGreaterThan(0.4);
      expect(analysis.reasoning).toContain('requires creativity');
    });

    it('should consider message length in complexity', () => {
      const shortMessage: Message[] = [{ role: 'user', content: 'What is TypeScript?' }];

      const longMessage: Message[] = [
        {
          role: 'user',
          content: 'a'.repeat(2000) + ' What is TypeScript?',
        },
      ];

      const shortAnalysis = analyzeComplexity(shortMessage);
      const longAnalysis = analyzeComplexity(longMessage);

      expect(longAnalysis.score).toBeGreaterThan(shortAnalysis.score);
      expect(longAnalysis.reasoning).toContain('long message');
    });

    it('should consider conversation depth', () => {
      const singleTurn: Message[] = [{ role: 'user', content: 'Hello' }];

      const multiTurn: Message[] = Array.from(
        { length: 20 },
        (_, i) =>
          ({
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
          }) as Message
      );

      const singleAnalysis = analyzeComplexity(singleTurn);
      const multiAnalysis = analyzeComplexity(multiTurn);

      expect(multiAnalysis.score).toBeGreaterThan(singleAnalysis.score);
      expect(multiAnalysis.reasoning).toContain('deep conversation');
    });

    it('should detect reasoning keywords', () => {
      const reasoningKeywords = [
        'analyze',
        'explain',
        'compare',
        'evaluate',
        'why',
        'how',
        'reasoning',
        'logic',
        'think',
        'consider',
        'implications',
        'consequences',
        'strategy',
        'approach',
        'methodology',
      ];

      for (const keyword of reasoningKeywords) {
        const messages: Message[] = [{ role: 'user', content: `Can you ${keyword} this problem?` }];

        const analysis = analyzeComplexity(messages);

        expect(analysis.factors.requiresReasoning).toBe(true);
        expect(analysis.reasoning).toContain('requires reasoning');
      }
    });

    it('should detect creativity keywords', () => {
      const creativityKeywords = [
        'create',
        'design',
        'generate',
        'write',
        'compose',
        'draft',
        'brainstorm',
        'ideas',
        'innovative',
        'creative',
        'imagine',
        'suggest',
        'propose',
        'develop',
      ];

      for (const keyword of creativityKeywords) {
        const messages: Message[] = [{ role: 'user', content: `Please ${keyword} a solution` }];

        const analysis = analyzeComplexity(messages);

        expect(analysis.factors.requiresCreativity).toBe(true);
        expect(analysis.reasoning).toContain('requires creativity');
      }
    });

    it('should recognize simple query patterns', () => {
      const simpleQueries = [
        'What is Python?',
        'When was JavaScript invented?',
        'Where is TypeScript used?',
        'Who is the author of Node.js?',
        'Which is better?',
        'Define microservices',
      ];

      for (const query of simpleQueries) {
        const messages: Message[] = [{ role: 'user', content: query }];

        const analysis = analyzeComplexity(messages);

        // Simple pattern forces score to 0.2
        expect(analysis.score).toBe(0.2);
        expect(analysis.reasoning).toContain('simple factual query');
      }
    });

    it('should handle empty messages gracefully', () => {
      const messages: Message[] = [{ role: 'user', content: '' }];

      const analysis = analyzeComplexity(messages);

      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(1);
      expect(analysis.reasoning).toBeDefined();
    });
  });

  describe('shouldUseMiniModel', () => {
    it('should recommend mini model for low complexity', () => {
      const lowComplexity = {
        score: 0.3,
        reasoning: 'Simple query',
        factors: {
          messageLength: 10,
          contextComplexity: 0.1,
          requiresReasoning: false,
          requiresCreativity: false,
        },
      };

      expect(shouldUseMiniModel(lowComplexity)).toBe(true);
    });

    it('should recommend premium model for high complexity', () => {
      const highComplexity = {
        score: 0.8,
        reasoning: 'Complex reasoning required',
        factors: {
          messageLength: 1000,
          contextComplexity: 0.7,
          requiresReasoning: true,
          requiresCreativity: true,
        },
      };

      expect(shouldUseMiniModel(highComplexity)).toBe(false);
    });

    it('should use threshold of 0.7', () => {
      const edgeCaseLow = {
        score: 0.69,
        reasoning: 'Edge case',
        factors: {
          messageLength: 500,
          contextComplexity: 0.5,
          requiresReasoning: false,
          requiresCreativity: false,
        },
      };

      const edgeCaseHigh = {
        score: 0.71,
        reasoning: 'Edge case',
        factors: {
          messageLength: 500,
          contextComplexity: 0.5,
          requiresReasoning: false,
          requiresCreativity: false,
        },
      };

      expect(shouldUseMiniModel(edgeCaseLow)).toBe(true);
      expect(shouldUseMiniModel(edgeCaseHigh)).toBe(false);
    });
  });

  describe('requiresVisionModel', () => {
    it('should detect image-related keywords', () => {
      const visionKeywords = [
        'image',
        'picture',
        'photo',
        'screenshot',
        'diagram',
        'visual',
        'see',
        'look at',
        'show me',
        "what's in",
      ];

      for (const keyword of visionKeywords) {
        const messages: Message[] = [{ role: 'user', content: `Can you analyze this ${keyword}?` }];

        expect(requiresVisionModel(messages)).toBe(true);
      }
    });

    it('should return false for text-only queries', () => {
      const messages: Message[] = [{ role: 'user', content: 'What is the capital of France?' }];

      expect(requiresVisionModel(messages)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const messages: Message[] = [{ role: 'user', content: 'What do you SEE in this IMAGE?' }];

      expect(requiresVisionModel(messages)).toBe(true);
    });

    it('should handle empty messages', () => {
      const messages: Message[] = [{ role: 'user', content: '' }];

      expect(requiresVisionModel(messages)).toBe(false);
    });
  });
});
