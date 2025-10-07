/**
 * AI Core Package
 * Cost-optimized AI provider abstractions with intelligent routing
 */

// Types
export type {
  AIProvider,
  AIModel,
  Message,
  AICompletionRequest,
  AICompletionResponse,
  AIUsage,
  ProviderConfig,
  AIProviderInterface,
  ComplexityAnalysis,
  CostEstimate,
} from './types';

// Router
export { AIRouter } from './router';
export type { RouterConfig, RoutingDecision } from './router';

// Providers
export { OpenAIProvider } from './providers/openai';
export { AnthropicProvider } from './providers/anthropic';
export { GoogleProvider } from './providers/google';

// Pricing
export {
  PRICING,
  calculateCost,
  getBlendedRate,
  calculateSavings,
} from './pricing';
export type { ModelPricing } from './pricing';

// Complexity Analysis
export {
  analyzeComplexity,
  shouldUseMiniModel,
  requiresVisionModel,
} from './complexity';
