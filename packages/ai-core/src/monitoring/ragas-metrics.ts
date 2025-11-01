/**
 * Phase 12 Week 4: RAGAS Evaluation Framework
 * RAG Assessment and Grading System for quality measurement
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('RAGASMetrics');

export interface RAGASInput {
  question: string;
  contexts: string[]; // Retrieved context chunks
  answer: string; // Generated answer
  groundTruth?: string; // Optional reference answer
}

export interface RAGASScores {
  faithfulness: number; // 0-1: Answer grounded in context
  answerRelevancy: number; // 0-1: Answer addresses question
  contextRelevancy: number; // 0-1: Retrieved contexts are relevant
  contextPrecision: number; // 0-1: Precision of retrieved contexts
  contextRecall: number; // 0-1: All relevant context retrieved (requires ground truth)
  overall: number; // Weighted average
}

export interface RAGASEvaluation {
  scores: RAGASScores;
  breakdown: {
    metric: string;
    score: number;
    details: string;
  }[];
  recommendations: string[];
}

/**
 * RAGAS Metrics Calculator
 *
 * Implements RAGAS (RAG Assessment) framework metrics:
 * - Faithfulness: Answer grounded in context (no hallucinations)
 * - Answer Relevancy: Answer addresses the question
 * - Context Relevancy: Retrieved contexts are relevant to question
 * - Context Precision: Precision @ K for retrieved contexts
 * - Context Recall: All relevant contexts retrieved (needs ground truth)
 */
export class RAGASMetricsCalculator {
  /**
   * Calculate all RAGAS metrics
   */
  calculate(input: RAGASInput): RAGASEvaluation {
    const breakdown: Array<{ metric: string; score: number; details: string }> = [];

    // Calculate individual metrics
    const faithfulness = this.calculateFaithfulness(input.answer, input.contexts);
    breakdown.push({
      metric: 'Faithfulness',
      score: faithfulness,
      details: `${(faithfulness * 100).toFixed(1)}% of answer claims are grounded in context`,
    });

    const answerRelevancy = this.calculateAnswerRelevancy(input.question, input.answer);
    breakdown.push({
      metric: 'Answer Relevancy',
      score: answerRelevancy,
      details: `${(answerRelevancy * 100).toFixed(1)}% relevance to original question`,
    });

    const contextRelevancy = this.calculateContextRelevancy(input.question, input.contexts);
    breakdown.push({
      metric: 'Context Relevancy',
      score: contextRelevancy,
      details: `${(contextRelevancy * 100).toFixed(1)}% of contexts are relevant`,
    });

    const contextPrecision = this.calculateContextPrecision(input.question, input.contexts);
    breakdown.push({
      metric: 'Context Precision',
      score: contextPrecision,
      details: `Precision @ ${input.contexts.length}: ${(contextPrecision * 100).toFixed(1)}%`,
    });

    // Context recall requires ground truth
    let contextRecall = 0.5; // Default neutral score
    if (input.groundTruth) {
      contextRecall = this.calculateContextRecall(input.contexts, input.groundTruth);
      breakdown.push({
        metric: 'Context Recall',
        score: contextRecall,
        details: `${(contextRecall * 100).toFixed(1)}% of ground truth information retrieved`,
      });
    }

    // Calculate weighted overall score
    const weights = {
      faithfulness: 0.3,
      answerRelevancy: 0.25,
      contextRelevancy: 0.2,
      contextPrecision: 0.15,
      contextRecall: 0.1,
    };

    const overall =
      faithfulness * weights.faithfulness +
      answerRelevancy * weights.answerRelevancy +
      contextRelevancy * weights.contextRelevancy +
      contextPrecision * weights.contextPrecision +
      contextRecall * weights.contextRecall;

    const scores: RAGASScores = {
      faithfulness,
      answerRelevancy,
      contextRelevancy,
      contextPrecision,
      contextRecall,
      overall,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(scores);

    logger.info('RAGAS evaluation complete', {
      overall: overall.toFixed(3),
      faithfulness: faithfulness.toFixed(3),
      answerRelevancy: answerRelevancy.toFixed(3),
    });

    return {
      scores,
      breakdown,
      recommendations,
    };
  }

  /**
   * Faithfulness: Fraction of answer claims grounded in context
   *
   * Algorithm:
   * 1. Extract claims from answer (sentences)
   * 2. For each claim, check if supported by context
   * 3. Score = supported claims / total claims
   */
  private calculateFaithfulness(answer: string, contexts: string[]): number {
    // Extract claims (sentences)
    const claims = answer
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10); // Ignore very short sentences

    if (claims.length === 0) return 0;

    // Join all contexts for searching
    const contextText = contexts.join(' ').toLowerCase();

    // Check how many claims are supported
    let supportedClaims = 0;

    for (const claim of claims) {
      const claimLower = claim.toLowerCase();

      // Simple heuristic: check if key words from claim appear in context
      const claimWords = claimLower.split(/\s+/).filter((w) => w.length > 3);
      const matchedWords = claimWords.filter((w) => contextText.includes(w));

      // Claim considered supported if >50% of key words found in context
      if (matchedWords.length / claimWords.length > 0.5) {
        supportedClaims++;
      }
    }

    return supportedClaims / claims.length;
  }

  /**
   * Answer Relevancy: How well answer addresses the question
   *
   * Algorithm:
   * 1. Extract question keywords
   * 2. Check if answer addresses those keywords
   * 3. Penalty for irrelevant content
   */
  private calculateAnswerRelevancy(question: string, answer: string): number {
    const questionLower = question.toLowerCase();
    const answerLower = answer.toLowerCase();

    // Extract question keywords (remove stop words)
    const stopWords = new Set(['what', 'how', 'why', 'when', 'where', 'who', 'is', 'are', 'the', 'a', 'an']);
    const questionWords = questionLower
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    if (questionWords.length === 0) return 0.5;

    // Check keyword coverage
    const answeredKeywords = questionWords.filter((kw) => answerLower.includes(kw));
    const keywordCoverage = answeredKeywords.length / questionWords.length;

    // Penalty for very short or very long answers
    const answerLength = answer.split(/\s+/).length;
    let lengthScore = 1.0;

    if (answerLength < 10) {
      lengthScore = 0.5; // Too short
    } else if (answerLength > 500) {
      lengthScore = 0.8; // Very long, may contain irrelevant content
    }

    return keywordCoverage * lengthScore;
  }

  /**
   * Context Relevancy: Percentage of relevant contexts
   *
   * Algorithm:
   * 1. For each context, check relevance to question
   * 2. Score = relevant contexts / total contexts
   */
  private calculateContextRelevancy(question: string, contexts: string[]): number {
    if (contexts.length === 0) return 0;

    const questionLower = question.toLowerCase();
    const questionWords = questionLower.split(/\s+/).filter((w) => w.length > 3);

    let relevantContexts = 0;

    for (const context of contexts) {
      const contextLower = context.toLowerCase();

      // Check keyword overlap
      const matchedWords = questionWords.filter((w) => contextLower.includes(w));

      // Context considered relevant if >30% keyword match
      if (matchedWords.length / questionWords.length > 0.3) {
        relevantContexts++;
      }
    }

    return relevantContexts / contexts.length;
  }

  /**
   * Context Precision: Precision @ K for retrieved contexts
   *
   * Algorithm:
   * 1. For each context at position k, check if relevant
   * 2. Precision@K = relevant contexts in top-K / K
   * 3. Average across all K
   */
  private calculateContextPrecision(question: string, contexts: string[]): number {
    if (contexts.length === 0) return 0;

    const questionLower = question.toLowerCase();
    const questionWords = questionLower.split(/\s+/).filter((w) => w.length > 3);

    let cumulativePrecision = 0;

    for (let k = 1; k <= contexts.length; k++) {
      const topK = contexts.slice(0, k);
      const relevantInTopK = topK.filter((ctx) => {
        const ctxLower = ctx.toLowerCase();
        const matches = questionWords.filter((w) => ctxLower.includes(w));
        return matches.length / questionWords.length > 0.3;
      }).length;

      cumulativePrecision += relevantInTopK / k;
    }

    return cumulativePrecision / contexts.length;
  }

  /**
   * Context Recall: Fraction of ground truth covered by contexts
   *
   * Algorithm:
   * 1. Extract facts from ground truth
   * 2. Check how many are covered by contexts
   * 3. Recall = covered facts / total facts
   */
  private calculateContextRecall(contexts: string[], groundTruth: string): number {
    const groundTruthLower = groundTruth.toLowerCase();

    // Extract ground truth facts (sentences)
    const facts = groundTruthLower
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    if (facts.length === 0) return 1.0;

    const contextText = contexts.join(' ').toLowerCase();

    // Check how many facts are covered
    let coveredFacts = 0;

    for (const fact of facts) {
      const factWords = fact.split(/\s+/).filter((w) => w.length > 3);
      const matchedWords = factWords.filter((w) => contextText.includes(w));

      // Fact considered covered if >60% of words found
      if (matchedWords.length / factWords.length > 0.6) {
        coveredFacts++;
      }
    }

    return coveredFacts / facts.length;
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(scores: RAGASScores): string[] {
    const recommendations: string[] = [];

    if (scores.faithfulness < 0.7) {
      recommendations.push(
        'Low faithfulness score - implement stricter grounding prompts and citation requirements'
      );
    }

    if (scores.answerRelevancy < 0.7) {
      recommendations.push(
        'Low answer relevancy - improve prompt engineering to focus on question keywords'
      );
    }

    if (scores.contextRelevancy < 0.6) {
      recommendations.push(
        'Low context relevancy - improve retrieval query expansion or hybrid search weighting'
      );
    }

    if (scores.contextPrecision < 0.6) {
      recommendations.push(
        'Low context precision - adjust retrieval topK or improve embedding quality'
      );
    }

    if (scores.contextRecall < 0.6) {
      recommendations.push(
        'Low context recall - increase retrieval topK or improve chunking strategy'
      );
    }

    if (scores.overall >= 0.8) {
      recommendations.push('Excellent overall performance - maintain current approach');
    } else if (scores.overall >= 0.6) {
      recommendations.push('Good performance - minor improvements recommended');
    } else {
      recommendations.push(
        'Performance needs improvement - review retrieval and generation pipeline'
      );
    }

    return recommendations;
  }

  /**
   * Batch evaluate multiple RAG outputs
   */
  async evaluateBatch(inputs: RAGASInput[]): Promise<{
    evaluations: RAGASEvaluation[];
    aggregateScores: RAGASScores;
  }> {
    const evaluations = inputs.map((input) => this.calculate(input));

    // Calculate aggregate scores
    const aggregateScores: RAGASScores = {
      faithfulness: 0,
      answerRelevancy: 0,
      contextRelevancy: 0,
      contextPrecision: 0,
      contextRecall: 0,
      overall: 0,
    };

    for (const evaluation of evaluations) {
      aggregateScores.faithfulness += evaluation.scores.faithfulness;
      aggregateScores.answerRelevancy += evaluation.scores.answerRelevancy;
      aggregateScores.contextRelevancy += evaluation.scores.contextRelevancy;
      aggregateScores.contextPrecision += evaluation.scores.contextPrecision;
      aggregateScores.contextRecall += evaluation.scores.contextRecall;
      aggregateScores.overall += evaluation.scores.overall;
    }

    const count = evaluations.length;
    aggregateScores.faithfulness /= count;
    aggregateScores.answerRelevancy /= count;
    aggregateScores.contextRelevancy /= count;
    aggregateScores.contextPrecision /= count;
    aggregateScores.contextRecall /= count;
    aggregateScores.overall /= count;

    logger.info('Batch RAGAS evaluation complete', {
      count,
      avgOverall: aggregateScores.overall.toFixed(3),
    });

    return {
      evaluations,
      aggregateScores,
    };
  }
}

/**
 * Create a RAGAS metrics calculator instance
 */
export function createRAGASCalculator(): RAGASMetricsCalculator {
  return new RAGASMetricsCalculator();
}
