/**
 * RAGAS Evaluation Framework Exports (Phase 12 Week 4)
 */

export type {
  RAGASMetrics,
  RAGASEvaluationInput,
  RAGASEvaluationResult,
  FaithfulnessDetails,
  RelevancyDetails,
  PrecisionDetails,
  RecallDetails,
  RAGASConfig,
} from './ragas';

export type {
  RegressionDetectionResult,
  QualityScoreResult,
} from './ragas';

export {
  RAGASEvaluator,
  DEFAULT_RAGAS_CONFIG,
  detectRegression,
  calculateQualityScore,
} from './ragas';

export type {
  TestRunConfig,
  TestRunResult,
} from './test-runner';

export {
  RAGASTestRunner,
} from './test-runner';

export {
  DEFAULT_TEST_SETS,
  createDefaultTestSet,
} from './test-sets';

// Phase 12 Week 4: Continuous Evaluation
export type {
  ContinuousEvaluationConfig,
  QualityThresholds,
  EvaluationAlert,
} from './continuous-evaluation';

export {
  ContinuousRAGEvaluator,
  createContinuousEvaluator,
} from './continuous-evaluation';
