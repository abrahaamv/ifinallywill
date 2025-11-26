/**
 * Phase 12 Week 3 Days 6-7: Cascading Router with Confidence Thresholds
 * Automatically escalate to higher tier when confidence <0.8
 */

import { createModuleLogger } from '@platform/shared';
import type { AICompletionRequest, AICompletionResponse } from '../types';
import type { ModelTier } from './dynamic-config';

const logger = createModuleLogger('cascading-router');

export interface CompletionWithConfidence extends AICompletionResponse {
  confidence: number;
  tier: ModelTier;
  attempts: number;
}

export interface CascadingConfig {
  confidenceThreshold: number;
  maxTier: ModelTier;
  enableAutoEscalation: boolean;
}

const DEFAULT_CONFIG: CascadingConfig = {
  confidenceThreshold: 0.8,
  maxTier: 'tier3',
  enableAutoEscalation: true,
};

/**
 * Execute completion with cascading tier escalation
 * Starts with tier1, escalates to tier2/tier3 if confidence <0.8
 */
export async function completeWithCascading(
  completeFunction: (
    request: AICompletionRequest & { tier?: ModelTier }
  ) => Promise<AICompletionResponse>,
  request: AICompletionRequest,
  config: Partial<CascadingConfig> = {}
): Promise<CompletionWithConfidence> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { confidenceThreshold, maxTier, enableAutoEscalation } = finalConfig;

  const tierOrder: ModelTier[] = ['tier1', 'tier2', 'tier3'];
  const maxTierIndex = tierOrder.indexOf(maxTier);

  for (let attempt = 0; attempt <= maxTierIndex; attempt++) {
    const currentTier = tierOrder[attempt]!; // Safe: attempt is within bounds

    logger.info(`Attempt ${attempt + 1}: Using ${currentTier}`);

    try {
      // Generate completion with current tier
      const response = await completeFunction({
        ...request,
        tier: currentTier,
      });

      // Estimate confidence
      const confidence = await estimateConfidence(response, request.messages);

      logger.info(`${currentTier} confidence: ${confidence.toFixed(2)}`);

      // Check if confidence meets threshold
      if (confidence >= confidenceThreshold) {
        return {
          ...response,
          confidence,
          tier: currentTier,
          attempts: attempt + 1,
        };
      }

      // Low confidence - escalate to next tier if enabled
      if (enableAutoEscalation && attempt < maxTierIndex) {
        logger.warn(
          `Confidence ${confidence.toFixed(2)} below threshold ${confidenceThreshold}, escalating to ${tierOrder[attempt + 1]}`
        );
        continue;
      }

      // Already at max tier or escalation disabled - return with disclaimer
      return {
        ...response,
        content: addLowConfidenceDisclaimer(response.content, confidence),
        confidence,
        tier: currentTier,
        attempts: attempt + 1,
      };
    } catch (error) {
      logger.error(`${currentTier} failed:`, error);
      if (attempt < maxTierIndex) {
        logger.warn(`Attempting ${tierOrder[attempt + 1]} after ${currentTier} failure`);
        continue; // Try next tier
      }
      throw error; // All tiers failed
    }
  }

  throw new Error('All routing tiers exhausted');
}

/**
 * Estimate confidence in completion response
 * Uses multiple methods with fallback strategy
 */
async function estimateConfidence(
  response: AICompletionResponse,
  _messages: Array<{ role: string; content: string }>
): Promise<number> {
  // Method 1: Use logprobs if available (GPT-4, some Claude models)
  if ('logprobs' in response && response.logprobs) {
    const logprobs = response.logprobs as number[];
    const avgLogProb =
      logprobs.reduce((sum, lp) => sum + Math.exp(lp), 0) / logprobs.length;
    return avgLogProb;
  }

  // Method 2: Heuristic-based confidence (primary method)
  return estimateConfidenceHeuristic(response);
}

/**
 * Heuristic-based confidence estimation
 * Analyzes response characteristics for confidence indicators
 */
function estimateConfidenceHeuristic(response: AICompletionResponse): number {
  let confidence = 0.7; // Base confidence

  const lowerResponse = response.content.toLowerCase();

  // Decrease confidence for uncertainty phrases
  const uncertaintyPhrases = [
    "i'm not sure",
    "i don't know",
    'might be',
    'possibly',
    'perhaps',
    'unclear',
    'unsure',
    'not certain',
    'could be',
  ];
  const uncertaintyCount = uncertaintyPhrases.filter((phrase) =>
    lowerResponse.includes(phrase)
  ).length;
  confidence -= uncertaintyCount * 0.1;

  // Increase confidence for specific citations
  const citationCount = (response.content.match(/\[\d+\]/g) || []).length;
  confidence += Math.min(citationCount * 0.05, 0.15);

  // Decrease confidence for very short responses (may be incomplete)
  if (response.content.length < 100) {
    confidence -= 0.1;
  }

  // Increase confidence for structured responses
  if (
    response.content.includes('\n\n') ||
    response.content.includes('- ') ||
    response.content.includes('1.')
  ) {
    confidence += 0.05;
  }

  // Decrease confidence for hedging language
  const hedgePhrases = [
    'it depends',
    'in some cases',
    'typically',
    'usually',
    'generally',
  ];
  const hedgeCount = hedgePhrases.filter((phrase) =>
    lowerResponse.includes(phrase)
  ).length;
  confidence -= hedgeCount * 0.03;

  return Math.max(0.1, Math.min(confidence, 1.0));
}

/**
 * Add low confidence disclaimer to response
 * Informs users when AI is uncertain
 */
function addLowConfidenceDisclaimer(content: string, confidence: number): string {
  if (confidence < 0.7) {
    return `${content}\n\n⚠️ **Note**: This information is based on our current documentation, but I'm not fully confident in this answer. If this doesn't resolve your issue, please let me know and I'll escalate to a specialist.`;
  }

  if (confidence < 0.8) {
    return `${content}\n\n**Note**: This information is based on our current documentation. If this doesn't resolve your issue, please let me know and I'll escalate to a specialist.`;
  }

  return content;
}
