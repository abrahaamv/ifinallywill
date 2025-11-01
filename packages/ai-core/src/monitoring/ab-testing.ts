/**
 * Phase 12 Week 4: A/B Testing Infrastructure
 * Framework for testing RAG/AI improvements
 */

import { createModuleLogger } from '@platform/shared';
import type { RAGASScores } from './ragas-metrics';

const logger = createModuleLogger('ABTesting');

export interface Variant {
  id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  weight: number; // 0-1, allocation percentage
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'paused' | 'completed';
  targetMetric: string; // Primary metric to optimize
  minimumSampleSize: number;
  confidenceLevel: number; // 0.95 = 95% confidence
}

export interface ExperimentResult {
  variantId: string;
  sampleSize: number;
  metrics: {
    name: string;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  }[];
  ragasScores?: RAGASScores;
}

export interface StatisticalSignificance {
  isSignificant: boolean;
  pValue: number;
  confidenceLevel: number;
  winner?: string;
  improvement: number; // Percentage improvement
}

/**
 * A/B Testing Manager
 *
 * Manages experimentation for RAG/AI improvements:
 * - Variant allocation
 * - Result tracking
 * - Statistical significance testing
 * - Winner determination
 */
export class ABTestingManager {
  private experiments: Map<string, Experiment> = new Map();
  private results: Map<string, ExperimentResult[]> = new Map();

  /**
   * Create a new experiment
   */
  createExperiment(experiment: Omit<Experiment, 'status'>): Experiment {
    const exp: Experiment = {
      ...experiment,
      status: 'draft',
    };

    this.experiments.set(exp.id, exp);

    logger.info('Experiment created', {
      id: exp.id,
      name: exp.name,
      variantCount: exp.variants.length,
    });

    return exp;
  }

  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Validate variant weights sum to 1.0
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error(`Variant weights must sum to 1.0 (currently ${totalWeight})`);
    }

    experiment.status = 'running';
    experiment.startDate = new Date();

    logger.info('Experiment started', {
      id: experimentId,
      variants: experiment.variants.map((v) => ({ id: v.id, weight: v.weight })),
    });
  }

  /**
   * Assign user to variant (consistent hashing)
   */
  assignVariant(experimentId: string, userId: string): Variant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    // Hash user ID to get consistent assignment
    const hash = this.hashString(userId);
    const normalized = hash % 10000 / 10000; // 0.0-1.0

    // Find variant based on cumulative weight
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (normalized < cumulative) {
        return variant;
      }
    }

    // Fallback to last variant
    return experiment.variants[experiment.variants.length - 1] || null;
  }

  /**
   * Simple string hash function for consistent assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Record experiment result
   */
  recordResult(experimentId: string, result: ExperimentResult): void {
    const results = this.results.get(experimentId) || [];
    results.push(result);
    this.results.set(experimentId, results);

    logger.debug('Result recorded', {
      experimentId,
      variantId: result.variantId,
      sampleSize: result.sampleSize,
    });
  }

  /**
   * Get experiment results
   */
  getResults(experimentId: string): Map<string, ExperimentResult[]> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const results = this.results.get(experimentId) || [];

    // Group by variant
    const grouped = new Map<string, ExperimentResult[]>();
    for (const variant of experiment.variants) {
      const variantResults = results.filter((r) => r.variantId === variant.id);
      grouped.set(variant.id, variantResults);
    }

    return grouped;
  }

  /**
   * Analyze experiment for statistical significance
   */
  analyzeExperiment(experimentId: string): {
    significance: StatisticalSignificance;
    summary: {
      variantId: string;
      sampleSize: number;
      targetMetricMean: number;
      targetMetricStdDev: number;
    }[];
  } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const groupedResults = this.getResults(experimentId);

    // Calculate summary statistics for each variant
    const summary = experiment.variants.map((variant) => {
      const variantResults = groupedResults.get(variant.id) || [];
      const sampleSize = variantResults.reduce((sum, r) => sum + r.sampleSize, 0);

      // Find target metric
      const targetValues: number[] = [];
      for (const result of variantResults) {
        const metric = result.metrics.find((m) => m.name === experiment.targetMetric);
        if (metric) {
          targetValues.push(metric.mean);
        }
      }

      const targetMetricMean = this.mean(targetValues);
      const targetMetricStdDev = this.standardDeviation(targetValues);

      return {
        variantId: variant.id,
        sampleSize,
        targetMetricMean,
        targetMetricStdDev,
      };
    });

    // Perform t-test between variants (simplified - pairwise comparison)
    const significance = this.performTTest(
      summary,
      experiment.minimumSampleSize,
      experiment.confidenceLevel
    );

    logger.info('Experiment analysis complete', {
      experimentId,
      isSignificant: significance.isSignificant,
      winner: significance.winner,
    });

    return {
      significance,
      summary,
    };
  }

  /**
   * Simplified t-test for statistical significance
   */
  private performTTest(
    summary: Array<{
      variantId: string;
      sampleSize: number;
      targetMetricMean: number;
      targetMetricStdDev: number;
    }>,
    minimumSampleSize: number,
    confidenceLevel: number
  ): StatisticalSignificance {
    // Check if we have enough data
    const hasEnoughData = summary.every((s) => s.sampleSize >= minimumSampleSize);

    if (!hasEnoughData) {
      return {
        isSignificant: false,
        pValue: 1.0,
        confidenceLevel,
        improvement: 0,
      };
    }

    // Find control (first variant) and treatment (best performing)
    const control = summary[0];
    if (!control) {
      return {
        isSignificant: false,
        pValue: 1.0,
        confidenceLevel,
        improvement: 0,
      };
    }

    const treatments = summary.slice(1);

    // Find best performing treatment
    let bestTreatment = control;
    let maxMean = control.targetMetricMean;

    for (const treatment of treatments) {
      if (treatment.targetMetricMean > maxMean) {
        maxMean = treatment.targetMetricMean;
        bestTreatment = treatment;
      }
    }

    // Calculate t-statistic and p-value (simplified)
    const { tStatistic, pValue } = this.calculateTStatistic(control, bestTreatment);

    // Determine significance
    const criticalValue = this.getCriticalValue(confidenceLevel);
    const isSignificant = Math.abs(tStatistic) > criticalValue && pValue < (1 - confidenceLevel);

    // Calculate improvement
    const improvement =
      control.targetMetricMean !== 0
        ? ((bestTreatment.targetMetricMean - control.targetMetricMean) /
            control.targetMetricMean) *
          100
        : 0;

    return {
      isSignificant,
      pValue,
      confidenceLevel,
      winner: isSignificant ? bestTreatment.variantId : undefined,
      improvement,
    };
  }

  /**
   * Calculate t-statistic for two-sample t-test
   */
  private calculateTStatistic(
    control: {
      sampleSize: number;
      targetMetricMean: number;
      targetMetricStdDev: number;
    },
    treatment: {
      sampleSize: number;
      targetMetricMean: number;
      targetMetricStdDev: number;
    }
  ): { tStatistic: number; pValue: number } {
    const meanDiff = treatment.targetMetricMean - control.targetMetricMean;

    // Pooled standard deviation
    const pooledStdDev = Math.sqrt(
      (control.targetMetricStdDev ** 2) / control.sampleSize +
        (treatment.targetMetricStdDev ** 2) / treatment.sampleSize
    );

    const tStatistic = pooledStdDev !== 0 ? meanDiff / pooledStdDev : 0;

    // Simplified p-value estimation (normal approximation)
    const pValue = Math.max(0, 1 - Math.abs(tStatistic) / 4);

    return { tStatistic, pValue };
  }

  /**
   * Get critical t-value for confidence level
   */
  private getCriticalValue(confidenceLevel: number): number {
    // Simplified lookup (assumes large sample)
    if (confidenceLevel >= 0.99) return 2.576;
    if (confidenceLevel >= 0.95) return 1.960;
    if (confidenceLevel >= 0.90) return 1.645;
    return 1.282;
  }

  /**
   * Calculate mean
   */
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const avg = this.mean(values);
    const squareDiffs = values.map((v) => (v - avg) ** 2);
    const avgSquareDiff = this.mean(squareDiffs);

    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Stop experiment
   */
  stopExperiment(experimentId: string, winner?: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = 'completed';
    experiment.endDate = new Date();

    logger.info('Experiment stopped', {
      id: experimentId,
      winner,
      duration: experiment.endDate.getTime() - experiment.startDate.getTime(),
    });
  }

  /**
   * List all experiments
   */
  listExperiments(status?: Experiment['status']): Experiment[] {
    const experiments = Array.from(this.experiments.values());

    if (status) {
      return experiments.filter((e) => e.status === status);
    }

    return experiments;
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }
}

/**
 * Create an A/B testing manager instance
 */
export function createABTestingManager(): ABTestingManager {
  return new ABTestingManager();
}
