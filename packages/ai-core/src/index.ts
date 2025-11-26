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

// Phase 12 Week 1: Prompt Caching (90% cost reduction)
export {
  GeminiProviderWithCaching,
  ClaudeProviderWithCaching,
  createCachedProvider,
} from './caching';

// Phase 12 Week 2: Model Routing Refinement
export type {
  ComplexityLevel,
  ComplexityScore,
  AnalysisContext,
} from './routing/complexity-analyzer';

export type {
  ModelTier,
  ModelConfig,
  FallbackStrategy,
  RoutingDecision as CascadingRoutingDecision,
} from './routing/cascading-fallback';

export type {
  ConfidenceMetrics,
  ThresholdConfig,
} from './routing/confidence-threshold';

export type {
  RoutingContext,
  RoutingResult,
  ExecutionResult,
} from './routing/model-router';

export {
  ComplexityAnalyzer,
  createComplexityAnalyzer,
} from './routing/complexity-analyzer';

export {
  CascadingFallbackManager,
  createFallbackManager,
  MODEL_CONFIGS,
} from './routing/cascading-fallback';

export {
  ConfidenceThresholdManager,
  createConfidenceManager,
} from './routing/confidence-threshold';

export {
  ModelRouter,
  createModelRouter,
} from './routing/model-router';

// Phase 12 Week 3 Days 3-7: Dynamic Configuration & Cascading Router
export type {
  ModelTier as DynamicModelTier,
  QueryComplexity,
  ModelConfig as DynamicModelConfig,
} from './routing/dynamic-config';

export type {
  CompletionWithConfidence,
  CascadingConfig,
} from './routing/cascading-router';

export {
  getModelConfigForQuery,
  classifyQueryComplexity,
  determineTierFromComplexity,
} from './routing/dynamic-config';

export {
  completeWithCascading,
} from './routing/cascading-router';

// Phase 12 Week 3: Prompt Engineering
export type {
  QueryType,
  PromptTemplate,
} from './prompts/system-templates';

export type {
  GroundingContext,
  HallucinationCheckResult,
} from './prompts/hallucination-reduction';

export type {
  CitationStyle,
  Source,
  Citation,
  FormattedResponse,
} from './prompts/citation-formatting';

export {
  SystemPromptManager,
  createPromptManager,
} from './prompts/system-templates';

export {
  HallucinationReductionManager,
  createHallucinationManager,
} from './prompts/hallucination-reduction';

export {
  CitationFormatter,
  createCitationFormatter,
} from './prompts/citation-formatting';

// Phase 12 Week 3 Days 1-2: Customer Support Prompts & Versioning
// TODO: Re-enable when prompt system is fully implemented
// export type {
//   EscalationTrigger,
//   EscalationTriggerType,
//   CustomerSupportPromptConfig,
//   PromptVersion,
//   PromptVariant,
//   PromptRegistry,
// } from './prompts';

// export {
//   buildCustomerSupportPrompt,
//   buildMultiModalPrompt,
//   buildVoiceInteractionAddendum,
//   buildScreenShareAddendum,
//   buildVideoAddendum,
//   detectEscalationTrigger,
//   getEscalationTrigger,
//   buildVersionedPrompt,
//   promptManager,
//   ESCALATION_TRIGGERS,
// } from './prompts';

// Phase 12 Week 4: Monitoring Infrastructure
export type {
  RAGASInput,
  RAGASScores,
  RAGASEvaluation,
} from './monitoring/ragas-metrics';

export type {
  QualityMetric,
  QualityThreshold,
  QualityAlert,
  QualityReport,
} from './monitoring/quality-metrics';

export type {
  Variant,
  Experiment,
  ExperimentResult,
  StatisticalSignificance,
} from './monitoring/ab-testing';

export {
  RAGASMetricsCalculator,
  createRAGASCalculator,
} from './monitoring/ragas-metrics';

export {
  QualityMetricsTracker,
  createQualityTracker,
} from './monitoring/quality-metrics';

export {
  ABTestingManager,
  createABTestingManager,
} from './monitoring/ab-testing';
