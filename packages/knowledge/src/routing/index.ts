/**
 * Intelligent Query Routing System (Phase 12 Week 7-8)
 *
 * Exports:
 * - ComplexityScorer: Analyzes query complexity for model selection
 * - IntentClassifier: Classifies query intent for routing optimization
 * - IntelligentRouter: Routes queries to optimal models with fallbacks
 */

// Complexity Scoring
export {
  ComplexityScorer,
  type ComplexityScore,
  type ComplexityAnalysisInput,
  type ComplexityScorerConfig,
} from './complexity-scorer';

// Intent Classification
export {
  IntentClassifier,
  type Intent,
  type IntentClassificationResult,
  type IntentClassificationInput,
  type IntentClassifierConfig,
} from './intent-classifier';

// Intelligent Routing
export {
  IntelligentRouter,
  type RouteDecision,
  type RoutingConfig,
} from './intelligent-router';
