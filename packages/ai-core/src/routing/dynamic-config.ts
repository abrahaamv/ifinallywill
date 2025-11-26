/**
 * Phase 12 Week 3 Days 3-5: Dynamic Model Configuration
 * Optimize temperature and max_tokens based on query type and tier
 */

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
}

export type QueryComplexity =
  | 'factual'
  | 'how_to'
  | 'troubleshooting'
  | 'complex_explanation';

export type ModelTier = 'tier1' | 'tier2' | 'tier3';

/**
 * Get optimal model configuration for query
 * Balances cost (via max_tokens) and quality (via temperature)
 */
export function getModelConfigForQuery(
  tier: ModelTier,
  complexity: QueryComplexity
): ModelConfig {
  // Temperature by tier
  const temperatureByTier: Record<ModelTier, number> = {
    tier1: 0.1, // Maximize consistency for simple queries
    tier2: 0.2, // Structured troubleshooting
    tier3: 0.3, // Creative problem-solving
  };

  // Max tokens by complexity
  const maxTokensByComplexity: Record<QueryComplexity, number> = {
    factual: 128, // "What's my account balance?"
    how_to: 512, // "How do I configure SSO?"
    troubleshooting: 768, // Multi-step diagnostic guidance
    complex_explanation: 1024, // In-depth technical explanations
  };

  return {
    temperature: temperatureByTier[tier],
    maxTokens: maxTokensByComplexity[complexity],
    topP: 0.9,
    topK: tier === 'tier1' ? 50 : undefined, // Only for Gemini
  };
}

/**
 * Classify query complexity for optimal token allocation
 * Reduces cost by limiting max_tokens for simple queries
 */
export function classifyQueryComplexity(query: string): QueryComplexity {
  const lowerQuery = query.toLowerCase();

  // Factual patterns (simple lookups)
  if (
    /^(what|who|when|where|which)\b/.test(lowerQuery) &&
    query.split(' ').length < 10
  ) {
    return 'factual';
  }

  // How-to patterns (procedural instructions)
  if (
    lowerQuery.startsWith('how do i') ||
    lowerQuery.startsWith('how can i') ||
    lowerQuery.startsWith('how to')
  ) {
    return 'how_to';
  }

  // Troubleshooting patterns (diagnostic guidance)
  if (/not working|issue|problem|error|broken|can't|unable to/.test(lowerQuery)) {
    return 'troubleshooting';
  }

  // Default to complex explanation
  return 'complex_explanation';
}

/**
 * Determine tier from complexity score
 * Maps complexity analyzer output to routing tier
 */
export function determineTierFromComplexity(complexityScore: number): ModelTier {
  if (complexityScore < 0.4) return 'tier1';
  if (complexityScore < 0.7) return 'tier2';
  return 'tier3';
}
