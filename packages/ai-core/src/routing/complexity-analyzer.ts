/**
 * Phase 12 Week 2: Complexity Scoring Algorithm
 * Intelligent query complexity analysis for model routing
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('ComplexityAnalyzer');

export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

export interface ComplexityScore {
  level: ComplexityLevel;
  score: number; // 0.0-1.0
  reasoning: string;
  factors: {
    entityCount: number;
    depth: number;
    specificity: number;
    technicalTerms: number;
    ambiguity: number;
  };
}

export interface AnalysisContext {
  conversationHistory?: Array<{ role: string; content: string }>;
  knowledgeBaseSize?: number;
  userExpertise?: 'beginner' | 'intermediate' | 'expert';
}

/**
 * Analyze query complexity for intelligent model routing
 *
 * Scoring algorithm:
 * - Entity count (30%): Number of distinct concepts/entities
 * - Query depth (25%): Nested clauses, multi-step reasoning
 * - Specificity (20%): Precision vs. vagueness
 * - Technical terms (15%): Domain-specific vocabulary
 * - Ambiguity (10%): Unclear intent, multiple interpretations
 *
 * Score ranges:
 * - 0.0-0.3: Simple (GPT-4o-mini)
 * - 0.3-0.6: Moderate (GPT-4o or Claude Haiku)
 * - 0.6-1.0: Complex (Claude Sonnet/Opus)
 */
export class ComplexityAnalyzer {
  private technicalTerms = new Set([
    // Programming
    'algorithm', 'data structure', 'recursion', 'polymorphism', 'async',
    'callback', 'closure', 'prototype', 'inheritance', 'encapsulation',
    // Database
    'normalization', 'indexing', 'transaction', 'sharding', 'replication',
    'foreign key', 'primary key', 'join', 'query optimization',
    // Architecture
    'microservices', 'monolith', 'event-driven', 'saga', 'cqrs',
    'load balancing', 'caching', 'cdn', 'api gateway',
    // AI/ML
    'embedding', 'vector', 'semantic', 'rag', 'fine-tuning',
    'prompt engineering', 'hallucination', 'tokenization',
  ]);

  private multiStepIndicators = [
    'first', 'then', 'after that', 'finally',
    'step by step', 'walk through', 'explain how',
    'what happens when', 'cause', 'because',
  ];

  private ambiguityIndicators = [
    'maybe', 'possibly', 'might', 'could',
    'something like', 'kind of', 'sort of',
    'not sure', 'unclear', 'vague',
  ];

  analyze(query: string, context?: AnalysisContext): ComplexityScore {
    const normalized = query.toLowerCase();

    // Factor 1: Entity count (30%)
    const entities = this.extractEntities(normalized);
    const entityScore = Math.min(entities.length / 5, 1.0) * 0.3;

    // Factor 2: Query depth (25%)
    const depth = this.calculateDepth(normalized);
    const depthScore = Math.min(depth / 3, 1.0) * 0.25;

    // Factor 3: Specificity (20%)
    const specificity = this.calculateSpecificity(normalized);
    const specificityScore = specificity * 0.2;

    // Factor 4: Technical terms (15%)
    const techTermCount = this.countTechnicalTerms(normalized);
    const techScore = Math.min(techTermCount / 3, 1.0) * 0.15;

    // Factor 5: Ambiguity (10%)
    const ambiguity = this.detectAmbiguity(normalized);
    const ambiguityScore = ambiguity * 0.1;

    const totalScore = entityScore + depthScore + specificityScore + techScore + ambiguityScore;

    // Determine complexity level
    let level: ComplexityLevel;
    let reasoning: string;

    if (totalScore < 0.3) {
      level = 'simple';
      reasoning = 'Straightforward query with clear intent, minimal entities, low technical complexity';
    } else if (totalScore < 0.6) {
      level = 'moderate';
      reasoning = 'Multi-faceted query requiring moderate reasoning, some technical depth';
    } else {
      level = 'complex';
      reasoning = 'Complex query with multiple entities, deep reasoning, high technical sophistication';
    }

    // Adjust for context
    if (context?.conversationHistory && context.conversationHistory.length > 5) {
      // Long conversations may need more sophisticated models
      logger.debug('Adjusting complexity for long conversation history');
    }

    logger.info('Query complexity analyzed', {
      query: query.substring(0, 100),
      level,
      score: totalScore.toFixed(3),
    });

    return {
      level,
      score: totalScore,
      reasoning,
      factors: {
        entityCount: entities.length,
        depth,
        specificity,
        technicalTerms: techTermCount,
        ambiguity,
      },
    };
  }

  private extractEntities(query: string): string[] {
    // Simple entity extraction: proper nouns, technical terms
    const words = query.split(/\s+/);
    const entities = new Set<string>();

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;

      // Proper nouns (capitalized in original query)
      if (word[0] === word[0]?.toUpperCase() && word.length > 1) {
        entities.add(word.toLowerCase());
      }

      // Technical terms
      if (this.technicalTerms.has(word)) {
        entities.add(word);
      }

      // Compound terms (e.g., "data structure", "API endpoint")
      if (i < words.length - 1) {
        const compound = `${word} ${words[i + 1]}`;
        if (this.technicalTerms.has(compound)) {
          entities.add(compound);
        }
      }
    }

    return Array.from(entities);
  }

  private calculateDepth(query: string): number {
    let depth = 0;

    // Multi-step reasoning indicators
    for (const indicator of this.multiStepIndicators) {
      if (query.includes(indicator)) {
        depth += 1;
      }
    }

    // Nested clauses (commas, semicolons, conjunctions)
    const commaCount = (query.match(/,/g) || []).length;
    const semicolonCount = (query.match(/;/g) || []).length;
    const conjunctionCount = (query.match(/\b(and|but|or|while|because|if|when)\b/g) || []).length;

    depth += Math.floor((commaCount + semicolonCount + conjunctionCount) / 3);

    // Questions within questions
    const questionCount = (query.match(/\?/g) || []).length;
    if (questionCount > 1) {
      depth += questionCount - 1;
    }

    return Math.min(depth, 5); // Cap at 5
  }

  private calculateSpecificity(query: string): number {
    // Higher specificity = lower score (specific queries are simpler)
    let vagueness = 0;

    // Vague terms
    const vagueTerms = ['thing', 'stuff', 'something', 'anything', 'everything'];
    for (const term of vagueTerms) {
      if (query.includes(term)) {
        vagueness += 0.2;
      }
    }

    // Specific indicators (reduce score)
    const specificIndicators = ['exactly', 'specifically', 'precisely', 'particular'];
    for (const indicator of specificIndicators) {
      if (query.includes(indicator)) {
        vagueness -= 0.1;
      }
    }

    // Numbers/dates/codes (high specificity)
    if (/\b\d+\b/.test(query)) {
      vagueness -= 0.15;
    }

    return Math.max(0, Math.min(vagueness, 1.0));
  }

  private countTechnicalTerms(query: string): number {
    const words = query.split(/\s+/);
    let count = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;

      if (this.technicalTerms.has(word)) {
        count++;
      }

      // Check compound terms
      if (i < words.length - 1) {
        const compound = `${word} ${words[i + 1]}`;
        if (this.technicalTerms.has(compound)) {
          count++;
        }
      }
    }

    return count;
  }

  private detectAmbiguity(query: string): number {
    let ambiguity = 0;

    for (const indicator of this.ambiguityIndicators) {
      if (query.includes(indicator)) {
        ambiguity += 0.15;
      }
    }

    // Multiple interpretations (question words)
    const questionWords = (query.match(/\b(what|how|why|when|where|who|which)\b/g) || []).length;
    if (questionWords > 2) {
      ambiguity += 0.2;
    }

    return Math.min(ambiguity, 1.0);
  }
}

/**
 * Create a complexity analyzer instance
 */
export function createComplexityAnalyzer(): ComplexityAnalyzer {
  return new ComplexityAnalyzer();
}
