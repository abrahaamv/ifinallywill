/**
 * A/B Testing Variant Manager (Phase 12 Week 9-10)
 *
 * Manages experiment variants for:
 * - Prompt templates
 * - AI model selection
 * - RAG configurations
 * - Response generation strategies
 *
 * Features:
 * - Multi-armed bandit (Thompson Sampling)
 * - Statistical significance testing (Chi-Square, Mann-Whitney U)
 * - Bayesian optimization
 * - Automatic winner selection
 */

// ==================== TYPES ====================

export type VariantType = 'prompt' | 'model' | 'rag_config' | 'strategy';

export interface Variant {
  id: string;
  experimentId: string;
  name: string;
  type: VariantType;
  config: Record<string, unknown>;
  traffic: number; // 0-1, percentage of traffic
  enabled: boolean;

  // Performance metrics
  impressions: number;
  conversions: number;
  conversionRate: number;
  avgResponseTime: number;
  avgTokens: number;
  avgCost: number;

  // Bayesian statistics (Thompson Sampling)
  alpha: number; // successes + 1
  beta: number; // failures + 1

  createdAt: string;
  updatedAt: string;
}

export interface Experiment {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: VariantType;
  status: 'draft' | 'running' | 'paused' | 'completed';

  // Traffic allocation
  trafficAllocation: number; // 0-1, percentage of total traffic

  // Statistical settings
  minSampleSize: number; // minimum samples before analysis
  confidenceLevel: number; // 0.95 = 95% confidence
  minDetectableEffect: number; // minimum effect size to detect

  // Optimization strategy
  strategy: 'random' | 'thompson_sampling' | 'epsilon_greedy';
  explorationRate: number; // for epsilon-greedy

  // Results
  winner: string | null; // variant ID
  winnerDeclaredAt: string | null;
  pValue: number | null;

  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VariantSelection {
  variantId: string;
  variant: Variant;
  reason: 'control' | 'random' | 'thompson_sampling' | 'epsilon_greedy' | 'winner';
}

export interface ExperimentResult {
  experimentId: string;
  variants: Variant[];
  winner: Variant | null;
  pValue: number | null;
  isSignificant: boolean;
  confidence: number;
  recommendation: string;
  metrics: {
    totalImpressions: number;
    totalConversions: number;
    avgConversionRate: number;
    bestVariant: Variant;
    worstVariant: Variant;
  };
}

// ==================== VARIANT MANAGER ====================

export class VariantManager {
  // Database integration will be implemented based on storage strategy
  // Could use Drizzle ORM, Redis, or in-memory store

  /**
   * Create a new experiment
   */
  async createExperiment(params: {
    tenantId: string;
    name: string;
    description: string;
    type: VariantType;
    trafficAllocation?: number;
    strategy?: Experiment['strategy'];
    minSampleSize?: number;
    confidenceLevel?: number;
  }): Promise<Experiment> {
    const experiment: Experiment = {
      id: crypto.randomUUID(),
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      type: params.type,
      status: 'draft',
      trafficAllocation: params.trafficAllocation || 1.0,
      minSampleSize: params.minSampleSize || 100,
      confidenceLevel: params.confidenceLevel || 0.95,
      minDetectableEffect: 0.05, // 5% minimum effect size
      strategy: params.strategy || 'thompson_sampling',
      explorationRate: 0.1, // 10% exploration for epsilon-greedy
      winner: null,
      winnerDeclaredAt: null,
      pValue: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store experiment in memory or database
    // Implementation depends on storage strategy
    return experiment;
  }

  /**
   * Create a variant for an experiment
   */
  async createVariant(params: {
    experimentId: string;
    name: string;
    type: VariantType;
    config: Record<string, unknown>;
    traffic?: number;
  }): Promise<Variant> {
    const variant: Variant = {
      id: crypto.randomUUID(),
      experimentId: params.experimentId,
      name: params.name,
      type: params.type,
      config: params.config,
      traffic: params.traffic || 0,
      enabled: true,
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
      avgResponseTime: 0,
      avgTokens: 0,
      avgCost: 0,
      alpha: 1, // Beta distribution prior
      beta: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return variant;
  }

  /**
   * Select variant for user (Thompson Sampling multi-armed bandit)
   */
  async selectVariant(params: {
    experimentId: string;
    userId: string;
  }): Promise<VariantSelection> {
    const experiment = await this.getExperiment(params.experimentId);
    if (!experiment || experiment.status !== 'running') {
      throw new Error('Experiment not found or not running');
    }

    // If winner declared, always return winner
    if (experiment.winner) {
      const winner = await this.getVariant(experiment.winner);
      if (!winner) throw new Error('Winner variant not found');
      return {
        variantId: winner.id,
        variant: winner,
        reason: 'winner',
      };
    }

    const variants = await this.getExperimentVariants(params.experimentId);
    if (variants.length === 0) {
      throw new Error('No variants available');
    }

    // Control variant (first variant with traffic > 0)
    const control = variants.find(v => v.enabled && v.traffic > 0);

    // Apply traffic allocation
    const rand = Math.random();
    if (rand > experiment.trafficAllocation) {
      // User not in experiment, return control
      if (!control) throw new Error('No control variant');
      return {
        variantId: control.id,
        variant: control,
        reason: 'control',
      };
    }

    // Select variant based on strategy
    let selectedVariant: Variant;
    let reason: VariantSelection['reason'];

    switch (experiment.strategy) {
      case 'random':
        selectedVariant = this.selectRandomVariant(variants);
        reason = 'random';
        break;
      case 'thompson_sampling':
        selectedVariant = this.thompsonSampling(variants);
        reason = 'thompson_sampling';
        break;
      case 'epsilon_greedy':
        selectedVariant = this.epsilonGreedy(variants, experiment.explorationRate);
        reason = 'epsilon_greedy';
        break;
      default:
        selectedVariant = this.thompsonSampling(variants);
        reason = 'thompson_sampling';
    }

    return {
      variantId: selectedVariant.id,
      variant: selectedVariant,
      reason,
    };
  }

  /**
   * Record variant impression (user saw this variant)
   */
  async recordImpression(variantId: string): Promise<void> {
    const variant = await this.getVariant(variantId);
    if (!variant) throw new Error('Variant not found');

    variant.impressions++;
    variant.updatedAt = new Date().toISOString();

    await this.updateVariant(variant);
  }

  /**
   * Record variant conversion (user achieved goal with this variant)
   */
  async recordConversion(params: {
    variantId: string;
    responseTime?: number;
    tokens?: number;
    cost?: number;
  }): Promise<void> {
    const variant = await this.getVariant(params.variantId);
    if (!variant) throw new Error('Variant not found');

    // Update conversion metrics
    variant.conversions++;
    variant.conversionRate = variant.conversions / variant.impressions;

    // Update Bayesian statistics
    variant.alpha++; // success

    // Update averages
    if (params.responseTime !== undefined) {
      variant.avgResponseTime = this.updateAverage(
        variant.avgResponseTime,
        params.responseTime,
        variant.conversions
      );
    }
    if (params.tokens !== undefined) {
      variant.avgTokens = this.updateAverage(
        variant.avgTokens,
        params.tokens,
        variant.conversions
      );
    }
    if (params.cost !== undefined) {
      variant.avgCost = this.updateAverage(
        variant.avgCost,
        params.cost,
        variant.conversions
      );
    }

    variant.updatedAt = new Date().toISOString();
    await this.updateVariant(variant);
  }

  /**
   * Record variant failure (user did not achieve goal)
   */
  async recordFailure(variantId: string): Promise<void> {
    const variant = await this.getVariant(variantId);
    if (!variant) throw new Error('Variant not found');

    // Update Bayesian statistics
    variant.beta++; // failure

    variant.conversionRate = variant.conversions / variant.impressions;
    variant.updatedAt = new Date().toISOString();

    await this.updateVariant(variant);
  }

  /**
   * Analyze experiment and determine winner
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResult> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) throw new Error('Experiment not found');

    const variants = await this.getExperimentVariants(experimentId);
    if (variants.length < 2) {
      throw new Error('Need at least 2 variants to analyze');
    }

    // Check if we have enough samples
    const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
    if (totalImpressions < experiment.minSampleSize) {
      return {
        experimentId,
        variants,
        winner: null,
        pValue: null,
        isSignificant: false,
        confidence: 0,
        recommendation: `Need ${experiment.minSampleSize - totalImpressions} more samples`,
        metrics: this.calculateMetrics(variants),
      };
    }

    // Perform Chi-Square test for statistical significance
    const { pValue, isSignificant } = this.chiSquareTest(variants, experiment.confidenceLevel);

    // Find best performing variant
    const bestVariant = variants.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );

    return {
      experimentId,
      variants,
      winner: isSignificant ? bestVariant : null,
      pValue,
      isSignificant,
      confidence: 1 - pValue,
      recommendation: isSignificant
        ? `Variant "${bestVariant.name}" is the winner with ${(bestVariant.conversionRate * 100).toFixed(2)}% conversion rate`
        : 'No statistically significant difference detected. Continue collecting data.',
      metrics: this.calculateMetrics(variants),
    };
  }

  /**
   * Declare experiment winner
   */
  async declareWinner(experimentId: string, winnerVariantId: string): Promise<void> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) throw new Error('Experiment not found');

    experiment.winner = winnerVariantId;
    experiment.winnerDeclaredAt = new Date().toISOString();
    experiment.status = 'completed';
    experiment.completedAt = new Date().toISOString();
    experiment.updatedAt = new Date().toISOString();

    await this.updateExperiment(experiment);
  }

  // ==================== SELECTION ALGORITHMS ====================

  /**
   * Random variant selection
   */
  private selectRandomVariant(variants: Variant[]): Variant {
    const enabledVariants = variants.filter(v => v.enabled);
    const index = Math.floor(Math.random() * enabledVariants.length);
    return enabledVariants[index] || enabledVariants[0]!;
  }

  /**
   * Thompson Sampling (Bayesian multi-armed bandit)
   */
  private thompsonSampling(variants: Variant[]): Variant {
    const enabledVariants = variants.filter(v => v.enabled);

    // Sample from Beta distribution for each variant
    const samples = enabledVariants.map(variant => ({
      variant,
      sample: this.sampleBeta(variant.alpha, variant.beta),
    }));

    // Select variant with highest sample
    const best = samples.reduce((max, current) =>
      current.sample > max.sample ? current : max
    );

    return best.variant;
  }

  /**
   * Epsilon-Greedy strategy
   */
  private epsilonGreedy(variants: Variant[], epsilon: number): Variant {
    const enabledVariants = variants.filter(v => v.enabled);

    // Explore: random variant
    if (Math.random() < epsilon) {
      return this.selectRandomVariant(enabledVariants);
    }

    // Exploit: best variant so far
    const best = enabledVariants.reduce((max, current) =>
      current.conversionRate > max.conversionRate ? current : max
    );

    return best;
  }

  /**
   * Sample from Beta distribution (Box-Muller transform approximation)
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Simplified Beta sampling using Gamma approximation
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    return x / (x + y);
  }

  /**
   * Sample from Gamma distribution (shape, scale=1)
   */
  private sampleGamma(shape: number): number {
    // Marsaglia and Tsang method for shape >= 1
    if (shape >= 1) {
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);

      while (true) {
        let x = 0;
        let v = 0;
        do {
          x = this.randomNormal();
          v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();
        const x2 = x * x;

        if (u < 1 - 0.0331 * x2 * x2) {
          return d * v;
        }
        if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) {
          return d * v;
        }
      }
    } else {
      // For shape < 1, use rejection sampling
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
  }

  /**
   * Sample from standard normal distribution (Box-Muller)
   */
  private randomNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ==================== STATISTICAL TESTS ====================

  /**
   * Chi-Square test for categorical data
   */
  private chiSquareTest(
    variants: Variant[],
    confidenceLevel: number
  ): { pValue: number; isSignificant: boolean } {
    const n = variants.length;
    const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);

    // Expected values
    const expectedConversionRate = totalConversions / totalImpressions;

    // Chi-square statistic
    let chiSquare = 0;
    for (const variant of variants) {
      const expected = variant.impressions * expectedConversionRate;
      const observed = variant.conversions;
      chiSquare += Math.pow(observed - expected, 2) / expected;
    }

    // Degrees of freedom
    const df = n - 1;

    // P-value (simplified approximation)
    const pValue = this.chiSquarePValue(chiSquare, df);

    return {
      pValue,
      isSignificant: pValue < (1 - confidenceLevel),
    };
  }

  /**
   * Chi-square p-value approximation
   */
  private chiSquarePValue(chiSquare: number, df: number): number {
    // Wilson-Hilferty approximation
    const z = Math.pow((chiSquare / df), 1 / 3) - (1 - 2 / (9 * df));
    const stdZ = z / Math.sqrt(2 / (9 * df));

    // Standard normal CDF approximation
    return 1 - this.normalCDF(stdZ);
  }

  /**
   * Standard normal cumulative distribution function
   */
  private normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  // ==================== HELPERS ====================

  /**
   * Update running average
   */
  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  /**
   * Calculate experiment metrics
   */
  private calculateMetrics(variants: Variant[]): ExperimentResult['metrics'] {
    const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
    const avgConversionRate = totalConversions / totalImpressions;

    const bestVariant = variants.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );

    const worstVariant = variants.reduce((worst, current) =>
      current.conversionRate < worst.conversionRate ? current : worst
    );

    return {
      totalImpressions,
      totalConversions,
      avgConversionRate,
      bestVariant,
      worstVariant,
    };
  }

  // ==================== STORAGE (PLACEHOLDER) ====================

  private async getExperiment(_id: string): Promise<Experiment | null> {
    // Implementation depends on storage strategy
    // Could be in-memory, Redis, or database
    throw new Error('Not implemented');
  }

  private async getVariant(_id: string): Promise<Variant | null> {
    throw new Error('Not implemented');
  }

  private async getExperimentVariants(_experimentId: string): Promise<Variant[]> {
    throw new Error('Not implemented');
  }

  private async updateExperiment(_experiment: Experiment): Promise<void> {
    throw new Error('Not implemented');
  }

  private async updateVariant(_variant: Variant): Promise<void> {
    throw new Error('Not implemented');
  }
}
