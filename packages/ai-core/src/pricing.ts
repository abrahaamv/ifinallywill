/**
 * AI Provider Pricing Configuration
 * Pricing per 1M tokens (as of 2025-01-07)
 * Source: Official provider pricing pages
 */

import type { AIModel, AIProvider } from './types';

export interface ModelPricing {
  provider: AIProvider;
  model: AIModel;
  inputPerMillion: number;  // USD per 1M input tokens
  outputPerMillion: number; // USD per 1M output tokens
}

export const PRICING: Record<AIModel, ModelPricing> = {
  // OpenAI - Cost-optimized primary
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
  },

  // Anthropic - Fallback for complex tasks
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
  },

  // Google - Vision tasks
  'gemini-2.0-flash-exp': {
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    inputPerMillion: 0.00, // Free during preview
    outputPerMillion: 0.00, // Free during preview
  },
};

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return inputCost + outputCost;
}

/**
 * Get blended rate for cost-optimized routing
 * Assumes: 70% gpt-4o-mini, 30% gpt-4o
 */
export function getBlendedRate(): { inputPerMillion: number; outputPerMillion: number } {
  const mini = PRICING['gpt-4o-mini'];
  const standard = PRICING['gpt-4o'];

  return {
    inputPerMillion: mini.inputPerMillion * 0.7 + standard.inputPerMillion * 0.3,
    outputPerMillion: mini.outputPerMillion * 0.7 + standard.outputPerMillion * 0.3,
  };
}

/**
 * Calculate cost savings vs Claude-only baseline
 */
export function calculateSavings(actualCost: number): {
  baselineCost: number;
  actualCost: number;
  savings: number;
  savingsPercent: number;
} {
  const claudePricing = PRICING['claude-3-5-sonnet-20241022'];
  const baselineCost = actualCost * (claudePricing.inputPerMillion / getBlendedRate().inputPerMillion);

  const savings = baselineCost - actualCost;
  const savingsPercent = (savings / baselineCost) * 100;

  return {
    baselineCost,
    actualCost,
    savings,
    savingsPercent,
  };
}
