/**
 * Phase 12 Week 3: Hallucination Reduction
 * Techniques to minimize AI hallucinations and improve factual accuracy
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('HallucinationReduction');

export interface GroundingContext {
  knowledgeBaseChunks: Array<{
    content: string;
    source: string;
    relevance: number;
  }>;
  conversationHistory?: Array<{
    role: string;
    content: string;
  }>;
  verifiedFacts?: Map<string, string>; // fact → source
}

export interface HallucinationCheckResult {
  isGrounded: boolean; // Is response grounded in provided context?
  confidence: number; // 0.0-1.0
  unsupportedClaims: string[]; // Claims not backed by context
  verifiedClaims: Array<{
    claim: string;
    source: string;
  }>;
  recommendations: string[];
}

/**
 * Hallucination Reduction Manager
 *
 * Implements multiple techniques to reduce hallucinations:
 * 1. Grounding prompts (force citation of sources)
 * 2. Uncertainty expression (encourage "I don't know")
 * 3. Fact verification against knowledge base
 * 4. Chain-of-thought reasoning
 * 5. Self-consistency checks
 */
export class HallucinationReductionManager {
  /**
   * Build grounding prompt that forces citation of sources
   */
  buildGroundingPrompt(context: GroundingContext): string {
    let prompt = `You MUST answer based ONLY on the provided context. If the context doesn't contain the information needed to answer the question, explicitly say "I don't have enough information to answer this question based on the provided context."

**CRITICAL RULES**:
1. Every factual claim MUST be supported by the context
2. Use citations [1], [2], [3] for every fact from the context
3. Do NOT use external knowledge not present in the context
4. If unsure, say "I'm not certain" or "The context doesn't specify"
5. Distinguish between facts (from context) and inferences (your analysis)

`;

    // Add knowledge base context
    if (context.knowledgeBaseChunks.length > 0) {
      prompt += '**CONTEXT SOURCES**:\n\n';
      context.knowledgeBaseChunks.forEach((chunk, i) => {
        prompt += `[${i + 1}] (Source: ${chunk.source}, Relevance: ${(chunk.relevance * 100).toFixed(0)}%)\n${chunk.content}\n\n`;
      });
    } else {
      prompt += '**WARNING**: No context provided. You must state that you cannot answer without context.\n\n';
    }

    // Add conversation history for context continuity
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      prompt += '**CONVERSATION HISTORY** (for context only, not as source of truth):\n\n';
      const recentHistory = context.conversationHistory.slice(-3); // Last 3 exchanges
      recentHistory.forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    return prompt;
  }

  /**
   * Build uncertainty expression prompt
   */
  buildUncertaintyPrompt(): string {
    return `**UNCERTAINTY GUIDELINES**:

When you're uncertain about something, it's BETTER to admit it than to guess:

1. If you're not fully confident, use phrases like:
   - "Based on the context, it appears that..."
   - "The information suggests..."
   - "I cannot find specific information about..."

2. If the context is ambiguous, acknowledge it:
   - "The context doesn't clearly state..."
   - "There are multiple interpretations..."

3. If information is missing, explicitly state it:
   - "I don't have enough information to answer X"
   - "The context doesn't cover Y"

4. NEVER make up facts or sources
5. NEVER extrapolate beyond what the context supports

Remember: Saying "I don't know" is better than providing incorrect information.
`;
  }

  /**
   * Build chain-of-thought reasoning prompt
   */
  buildChainOfThoughtPrompt(): string {
    return `**REASONING PROCESS**:

Before answering, think step-by-step:

1. **Identify** what the question is asking
2. **Locate** relevant information in the context
3. **Verify** that the information directly answers the question
4. **Synthesize** the answer from the context
5. **Cite** specific sources for each claim

Show your reasoning process in your response when helpful for transparency.
`;
  }

  /**
   * Build complete hallucination-resistant prompt
   */
  buildResistantPrompt(context: GroundingContext, includeReasoning = true): string {
    let prompt = this.buildGroundingPrompt(context);
    prompt += '\n' + this.buildUncertaintyPrompt();

    if (includeReasoning) {
      prompt += '\n' + this.buildChainOfThoughtPrompt();
    }

    return prompt;
  }

  /**
   * Check response for hallucinations
   *
   * Analyzes response against provided context to detect unsupported claims
   */
  checkResponse(response: string, context: GroundingContext): HallucinationCheckResult {
    const verifiedClaims: Array<{ claim: string; source: string }> = [];
    const unsupportedClaims: string[] = [];
    const recommendations: string[] = [];

    // Extract citations from response
    const citationRegex = /\[(\d+)\]/g;
    const citations = new Set<number>();
    let match;
    while ((match = citationRegex.exec(response)) !== null) {
      const citationNum = Number.parseInt(match[1] ?? '0', 10);
      citations.add(citationNum);
    }

    // Check if all citations are valid
    const maxValidCitation = context.knowledgeBaseChunks.length;
    for (const citation of citations) {
      if (citation < 1 || citation > maxValidCitation) {
        unsupportedClaims.push(`Invalid citation [${citation}]`);
        recommendations.push(`Remove or fix citation [${citation}] - only [1]-[${maxValidCitation}] are valid`);
      }
    }

    // Check for citation usage
    if (citations.size === 0 && context.knowledgeBaseChunks.length > 0) {
      recommendations.push('No citations found - response may not be grounded in context');
    }

    // Check for uncertainty expressions
    const uncertaintyPhrases = [
      'i don\'t know',
      'i don\'t have enough information',
      'the context doesn\'t',
      'not specified',
      'unclear',
      'uncertain',
      'appears to',
      'suggests',
    ];

    const hasUncertaintyExpression = uncertaintyPhrases.some((phrase) =>
      response.toLowerCase().includes(phrase)
    );

    // Extract factual claims (simplified - looks for declarative sentences)
    const sentences = response
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sentence of sentences) {
      // Check if sentence has citation
      const hasCitation = /\[\d+\]/.test(sentence);

      // Declarative statement without citation is potentially unsupported
      if (
        !hasCitation &&
        !hasUncertaintyExpression &&
        sentence.length > 20 && // Ignore very short sentences
        !sentence.toLowerCase().startsWith('i ') && // Ignore meta-statements
        !sentence.toLowerCase().includes('based on') &&
        !sentence.toLowerCase().includes('according to')
      ) {
        // Simplified check - could be refined
        const looksLikeFactualClaim =
          !sentence.includes('?') && (sentence.includes(' is ') || sentence.includes(' are '));

        if (looksLikeFactualClaim) {
          unsupportedClaims.push(sentence);
        }
      } else if (hasCitation) {
        // Extract citation number
        const citationMatch = sentence.match(/\[(\d+)\]/);
        if (citationMatch) {
          const citationNum = Number.parseInt(citationMatch[1] ?? '0', 10);
          const chunk = context.knowledgeBaseChunks[citationNum - 1];
          if (chunk) {
            verifiedClaims.push({
              claim: sentence,
              source: chunk.source,
            });
          }
        }
      }
    }

    // Calculate grounding confidence
    const totalClaims = sentences.length;
    const groundedClaims = verifiedClaims.length + (hasUncertaintyExpression ? 1 : 0);
    const confidence = totalClaims > 0 ? groundedClaims / totalClaims : 0;

    // Determine if grounded
    const isGrounded =
      confidence >= 0.7 || // 70%+ of claims are grounded
      (unsupportedClaims.length === 0 && citations.size > 0) || // No unsupported claims and has citations
      hasUncertaintyExpression; // Expresses uncertainty appropriately

    // Add recommendations
    if (unsupportedClaims.length > 0) {
      recommendations.push(
        `Found ${unsupportedClaims.length} potentially unsupported claims - add citations or qualifiers`
      );
    }

    if (citations.size < context.knowledgeBaseChunks.length / 2) {
      recommendations.push('Low citation usage - consider citing more sources from context');
    }

    logger.info('Hallucination check complete', {
      isGrounded,
      confidence: confidence.toFixed(3),
      verifiedClaims: verifiedClaims.length,
      unsupportedClaims: unsupportedClaims.length,
      citations: citations.size,
    });

    return {
      isGrounded,
      confidence,
      unsupportedClaims,
      verifiedClaims,
      recommendations,
    };
  }

  /**
   * Generate self-consistency check prompts
   *
   * Ask the same question multiple times with different phrasings
   * to detect inconsistencies that may indicate hallucination
   */
  generateConsistencyCheckVariants(originalQuery: string): string[] {
    return [
      originalQuery, // Original
      `Can you explain ${originalQuery}?`, // Explanation variant
      `What information do you have about ${originalQuery}?`, // Information variant
      `Please describe ${originalQuery} based on the context.`, // Description variant
    ];
  }

  /**
   * Compare multiple responses for consistency
   */
  checkConsistency(responses: string[]): {
    isConsistent: boolean;
    confidence: number;
    divergentPoints: string[];
  } {
    if (responses.length < 2) {
      return {
        isConsistent: true,
        confidence: 1.0,
        divergentPoints: [],
      };
    }

    // Simplified consistency check - compare key facts
    // In production, would use semantic similarity and fact extraction
    const divergentPoints: string[] = [];

    // Extract numbers from each response
    const numberSets = responses.map((r) => {
      const numbers = r.match(/\b\d+(\.\d+)?\b/g) || [];
      return new Set(numbers);
    });

    // Check if all responses mention similar numbers
    const baseNumbers = numberSets[0];
    if (baseNumbers) {
      for (let i = 1; i < numberSets.length; i++) {
        const currentNumbers = numberSets[i];
        if (currentNumbers) {
          const intersection = new Set([...baseNumbers].filter((x) => currentNumbers.has(x)));
          const unionSize = new Set([...baseNumbers, ...currentNumbers]).size;

          if (unionSize > 0 && intersection.size / unionSize < 0.5) {
            divergentPoints.push(`Numeric inconsistency between response 1 and ${i + 1}`);
          }
        }
      }
    }

    // Simple consistency score based on divergent points
    const isConsistent = divergentPoints.length === 0;
    const confidence = Math.max(0, 1 - divergentPoints.length * 0.2);

    return {
      isConsistent,
      confidence,
      divergentPoints,
    };
  }
}

/**
 * Create a hallucination reduction manager instance
 */
export function createHallucinationManager(): HallucinationReductionManager {
  return new HallucinationReductionManager();
}
