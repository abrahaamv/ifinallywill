/**
 * Phase 12 Week 2: Confidence Threshold Routing
 * Adaptive model selection based on response confidence
 */

import { createModuleLogger } from '@platform/shared';
import type { ModelConfig } from './cascading-fallback';

const logger = createModuleLogger('ConfidenceThreshold');

export interface ConfidenceMetrics {
  score: number; // 0.0-1.0
  indicators: {
    uncertainty: number; // Hedging language (maybe, possibly)
    specificity: number; // Concrete details vs vague statements
    consistency: number; // Internal coherence
    factuality: number; // Verifiable claims
  };
  requiresEscalation: boolean;
  reasoning: string;
}

export interface ThresholdConfig {
  minAcceptable: number; // Below this, auto-escalate
  targetConfidence: number; // Ideal confidence level
  escalationTiers: Array<{
    threshold: number;
    action: 'accept' | 'escalate' | 'retry';
  }>;
}

/**
 * Confidence Threshold Manager
 *
 * Analyzes AI responses for confidence and determines if escalation is needed:
 * 1. Parse response for uncertainty markers
 * 2. Calculate confidence score
 * 3. Compare against thresholds
 * 4. Recommend escalation if needed
 */
export class ConfidenceThresholdManager {
  private uncertaintyMarkers = [
    'maybe',
    'possibly',
    'might',
    'could',
    'perhaps',
    'likely',
    'probably',
    'seems',
    'appears',
    'may',
    'uncertain',
    'not sure',
    'unclear',
    "don't know",
    'cannot confirm',
  ];

  private hedgingPhrases = [
    'i think',
    'i believe',
    'in my opinion',
    'it seems',
    'it appears',
    'as far as i know',
    'to my understanding',
    'from what i can tell',
  ];

  private confidenceIndicators = [
    'definitely',
    'certainly',
    'absolutely',
    'clearly',
    'specifically',
    'exactly',
    'precisely',
    'confirmed',
    'verified',
  ];

  private defaultConfig: ThresholdConfig = {
    minAcceptable: 0.7, // Below 70%, escalate
    targetConfidence: 0.85, // Target 85% confidence
    escalationTiers: [
      { threshold: 0.9, action: 'accept' }, // >90%: Accept immediately
      { threshold: 0.7, action: 'accept' }, // 70-90%: Accept
      { threshold: 0.5, action: 'retry' }, // 50-70%: Retry with same model
      { threshold: 0.0, action: 'escalate' }, // <50%: Escalate to better model
    ],
  };

  /**
   * Analyze response confidence
   */
  analyzeConfidence(response: string, config?: Partial<ThresholdConfig>): ConfidenceMetrics {
    const thresholds = { ...this.defaultConfig, ...config };
    const normalized = response.toLowerCase();

    // Calculate individual indicators
    const uncertainty = this.calculateUncertainty(normalized);
    const specificity = this.calculateSpecificity(response);
    const consistency = this.calculateConsistency(normalized);
    const factuality = this.calculateFactuality(response);

    // Weighted confidence score
    const score =
      uncertainty * 0.3 + // Uncertainty penalty
      specificity * 0.3 + // Specificity bonus
      consistency * 0.2 + // Consistency check
      factuality * 0.2; // Factual grounding

    // Determine action
    let requiresEscalation = false;
    let reasoning = '';

    for (const tier of thresholds.escalationTiers) {
      if (score >= tier.threshold) {
        if (tier.action === 'escalate') {
          requiresEscalation = true;
          reasoning = `Low confidence (${(score * 100).toFixed(1)}%) requires escalation to more powerful model`;
        } else if (tier.action === 'retry') {
          reasoning = `Moderate confidence (${(score * 100).toFixed(1)}%) suggests retry with better prompt`;
        } else {
          reasoning = `Acceptable confidence (${(score * 100).toFixed(1)}%)`;
        }
        break;
      }
    }

    logger.info('Confidence analysis complete', {
      score: score.toFixed(3),
      requiresEscalation,
      indicators: {
        uncertainty: uncertainty.toFixed(3),
        specificity: specificity.toFixed(3),
        consistency: consistency.toFixed(3),
        factuality: factuality.toFixed(3),
      },
    });

    return {
      score,
      indicators: {
        uncertainty,
        specificity,
        consistency,
        factuality,
      },
      requiresEscalation,
      reasoning,
    };
  }

  /**
   * Calculate uncertainty penalty (0.0-1.0)
   * Lower score = more uncertain
   */
  private calculateUncertainty(text: string): number {
    let uncertaintyCount = 0;

    // Count uncertainty markers
    for (const marker of this.uncertaintyMarkers) {
      const regex = new RegExp(`\\b${marker}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        uncertaintyCount += matches.length;
      }
    }

    // Count hedging phrases
    for (const phrase of this.hedgingPhrases) {
      if (text.includes(phrase)) {
        uncertaintyCount += 2; // Phrases weighted higher
      }
    }

    // Penalty: more uncertainty = lower score
    const penalty = Math.min(uncertaintyCount * 0.1, 0.5);
    return Math.max(0, 1.0 - penalty);
  }

  /**
   * Calculate specificity score (0.0-1.0)
   * Higher score = more specific
   */
  private calculateSpecificity(text: string): number {
    let specificityScore = 0.5; // Base score

    // Presence of numbers/dates (specific)
    const numberMatches = text.match(/\b\d+(\.\d+)?\b/g);
    if (numberMatches && numberMatches.length > 0) {
      specificityScore += Math.min(numberMatches.length * 0.05, 0.2);
    }

    // Code snippets (very specific)
    if (text.includes('```') || text.includes('`')) {
      specificityScore += 0.15;
    }

    // Citations/references (specific)
    const citationMatches = text.match(/\[\d+\]|\[source\]|\[ref\]/gi);
    if (citationMatches && citationMatches.length > 0) {
      specificityScore += Math.min(citationMatches.length * 0.05, 0.15);
    }

    // Confidence indicators
    const normalized = text.toLowerCase();
    for (const indicator of this.confidenceIndicators) {
      if (normalized.includes(indicator)) {
        specificityScore += 0.03;
      }
    }

    // Vague terms (penalty)
    const vagueTerms = ['thing', 'stuff', 'something', 'somehow', 'kind of'];
    for (const term of vagueTerms) {
      if (normalized.includes(term)) {
        specificityScore -= 0.05;
      }
    }

    return Math.max(0, Math.min(specificityScore, 1.0));
  }

  /**
   * Calculate consistency score (0.0-1.0)
   * Checks for contradictions and coherence
   */
  private calculateConsistency(text: string): number {
    let consistencyScore = 0.8; // Assume consistent unless proven otherwise

    // Contradiction markers
    const contradictions = [
      'however', // Not always contradiction, but hedges
      'but',
      'although',
      'on the other hand',
      'conversely',
      'in contrast',
    ];

    let contradictionCount = 0;
    for (const marker of contradictions) {
      if (text.includes(marker)) {
        contradictionCount++;
      }
    }

    // Moderate contradictions acceptable (nuance), excessive suggests confusion
    if (contradictionCount > 3) {
      consistencyScore -= 0.2;
    }

    // Self-correction indicators (suggests initial uncertainty)
    const corrections = ['actually', 'rather', 'correction', 'more accurately'];
    for (const correction of corrections) {
      if (text.includes(correction)) {
        consistencyScore -= 0.1;
      }
    }

    return Math.max(0, Math.min(consistencyScore, 1.0));
  }

  /**
   * Calculate factuality score (0.0-1.0)
   * Estimates verifiable/factual content
   */
  private calculateFactuality(text: string): number {
    let factualityScore = 0.5; // Neutral baseline

    // Citations/sources (high factuality)
    const citations = text.match(/\[\d+\]|\[source\]|according to|research shows|studies indicate/gi);
    if (citations && citations.length > 0) {
      factualityScore += Math.min(citations.length * 0.1, 0.3);
    }

    // Specific data points
    const dataPoints = text.match(/\b\d+%|\b\d+\s*(users|customers|responses|instances)\b/gi);
    if (dataPoints && dataPoints.length > 0) {
      factualityScore += Math.min(dataPoints.length * 0.05, 0.2);
    }

    // Opinion indicators (lower factuality)
    const opinionMarkers = ['i think', 'i believe', 'in my opinion', 'personally'];
    for (const marker of opinionMarkers) {
      if (text.toLowerCase().includes(marker)) {
        factualityScore -= 0.1;
      }
    }

    return Math.max(0, Math.min(factualityScore, 1.0));
  }

  /**
   * Recommend action based on confidence
   */
  recommendAction(
    confidence: ConfidenceMetrics,
    currentModel: ModelConfig
  ): {
    action: 'accept' | 'retry' | 'escalate';
    reasoning: string;
    suggestedTier?: string;
  } {
    if (confidence.score >= 0.85) {
      return {
        action: 'accept',
        reasoning: 'High confidence response, acceptable quality',
      };
    }

    if (confidence.score >= 0.7) {
      if (currentModel.tier === 'fast') {
        return {
          action: 'escalate',
          reasoning: 'Moderate confidence from fast model, escalate to balanced tier',
          suggestedTier: 'balanced',
        };
      }
      return {
        action: 'accept',
        reasoning: 'Moderate confidence from balanced/powerful model is acceptable',
      };
    }

    if (confidence.score >= 0.5) {
      return {
        action: 'retry',
        reasoning: 'Low confidence, retry with improved prompt before escalating',
      };
    }

    return {
      action: 'escalate',
      reasoning: 'Very low confidence, escalate to more powerful model',
      suggestedTier: currentModel.tier === 'fast' ? 'balanced' : 'powerful',
    };
  }

  /**
   * Track confidence trends over conversation
   */
  trackTrends(
    conversationHistory: Array<{ response: string; confidence: number }>
  ): {
    trend: 'improving' | 'declining' | 'stable';
    avgConfidence: number;
    recommendation: string;
  } {
    if (conversationHistory.length < 3) {
      return {
        trend: 'stable',
        avgConfidence: conversationHistory[0]?.confidence || 0.5,
        recommendation: 'Insufficient data for trend analysis',
      };
    }

    const recent = conversationHistory.slice(-3);
    const avgConfidence = recent.reduce((sum, item) => sum + item.confidence, 0) / recent.length;

    const firstConfidence = recent[0]?.confidence || 0;
    const lastConfidence = recent[recent.length - 1]?.confidence || 0;
    const delta = lastConfidence - firstConfidence;

    let trend: 'improving' | 'declining' | 'stable';
    let recommendation: string;

    if (delta > 0.1) {
      trend = 'improving';
      recommendation = 'Model performance improving, continue current approach';
    } else if (delta < -0.1) {
      trend = 'declining';
      recommendation = 'Model performance declining, consider escalating or changing approach';
    } else {
      trend = 'stable';
      recommendation = 'Model performance stable';
    }

    logger.info('Confidence trend analysis', {
      trend,
      avgConfidence: avgConfidence.toFixed(3),
      delta: delta.toFixed(3),
    });

    return {
      trend,
      avgConfidence,
      recommendation,
    };
  }
}

/**
 * Create a confidence threshold manager instance
 */
export function createConfidenceManager(): ConfidenceThresholdManager {
  return new ConfidenceThresholdManager();
}
