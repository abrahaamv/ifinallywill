/**
 * Complexity Analysis for Smart AI Routing
 * Analyzes message complexity to route to appropriate model tier
 */

import type { Message, ComplexityAnalysis } from './types';

/**
 * Analyze message complexity for routing decisions
 * Returns score 0-1 (higher = more complex)
 */
export function analyzeComplexity(messages: Message[]): ComplexityAnalysis {
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage?.content || '';

  // Factor 1: Message length (longer = potentially more complex)
  const messageLength = content.length;
  const lengthScore = Math.min(messageLength / 2000, 1); // Normalize to 0-1

  // Factor 2: Context complexity (conversation depth)
  const contextComplexity = Math.min(messages.length / 20, 1); // Normalize to 0-1

  // Factor 3: Requires reasoning keywords
  const reasoningKeywords = [
    'analyze', 'explain', 'compare', 'evaluate', 'why', 'how',
    'reasoning', 'logic', 'think', 'consider', 'implications',
    'consequences', 'strategy', 'approach', 'methodology'
  ];
  const requiresReasoning = reasoningKeywords.some(keyword =>
    content.toLowerCase().includes(keyword)
  );

  // Factor 4: Requires creativity keywords
  const creativityKeywords = [
    'create', 'design', 'generate', 'write', 'compose', 'draft',
    'brainstorm', 'ideas', 'innovative', 'creative', 'imagine',
    'suggest', 'propose', 'develop'
  ];
  const requiresCreativity = creativityKeywords.some(keyword =>
    content.toLowerCase().includes(keyword)
  );

  // Simple queries (factual, short)
  const simplePatterns = [
    /^(what|when|where|who|which) (is|are|was|were)/i,
    /^(yes|no|true|false|maybe)/i,
    /^(define|definition|meaning of)/i,
  ];
  const isSimpleQuery = simplePatterns.some(pattern => pattern.test(content.trim()));

  // Calculate weighted complexity score
  let score = 0;

  if (isSimpleQuery) {
    score = 0.2; // Force simple model
  } else {
    // Weighted factors
    score += lengthScore * 0.3;
    score += contextComplexity * 0.2;
    score += (requiresReasoning ? 0.3 : 0);
    score += (requiresCreativity ? 0.2 : 0);
  }

  // Clamp to 0-1
  score = Math.max(0, Math.min(1, score));

  // Generate reasoning
  const factors = [];
  if (lengthScore > 0.5) factors.push('long message');
  if (contextComplexity > 0.5) factors.push('deep conversation');
  if (requiresReasoning) factors.push('requires reasoning');
  if (requiresCreativity) factors.push('requires creativity');
  if (isSimpleQuery) factors.push('simple factual query');

  const reasoning = factors.length > 0
    ? `Complexity factors: ${factors.join(', ')}`
    : 'Standard complexity';

  return {
    score,
    reasoning,
    factors: {
      messageLength,
      contextComplexity,
      requiresReasoning,
      requiresCreativity,
    },
  };
}

/**
 * Determine if message should use mini model
 */
export function shouldUseMiniModel(complexity: ComplexityAnalysis): boolean {
  return complexity.score < 0.7;
}

/**
 * Determine if message requires vision model
 */
export function requiresVisionModel(messages: Message[]): boolean {
  // Check for image attachments or vision-related keywords
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage?.content || '';

  const visionKeywords = [
    'image', 'picture', 'photo', 'screenshot', 'diagram',
    'visual', 'see', 'look at', 'show me', 'what\'s in'
  ];

  return visionKeywords.some(keyword =>
    content.toLowerCase().includes(keyword)
  );
}
