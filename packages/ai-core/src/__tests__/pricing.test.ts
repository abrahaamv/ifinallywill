/**
 * AI Provider Pricing Tests
 * Validates cost calculation accuracy and pricing data integrity
 */

import { describe, expect, it } from 'vitest';
import { PRICING, calculateCost } from '../pricing';
import type { AIModel } from '../types';

describe('AI Provider Pricing', () => {
  describe('PRICING configuration', () => {
    it('should have pricing for all supported models', () => {
      const models: AIModel[] = [
        'gpt-4o-mini',
        'gpt-4o',
        'claude-3-5-sonnet-20241022',
        'gemini-2.0-flash-exp',
      ];

      for (const model of models) {
        expect(PRICING[model]).toBeDefined();
        expect(PRICING[model].provider).toBeDefined();
        expect(PRICING[model].inputPerMillion).toBeGreaterThanOrEqual(0);
        expect(PRICING[model].outputPerMillion).toBeGreaterThanOrEqual(0);
      }
    });

    it('should correctly map models to providers', () => {
      expect(PRICING['gpt-4o-mini'].provider).toBe('openai');
      expect(PRICING['gpt-4o'].provider).toBe('openai');
      expect(PRICING['claude-3-5-sonnet-20241022'].provider).toBe('anthropic');
      expect(PRICING['gemini-2.0-flash-exp'].provider).toBe('google');
    });

    it('should have gpt-4o-mini as most cost-effective for text', () => {
      const gpt4oMiniCost =
        PRICING['gpt-4o-mini'].inputPerMillion + PRICING['gpt-4o-mini'].outputPerMillion;
      const gpt4oCost = PRICING['gpt-4o'].inputPerMillion + PRICING['gpt-4o'].outputPerMillion;
      const claudeCost =
        PRICING['claude-3-5-sonnet-20241022'].inputPerMillion +
        PRICING['claude-3-5-sonnet-20241022'].outputPerMillion;

      expect(gpt4oMiniCost).toBeLessThan(gpt4oCost);
      expect(gpt4oMiniCost).toBeLessThan(claudeCost);
    });

    it('should have Gemini Flash free during preview', () => {
      expect(PRICING['gemini-2.0-flash-exp'].inputPerMillion).toBe(0);
      expect(PRICING['gemini-2.0-flash-exp'].outputPerMillion).toBe(0);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for gpt-4o-mini', () => {
      const model: AIModel = 'gpt-4o-mini';
      const inputTokens = 1000;
      const outputTokens = 500;

      const cost = calculateCost(model, inputTokens, outputTokens);

      // (1000 / 1M * 0.15) + (500 / 1M * 0.6) = 0.00015 + 0.0003 = 0.00045
      expect(cost).toBeCloseTo(0.00045, 6);
    });

    it('should calculate cost correctly for gpt-4o', () => {
      const model: AIModel = 'gpt-4o';
      const inputTokens = 10000;
      const outputTokens = 5000;

      const cost = calculateCost(model, inputTokens, outputTokens);

      // (10000 / 1M * 2.5) + (5000 / 1M * 10.0) = 0.025 + 0.05 = 0.075
      expect(cost).toBeCloseTo(0.075, 6);
    });

    it('should calculate cost correctly for Claude Sonnet', () => {
      const model: AIModel = 'claude-3-5-sonnet-20241022';
      const inputTokens = 5000;
      const outputTokens = 2000;

      const cost = calculateCost(model, inputTokens, outputTokens);

      // (5000 / 1M * 3.0) + (2000 / 1M * 15.0) = 0.015 + 0.03 = 0.045
      expect(cost).toBeCloseTo(0.045, 6);
    });

    it('should return zero cost for Gemini Flash (free preview)', () => {
      const model: AIModel = 'gemini-2.0-flash-exp';
      const inputTokens = 100000;
      const outputTokens = 50000;

      const cost = calculateCost(model, inputTokens, outputTokens);

      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const model: AIModel = 'gpt-4o-mini';
      const cost = calculateCost(model, 0, 0);

      expect(cost).toBe(0);
    });

    it('should handle large token counts', () => {
      const model: AIModel = 'gpt-4o';
      const inputTokens = 1000000; // 1M tokens
      const outputTokens = 500000; // 500K tokens

      const cost = calculateCost(model, inputTokens, outputTokens);

      // (1M / 1M * 2.5) + (500K / 1M * 10.0) = 2.5 + 5.0 = 7.5
      expect(cost).toBeCloseTo(7.5, 6);
    });

    it('should demonstrate 75% cost reduction with gpt-4o-mini vs gpt-4o', () => {
      const inputTokens = 10000;
      const outputTokens = 5000;

      const miniCost = calculateCost('gpt-4o-mini', inputTokens, outputTokens);
      const gpt4oCost = calculateCost('gpt-4o', inputTokens, outputTokens);

      const reduction = ((gpt4oCost - miniCost) / gpt4oCost) * 100;

      expect(reduction).toBeGreaterThan(75); // Should be ~99% reduction
    });
  });
});
