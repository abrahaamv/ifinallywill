/**
 * Phase 12 Week 4 Days 4-7: A/B Testing Framework
 * Systematic testing of prompt and configuration improvements
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('ABTesting');

export type VariantId = 'control' | 'treatment_a' | 'treatment_b' | 'treatment_c';

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  variants: ABTestVariant[];
  metrics: string[];
  targetMetric: string; // Primary metric for determining winner
}

export interface ABTestVariant {
  id: VariantId;
  name: string;
  weight: number; // 0.0-1.0, should sum to 1.0
  config: Record<string, any>; // Variant-specific configuration
}

export interface ABTestAssignment {
  sessionId: string;
  testId: string;
  variantId: VariantId;
  assignedAt: Date;
}

export interface VariantMetrics {
  variantId: VariantId;
  sessions: number;
  conversions: number;
  conversionRate: number;
  avgResponseTime: number;
  avgQualityScore: number;
  metrics: Record<string, number>;
}

export interface ABTestResults {
  testId: string;
  testName: string;
  totalSessions: number;
  variants: VariantMetrics[];
  winner?: VariantId;
  statisticalSignificance: {
    isSignificant: boolean;
    pValue: number;
    confidenceLevel: number;
  };
  recommendation: string;
}

/**
 * A/B Testing Service
 * Manages variant assignment and results analysis
 */
export class ABTestingService {
  private activeTests: Map<string, ABTestConfig> = new Map();
  private assignments: Map<string, Map<string, VariantId>> = new Map(); // sessionId -> testId -> variantId

  /**
   * Register a new A/B test
   */
  registerTest(config: ABTestConfig): void {
    // Validate weights sum to 1.0
    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(
        `Variant weights must sum to 1.0, got ${totalWeight.toFixed(3)}`
      );
    }

    // Validate dates
    if (config.endDate && config.endDate < config.startDate) {
      throw new Error('End date must be after start date');
    }

    this.activeTests.set(config.id, config);
    logger.info(`Registered A/B test: ${config.name} (${config.id})`, {
      variants: config.variants.length,
      metrics: config.metrics,
    });
  }

  /**
   * Assign variant to session
   * Uses consistent hashing for stable assignments
   */
  assignVariant(sessionId: string, testId: string): VariantId {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    // Check if test is active
    const now = new Date();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      logger.warn(`Test ${testId} is not active`, {
        now: now.toISOString(),
        start: test.startDate.toISOString(),
        end: test.endDate?.toISOString(),
      });
      return 'control'; // Return control when test inactive
    }

    // Check for existing assignment
    const existing = this.getAssignment(sessionId, testId);
    if (existing) {
      return existing;
    }

    // Assign variant based on weights
    const variant = this.selectVariant(sessionId, test);
    this.storeAssignment(sessionId, testId, variant.id);

    logger.debug(`Assigned variant ${variant.id} to session ${sessionId}`, {
      testId,
      testName: test.name,
    });

    return variant.id;
  }

  /**
   * Get variant configuration for session
   */
  getVariantConfig(sessionId: string, testId: string): Record<string, any> {
    const variantId = this.assignVariant(sessionId, testId);
    const test = this.activeTests.get(testId);
    const variant = test?.variants.find((v) => v.id === variantId);
    return variant?.config || {};
  }

  /**
   * Select variant using consistent hashing
   */
  private selectVariant(
    sessionId: string,
    test: ABTestConfig
  ): ABTestVariant {
    // Use hash of sessionId + testId for deterministic assignment
    const hash = this.hashString(`${sessionId}-${test.id}`);
    const random = hash / 0xffffffff; // Normalize to 0-1

    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random < cumulativeWeight) {
        return variant;
      }
    }

    // Fallback (should never reach here)
    return test.variants[0];
  }

  /**
   * Simple hash function for consistent assignment
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
   * Get existing assignment
   */
  private getAssignment(sessionId: string, testId: string): VariantId | null {
    const testAssignments = this.assignments.get(sessionId);
    return testAssignments?.get(testId) || null;
  }

  /**
   * Store assignment
   */
  private storeAssignment(
    sessionId: string,
    testId: string,
    variantId: VariantId
  ): void {
    if (!this.assignments.has(sessionId)) {
      this.assignments.set(sessionId, new Map());
    }
    this.assignments.get(sessionId)!.set(testId, variantId);

    // TODO: Persist to database
    // await db.insert(abTestAssignments).values({
    //   sessionId,
    //   testId,
    //   variantId,
    //   assignedAt: new Date(),
    // });
  }

  /**
   * Calculate test results
   * Determines winner using statistical significance
   */
  async calculateTestResults(testId: string): Promise<ABTestResults> {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    // TODO: Query real metrics from database
    // For now, return mock structure
    const variants: VariantMetrics[] = test.variants.map((variant) => ({
      variantId: variant.id,
      sessions: 0,
      conversions: 0,
      conversionRate: 0,
      avgResponseTime: 0,
      avgQualityScore: 0,
      metrics: {},
    }));

    // Calculate statistical significance
    const significance = this.calculateSignificance(variants, test.targetMetric);

    // Determine winner
    const winner = significance.isSignificant
      ? this.determineWinner(variants, test.targetMetric)
      : undefined;

    return {
      testId,
      testName: test.name,
      totalSessions: variants.reduce((sum, v) => sum + v.sessions, 0),
      variants,
      winner,
      statisticalSignificance: significance,
      recommendation: this.generateRecommendation(variants, significance, winner),
    };
  }

  /**
   * Calculate statistical significance using chi-square test
   */
  private calculateSignificance(
    variants: VariantMetrics[],
    targetMetric: string
  ): {
    isSignificant: boolean;
    pValue: number;
    confidenceLevel: number;
  } {
    // Simplified chi-square test
    // TODO: Implement proper statistical test

    const controlVariant = variants.find((v) => v.variantId === 'control');
    if (!controlVariant || variants.length < 2) {
      return { isSignificant: false, pValue: 1.0, confidenceLevel: 0 };
    }

    // For now, return mock values
    // Real implementation would calculate chi-square statistic
    return {
      isSignificant: false,
      pValue: 0.15,
      confidenceLevel: 0.85,
    };
  }

  /**
   * Determine winner based on target metric
   */
  private determineWinner(
    variants: VariantMetrics[],
    targetMetric: string
  ): VariantId | undefined {
    if (variants.length === 0) return undefined;

    // Find variant with best performance on target metric
    const sorted = [...variants].sort((a, b) => {
      const aValue = a.metrics[targetMetric] || 0;
      const bValue = b.metrics[targetMetric] || 0;
      return bValue - aValue; // Descending order
    });

    return sorted[0].variantId;
  }

  /**
   * Generate recommendation based on results
   */
  private generateRecommendation(
    variants: VariantMetrics[],
    significance: { isSignificant: boolean; pValue: number },
    winner?: VariantId
  ): string {
    if (!significance.isSignificant) {
      return 'Continue test - results not yet statistically significant. Need more data to make a confident decision.';
    }

    if (winner === 'control') {
      return 'Control variant is performing best. No changes recommended at this time.';
    }

    if (winner) {
      const winnerVariant = variants.find((v) => v.variantId === winner);
      return `${winner} is the winner with ${((significance.pValue < 0.05 ? 95 : 90))}% confidence. Recommend rolling out this variant to all users.`;
    }

    return 'Inconclusive results. Consider extending test duration or adjusting variant configurations.';
  }

  /**
   * Get active tests
   */
  getActiveTests(): ABTestConfig[] {
    const now = new Date();
    return Array.from(this.activeTests.values()).filter(
      (test) => now >= test.startDate && (!test.endDate || now <= test.endDate)
    );
  }

  /**
   * Stop test
   */
  stopTest(testId: string): void {
    const test = this.activeTests.get(testId);
    if (test) {
      test.endDate = new Date();
      logger.info(`Stopped A/B test: ${test.name}`);
    }
  }
}

/**
 * Create A/B testing service singleton
 */
export const abTestingService = new ABTestingService();
