/**
 * Phase 12 Week 2: Model Router Integration
 * Unified intelligent model routing system
 */

import { createModuleLogger } from '@platform/shared';
import { ComplexityAnalyzer, createComplexityAnalyzer, type ComplexityScore } from './complexity-analyzer';
import { CascadingFallbackManager, createFallbackManager, type ModelConfig, type RoutingDecision } from './cascading-fallback';
import { ConfidenceThresholdManager, createConfidenceManager, type ConfidenceMetrics } from './confidence-threshold';

const logger = createModuleLogger('ModelRouter');

export interface RoutingContext {
  query: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  requiresCodeGeneration?: boolean;
  userExpertise?: 'beginner' | 'intermediate' | 'expert';
  budgetConstraints?: {
    maxCostPerQuery?: number; // USD
    preferCheaperModels?: boolean;
  };
}

export interface RoutingResult {
  selectedModel: ModelConfig;
  complexity: ComplexityScore;
  decision: RoutingDecision;
  fallbackStrategy: {
    primary: ModelConfig;
    fallbacks: ModelConfig[];
  };
}

export interface ExecutionResult {
  response: string;
  model: ModelConfig;
  confidence: ConfidenceMetrics;
  costActual: number; // USD
  latencyMs: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Intelligent Model Router
 *
 * Coordinates complexity analysis, model selection, and confidence evaluation:
 * 1. Analyze query complexity
 * 2. Route to optimal model tier
 * 3. Execute with fallback handling
 * 4. Evaluate response confidence
 * 5. Escalate if needed
 */
export class ModelRouter {
  private complexityAnalyzer: ComplexityAnalyzer;
  private fallbackManager: CascadingFallbackManager;
  private confidenceManager: ConfidenceThresholdManager;

  constructor() {
    this.complexityAnalyzer = createComplexityAnalyzer();
    this.fallbackManager = createFallbackManager();
    this.confidenceManager = createConfidenceManager();
  }

  /**
   * Route query to optimal model
   */
  async route(context: RoutingContext): Promise<RoutingResult> {
    logger.info('Routing query to optimal model', {
      queryLength: context.query.length,
      hasHistory: !!context.conversationHistory,
      requiresCodeGen: context.requiresCodeGeneration,
    });

    // Step 1: Analyze complexity
    const complexity = this.complexityAnalyzer.analyze(context.query, {
      conversationHistory: context.conversationHistory,
      userExpertise: context.userExpertise,
    });

    // Step 2: Apply budget constraints
    const requiresCodeGen = context.requiresCodeGeneration || false;
    let decision = this.fallbackManager.route(complexity, requiresCodeGen);

    // Budget override: Force cheaper model if cost-sensitive
    if (context.budgetConstraints?.preferCheaperModels && decision.selectedModel.tier !== 'fast') {
      const originalModel = decision.selectedModel.model;
      decision = this.fallbackManager.route(
        { ...complexity, level: 'simple' }, // Force simple routing
        requiresCodeGen
      );
      logger.info('Budget constraint applied', {
        from: originalModel,
        to: decision.selectedModel.model,
      });
    }

    // Step 3: Build fallback strategy
    const fallbackStrategy = this.fallbackManager.getStrategy(decision.selectedModel);

    logger.info('Routing complete', {
      model: decision.selectedModel.model,
      complexity: complexity.level,
      estimatedCost: `$${decision.estimatedCost.toFixed(4)}`,
      fallbacks: fallbackStrategy.fallbacks.map((m) => m.model),
    });

    return {
      selectedModel: decision.selectedModel,
      complexity,
      decision,
      fallbackStrategy,
    };
  }

  /**
   * Evaluate execution result and determine if escalation needed
   */
  async evaluateResult(
    result: ExecutionResult
  ): Promise<{
    shouldEscalate: boolean;
    recommendation: string;
    nextModel?: ModelConfig;
  }> {
    const { confidence, model } = result;

    // Get recommendation
    const action = this.confidenceManager.recommendAction(confidence, model);

    if (action.action === 'escalate') {
      const nextModel = this.fallbackManager.handleFailure(
        model,
        new Error('Low confidence response'),
        1
      );

      if (nextModel) {
        logger.info('Escalation recommended', {
          from: model.model,
          to: nextModel.model,
          confidence: confidence.score.toFixed(3),
        });

        return {
          shouldEscalate: true,
          recommendation: action.reasoning,
          nextModel,
        };
      }
    }

    return {
      shouldEscalate: false,
      recommendation: action.reasoning,
    };
  }

  /**
   * Estimate cost savings from intelligent routing
   */
  estimateCostSavings(monthlyQueries: number): {
    baseline: number;
    optimized: number;
    savings: number;
    savingsPercent: number;
  } {
    return this.fallbackManager.estimateCostSavings(monthlyQueries);
  }

  /**
   * Get routing statistics
   */
  getStatistics(routingHistory: RoutingResult[]): {
    totalQueries: number;
    modelDistribution: Record<string, number>;
    avgComplexity: number;
    avgEstimatedCost: number;
  } {
    const totalQueries = routingHistory.length;

    // Model distribution
    const modelDistribution: Record<string, number> = {};
    for (const result of routingHistory) {
      const model = result.selectedModel.model;
      modelDistribution[model] = (modelDistribution[model] || 0) + 1;
    }

    // Average complexity
    const avgComplexity =
      routingHistory.reduce((sum, r) => sum + r.complexity.score, 0) / totalQueries;

    // Average estimated cost
    const avgEstimatedCost =
      routingHistory.reduce((sum, r) => sum + r.decision.estimatedCost, 0) / totalQueries;

    return {
      totalQueries,
      modelDistribution,
      avgComplexity,
      avgEstimatedCost,
    };
  }
}

/**
 * Create a model router instance
 */
export function createModelRouter(): ModelRouter {
  return new ModelRouter();
}
