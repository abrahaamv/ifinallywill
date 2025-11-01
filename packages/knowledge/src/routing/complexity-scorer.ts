/**
 * Query Complexity Scoring for Intelligent Routing (Phase 12 Week 7-8)
 *
 * Analyzes query complexity to route to appropriate AI models:
 * - Simple queries → Fast, cheaper models
 * - Complex queries → More capable models
 *
 * Complexity factors:
 * - Linguistic complexity (sentence structure, vocabulary)
 * - Semantic depth (multiple concepts, reasoning requirements)
 * - Context requirements (conversation history needed)
 * - Technical specificity (domain expertise needed)
 */

import type { AIProviderInterface } from '@platform/ai-core';

// ==================== TYPES ====================

export interface ComplexityScore {
  overallScore: number; // 0-1, where 1 is most complex
  factors: {
    linguistic: number; // 0-1: Sentence structure, vocabulary difficulty
    semantic: number; // 0-1: Conceptual depth, reasoning requirements
    contextual: number; // 0-1: Conversation history dependency
    technical: number; // 0-1: Domain expertise requirements
  };
  reasoning: string[]; // Human-readable explanations
  recommendedModel: 'fast' | 'balanced' | 'capable'; // Routing recommendation
  confidence: number; // 0-1: Confidence in complexity assessment
}

export interface ComplexityAnalysisInput {
  query: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  domainContext?: string; // 'technical_support', 'billing', 'general', etc.
  metadata?: Record<string, unknown>;
}

export interface ComplexityScorerConfig {
  // Linguistic complexity thresholds
  maxSentenceLength: number; // Words per sentence
  complexWordThreshold: number; // Syllables per word

  // Semantic complexity indicators
  multiConceptThreshold: number; // Number of distinct concepts
  reasoningKeywords: string[]; // Words indicating reasoning needed

  // Model routing thresholds
  fastModelThreshold: number; // 0-1: Route to fast model if below
  capableModelThreshold: number; // 0-1: Route to capable model if above

  // Weights for overall score calculation
  weights: {
    linguistic: number;
    semantic: number;
    contextual: number;
    technical: number;
  };
}

const DEFAULT_CONFIG: ComplexityScorerConfig = {
  maxSentenceLength: 25,
  complexWordThreshold: 3,
  multiConceptThreshold: 3,
  reasoningKeywords: [
    'why', 'how', 'explain', 'analyze', 'compare', 'evaluate',
    'recommend', 'optimize', 'troubleshoot', 'diagnose', 'investigate',
    'difference', 'between', 'relationship', 'impact', 'consequences',
  ],
  fastModelThreshold: 0.3,
  capableModelThreshold: 0.7,
  weights: {
    linguistic: 0.2,
    semantic: 0.35,
    contextual: 0.25,
    technical: 0.2,
  },
};

// ==================== COMPLEXITY SCORER ====================

export class ComplexityScorer {
  constructor(
    private aiProvider: AIProviderInterface,
    private config: ComplexityScorerConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Analyze query complexity and provide routing recommendation
   */
  async analyze(input: ComplexityAnalysisInput): Promise<ComplexityScore> {
    const reasoning: string[] = [];

    // 1. Linguistic complexity analysis
    const linguistic = this.analyzeLinguisticComplexity(input.query, reasoning);

    // 2. Semantic complexity analysis (AI-assisted)
    const semantic = await this.analyzeSemanticComplexity(input, reasoning);

    // 3. Contextual complexity analysis
    const contextual = this.analyzeContextualComplexity(input, reasoning);

    // 4. Technical complexity analysis (AI-assisted)
    const technical = await this.analyzeTechnicalComplexity(input, reasoning);

    // Calculate overall score
    const overallScore =
      linguistic * this.config.weights.linguistic +
      semantic * this.config.weights.semantic +
      contextual * this.config.weights.contextual +
      technical * this.config.weights.technical;

    // Determine model recommendation
    let recommendedModel: 'fast' | 'balanced' | 'capable';
    let confidence: number;

    if (overallScore < this.config.fastModelThreshold) {
      recommendedModel = 'fast';
      confidence = 1 - overallScore / this.config.fastModelThreshold;
    } else if (overallScore > this.config.capableModelThreshold) {
      recommendedModel = 'capable';
      confidence = (overallScore - this.config.capableModelThreshold) / (1 - this.config.capableModelThreshold);
    } else {
      recommendedModel = 'balanced';
      const midpoint = (this.config.fastModelThreshold + this.config.capableModelThreshold) / 2;
      confidence = 1 - Math.abs(overallScore - midpoint) / (this.config.capableModelThreshold - this.config.fastModelThreshold);
    }

    // Add recommendation reasoning
    reasoning.push(
      `Recommended model: ${recommendedModel} (confidence: ${(confidence * 100).toFixed(1)}%)`
    );

    return {
      overallScore,
      factors: {
        linguistic,
        semantic,
        contextual,
        technical,
      },
      reasoning,
      recommendedModel,
      confidence,
    };
  }

  /**
   * Analyze linguistic complexity (sentence structure, vocabulary)
   */
  private analyzeLinguisticComplexity(query: string, reasoning: string[]): number {
    // Tokenize into sentences and words
    const sentences = query.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = query.split(/\s+/).filter((w) => w.length > 0);

    if (sentences.length === 0 || words.length === 0) {
      reasoning.push('Linguistic: Empty or trivial query (score: 0.1)');
      return 0.1;
    }

    // Calculate average sentence length
    const avgSentenceLength = words.length / sentences.length;
    const sentenceLengthScore = Math.min(avgSentenceLength / this.config.maxSentenceLength, 1);

    // Estimate vocabulary complexity (syllable count approximation)
    const complexWordCount = words.filter((word) => {
      // Simple syllable count approximation
      const vowelMatches = word.toLowerCase().match(/[aeiouy]+/g);
      return vowelMatches && vowelMatches.length >= this.config.complexWordThreshold;
    }).length;
    const vocabularyScore = complexWordCount / words.length;

    // Punctuation and structure complexity
    const punctuationCount = (query.match(/[,;:()]/g) || []).length;
    const punctuationScore = Math.min(punctuationCount / (words.length * 0.2), 1);

    // Combine factors
    const linguisticScore = (sentenceLengthScore * 0.4 + vocabularyScore * 0.4 + punctuationScore * 0.2);

    reasoning.push(
      `Linguistic: ${sentences.length} sentences, ${words.length} words, ` +
      `avg length ${avgSentenceLength.toFixed(1)} (score: ${linguisticScore.toFixed(2)})`
    );

    return Math.min(linguisticScore, 1);
  }

  /**
   * Analyze semantic complexity (AI-assisted: reasoning depth, concepts)
   */
  private async analyzeSemanticComplexity(
    input: ComplexityAnalysisInput,
    reasoning: string[]
  ): Promise<number> {
    const prompt = `Analyze the semantic complexity of this query:

Query: "${input.query}"

Assess:
1. How many distinct concepts or topics are involved? (0-5+)
2. Does it require reasoning, comparison, or multi-step thinking? (yes/no)
3. Is it straightforward fact retrieval or complex analysis? (fact/analysis)

Respond in this exact format:
Concepts: [number]
Reasoning: [yes/no]
Type: [fact/analysis]`;

    try {
      const response = await this.aiProvider.complete({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        model: 'gemini-flash-8b' as any, // Fast model for meta-analysis
      });

      const content = response.content;

      // Parse response
      const conceptsMatch = content.match(/Concepts:\s*(\d+)/i);
      const reasoningMatch = content.match(/Reasoning:\s*(yes|no)/i);
      const typeMatch = content.match(/Type:\s*(fact|analysis)/i);

      const concepts = conceptsMatch && conceptsMatch[1] ? parseInt(conceptsMatch[1], 10) : 1;
      const requiresReasoning = reasoningMatch && reasoningMatch[1] ? reasoningMatch[1].toLowerCase() === 'yes' : false;
      const isAnalysis = typeMatch && typeMatch[1] ? typeMatch[1].toLowerCase() === 'analysis' : false;

      // Check for reasoning keywords
      const reasoningKeywordCount = this.config.reasoningKeywords.filter(keyword =>
        input.query.toLowerCase().includes(keyword)
      ).length;

      // Calculate semantic score
      const conceptScore = Math.min(concepts / this.config.multiConceptThreshold, 1);
      const reasoningScore = (requiresReasoning ? 1 : 0) + (reasoningKeywordCount > 0 ? 0.5 : 0);
      const typeScore = isAnalysis ? 1 : 0.2;

      const semanticScore = (conceptScore * 0.4 + Math.min(reasoningScore, 1) * 0.4 + typeScore * 0.2);

      reasoning.push(
        `Semantic: ${concepts} concepts, ${requiresReasoning ? 'requires' : 'no'} reasoning, ` +
        `${typeScore > 0.5 ? 'analysis' : 'fact retrieval'} (score: ${semanticScore.toFixed(2)})`
      );

      return Math.min(semanticScore, 1);
    } catch (error) {
      // Fallback to rule-based if AI fails
      const reasoningKeywordCount = this.config.reasoningKeywords.filter(keyword =>
        input.query.toLowerCase().includes(keyword)
      ).length;
      const fallbackScore = Math.min(reasoningKeywordCount / 2, 1) * 0.5 + 0.25;

      reasoning.push(`Semantic: fallback rule-based analysis (score: ${fallbackScore.toFixed(2)})`);
      return fallbackScore;
    }
  }

  /**
   * Analyze contextual complexity (conversation history dependency)
   */
  private analyzeContextualComplexity(
    input: ComplexityAnalysisInput,
    reasoning: string[]
  ): number {
    const history = input.conversationHistory || [];

    if (history.length === 0) {
      reasoning.push('Contextual: no conversation history (score: 0.1)');
      return 0.1;
    }

    // Check for pronouns and references
    const query = input.query.toLowerCase();
    const pronouns = ['it', 'this', 'that', 'they', 'them', 'their', 'those', 'these'];
    const references = ['above', 'before', 'earlier', 'previously', 'last'];

    const pronounCount = pronouns.filter(p => new RegExp(`\\b${p}\\b`).test(query)).length;
    const referenceCount = references.filter(r => query.includes(r)).length;

    const referenceScore = Math.min((pronounCount + referenceCount) / 3, 1);

    // History length factor
    const historyScore = Math.min(history.length / 10, 1);

    // Combine factors
    const contextualScore = referenceScore * 0.7 + historyScore * 0.3;

    reasoning.push(
      `Contextual: ${history.length} messages, ${pronounCount + referenceCount} references ` +
      `(score: ${contextualScore.toFixed(2)})`
    );

    return contextualScore;
  }

  /**
   * Analyze technical complexity (AI-assisted: domain expertise)
   */
  private async analyzeTechnicalComplexity(
    input: ComplexityAnalysisInput,
    reasoning: string[]
  ): Promise<number> {
    const domainContext = input.domainContext || 'general';

    // Technical indicators (rule-based)
    const technicalTerms = [
      'api', 'endpoint', 'authentication', 'authorization', 'webhook', 'oauth',
      'database', 'query', 'sql', 'nosql', 'cache', 'redis', 'postgresql',
      'deployment', 'docker', 'kubernetes', 'ci/cd', 'pipeline',
      'latency', 'throughput', 'bandwidth', 'scalability', 'load balancing',
      'encryption', 'hashing', 'ssl', 'tls', 'certificate',
      'algorithm', 'complexity', 'optimization', 'performance',
    ];

    const query = input.query.toLowerCase();
    const technicalTermCount = technicalTerms.filter(term => query.includes(term)).length;

    // Domain-specific technical scoring
    const domainScores: Record<string, number> = {
      technical_support: 0.7,
      billing: 0.3,
      product_features: 0.5,
      general: 0.2,
    };
    const domainScore = domainScores[domainContext] || 0.4;

    // Combine factors
    const termScore = Math.min(technicalTermCount / 3, 1);
    const technicalScore = termScore * 0.6 + domainScore * 0.4;

    reasoning.push(
      `Technical: ${technicalTermCount} technical terms, domain: ${domainContext} ` +
      `(score: ${technicalScore.toFixed(2)})`
    );

    return Math.min(technicalScore, 1);
  }

  /**
   * Batch analyze multiple queries (for testing and benchmarking)
   */
  async analyzeBatch(inputs: ComplexityAnalysisInput[]): Promise<ComplexityScore[]> {
    return Promise.all(inputs.map(input => this.analyze(input)));
  }
}
