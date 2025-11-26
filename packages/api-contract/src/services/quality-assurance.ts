/**
 * Phase 12 Week 9: Quality Assurance Service
 *
 * Provides hallucination detection, response review workflows, and quality metrics tracking
 */

/**
 * Quality issue types
 */
export type QualityIssueType =
  | 'hallucination'
  | 'inconsistency'
  | 'low_confidence'
  | 'missing_citation'
  | 'factual_error'
  | 'inappropriate_content'
  | 'off_topic';

/**
 * Review status
 */
export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'requires_revision';

/**
 * Hallucination detection result
 */
export interface HallucinationDetectionResult {
  isHallucination: boolean;
  confidence: number; // 0-1
  reasons: string[];
  evidence: Array<{
    type: 'fact_check' | 'consistency' | 'citation' | 'knowledge_base';
    description: string;
    score: number;
  }>;
  recommendation: 'approve' | 'flag_for_review' | 'reject';
}

/**
 * Quality review
 */
export interface QualityReview {
  id: string;
  messageId: string;
  tenantId: string;
  sessionId: string;
  flaggedAt: Date;
  flaggedBy: 'system' | 'user' | 'admin';
  issueTypes: QualityIssueType[];
  status: ReviewStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Response details
  originalResponse: string;
  revisedResponse?: string;
  context: {
    userQuery: string;
    conversationHistory: Array<{ role: string; content: string }>;
    ragSources?: Array<{ chunkId: string; score: number; content: string }>;
  };

  // Detection results
  hallucinationDetection?: HallucinationDetectionResult;
  qualityScore?: number; // 0-1

  // Review details
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewDecision?: 'approve' | 'reject' | 'revise';

  metadata?: Record<string, any>;
}

/**
 * Quality metrics
 */
export interface QualityMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalResponses: number;
  flaggedResponses: number;
  flagRate: number; // percentage

  // Issue breakdown
  issueBreakdown: Record<QualityIssueType, number>;

  // Review outcomes
  approved: number;
  rejected: number;
  revised: number;

  // Quality scores
  averageQualityScore: number;
  hallucinationRate: number;

  // Performance
  averageReviewTime: number; // seconds
  pendingReviews: number;
}

/**
 * Hallucination detection configuration
 */
export interface HallucinationDetectionConfig {
  // Thresholds
  confidenceThreshold: number; // 0-1, below this flags for review
  hallucinationThreshold: number; // 0-1, above this considered hallucination

  // Detection methods
  enableFactChecking: boolean;
  enableConsistencyCheck: boolean;
  enableCitationValidation: boolean;
  enableKnowledgeBaseVerification: boolean;

  // Fact checking
  factCheckSources?: string[]; // External APIs for fact checking

  // Knowledge base verification
  knowledgeBaseThreshold: number; // Minimum similarity to KB sources

  // Citation validation
  requireCitations: boolean;
  minimumCitations: number;
}

/**
 * Quality assurance service
 */
export class QualityAssuranceService {
  private config: HallucinationDetectionConfig;

  constructor(config?: Partial<HallucinationDetectionConfig>) {
    this.config = {
      confidenceThreshold: 0.7,
      hallucinationThreshold: 0.6,
      enableFactChecking: true,
      enableConsistencyCheck: true,
      enableCitationValidation: true,
      enableKnowledgeBaseVerification: true,
      knowledgeBaseThreshold: 0.75,
      requireCitations: true,
      minimumCitations: 1,
      ...config,
    };
  }

  /**
   * Detect hallucinations in AI response
   */
  async detectHallucination(
    response: string,
    context: {
      userQuery: string;
      conversationHistory: Array<{ role: string; content: string }>;
      ragSources?: Array<{ chunkId: string; score: number; content: string }>;
    }
  ): Promise<HallucinationDetectionResult> {
    const evidence: HallucinationDetectionResult['evidence'] = [];
    let totalScore = 0;
    let checks = 0;

    // 1. Knowledge base verification
    if (this.config.enableKnowledgeBaseVerification && context.ragSources) {
      const kbScore = await this.verifyAgainstKnowledgeBase(response, context.ragSources);
      evidence.push({
        type: 'knowledge_base',
        description: `Response ${kbScore >= this.config.knowledgeBaseThreshold ? 'aligns with' : 'diverges from'} knowledge base sources`,
        score: kbScore,
      });
      totalScore += kbScore;
      checks++;
    }

    // 2. Citation validation
    if (this.config.enableCitationValidation && context.ragSources) {
      const citationScore = await this.validateCitations(response, context.ragSources);
      evidence.push({
        type: 'citation',
        description: `Response ${citationScore >= 0.7 ? 'properly cites' : 'lacks proper citations for'} sources`,
        score: citationScore,
      });
      totalScore += citationScore;
      checks++;
    }

    // 3. Consistency check
    if (this.config.enableConsistencyCheck && context.conversationHistory.length > 0) {
      const consistencyScore = await this.checkConsistency(response, context.conversationHistory);
      evidence.push({
        type: 'consistency',
        description: `Response is ${consistencyScore >= 0.7 ? 'consistent' : 'inconsistent'} with conversation history`,
        score: consistencyScore,
      });
      totalScore += consistencyScore;
      checks++;
    }

    // 4. Fact checking (if external APIs configured)
    if (this.config.enableFactChecking && this.config.factCheckSources) {
      const factCheckScore = await this.checkFacts(response);
      evidence.push({
        type: 'fact_check',
        description: `Response contains ${factCheckScore >= 0.8 ? 'verifiable' : 'unverifiable'} facts`,
        score: factCheckScore,
      });
      totalScore += factCheckScore;
      checks++;
    }

    // Calculate overall confidence
    const confidence = checks > 0 ? totalScore / checks : 0;
    const isHallucination = confidence < this.config.hallucinationThreshold;

    // Generate reasons
    const reasons: string[] = [];
    for (const item of evidence) {
      if (item.score < 0.6) {
        reasons.push(item.description);
      }
    }

    // Determine recommendation
    let recommendation: 'approve' | 'flag_for_review' | 'reject';
    if (isHallucination) {
      recommendation = 'reject';
    } else if (confidence < this.config.confidenceThreshold) {
      recommendation = 'flag_for_review';
    } else {
      recommendation = 'approve';
    }

    return {
      isHallucination,
      confidence,
      reasons,
      evidence,
      recommendation,
    };
  }

  /**
   * Verify response against knowledge base sources
   */
  private async verifyAgainstKnowledgeBase(
    response: string,
    sources: Array<{ chunkId: string; score: number; content: string }>
  ): Promise<number> {
    // Extract key claims from response
    const claims = this.extractClaims(response);
    if (claims.length === 0) return 1.0; // No specific claims to verify

    // Check each claim against sources
    let verifiedClaims = 0;
    for (const claim of claims) {
      const isVerified = sources.some((source) => this.claimSupportedBySource(claim, source.content));
      if (isVerified) {
        verifiedClaims++;
      }
    }

    return claims.length > 0 ? verifiedClaims / claims.length : 1.0;
  }

  /**
   * Validate citations in response
   */
  private async validateCitations(
    response: string,
    sources: Array<{ chunkId: string; score: number; content: string }>
  ): Promise<number> {
    // Check if response references or cites sources
    const hasCitations = this.detectCitations(response);

    if (!this.config.requireCitations) {
      return 1.0; // Citations not required
    }

    if (!hasCitations) {
      return 0.0; // No citations found
    }

    // Validate that citations match provided sources
    const validCitations = this.countValidCitations(response, sources);
    const requiredCitations = this.config.minimumCitations;

    return Math.min(validCitations / requiredCitations, 1.0);
  }

  /**
   * Check consistency with conversation history
   */
  private async checkConsistency(
    response: string,
    history: Array<{ role: string; content: string }>
  ): Promise<number> {
    // Extract assistant responses from history
    const previousResponses = history.filter((msg) => msg.role === 'assistant').map((msg) => msg.content);

    if (previousResponses.length === 0) {
      return 1.0; // No history to check against
    }

    // Check for contradictions
    const contradictions = this.detectContradictions(response, previousResponses);

    // Calculate consistency score (fewer contradictions = higher score)
    return Math.max(0, 1 - contradictions.length * 0.2);
  }

  /**
   * Check facts against external sources
   */
  private async checkFacts(response: string): Promise<number> {
    // Extract factual claims
    const facts = this.extractFacts(response);

    if (facts.length === 0) {
      return 1.0; // No factual claims to verify
    }

    // In production, would call external fact-checking APIs
    // For now, return a placeholder score
    return 0.8;
  }

  /**
   * Extract claims from response
   */
  private extractClaims(text: string): string[] {
    // Simple claim extraction (in production, use NLP)
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Filter for declarative sentences (claims)
    return sentences.filter((sentence) => {
      const trimmed = sentence.trim();
      // Basic heuristic: statements without questions
      return !trimmed.includes('?') && trimmed.length > 20;
    });
  }

  /**
   * Check if claim is supported by source
   */
  private claimSupportedBySource(claim: string, source: string): boolean {
    // Normalize text
    const normalizedClaim = claim.toLowerCase().trim();
    const normalizedSource = source.toLowerCase();

    // Simple keyword overlap check
    const claimWords = normalizedClaim.split(/\s+/).filter((w) => w.length > 3);
    const matchingWords = claimWords.filter((word) => normalizedSource.includes(word));

    // Consider supported if >50% of key words match
    return matchingWords.length / claimWords.length > 0.5;
  }

  /**
   * Detect citations in response
   */
  private detectCitations(text: string): boolean {
    // Look for citation patterns: [1], (source), "according to", etc.
    const citationPatterns = [
      /\[\d+\]/g, // [1], [2], etc.
      /\(source:.*?\)/gi, // (source: ...)
      /according to/gi,
      /based on/gi,
      /as stated in/gi,
      /referenced in/gi,
    ];

    return citationPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Count valid citations
   */
  private countValidCitations(text: string, sources: Array<{ chunkId: string; score: number; content: string }>): number {
    // Extract citation references
    const citations = text.match(/\[\d+\]/g) || [];
    return citations.length; // Simplified - would validate against actual sources
  }

  /**
   * Detect contradictions with previous responses
   */
  private detectContradictions(current: string, previous: string[]): string[] {
    const contradictions: string[] = [];

    // Simple contradiction detection (in production, use NLP)
    const negationPatterns = [
      /not\s+\w+/gi,
      /never\s+\w+/gi,
      /no\s+\w+/gi,
      /cannot\s+\w+/gi,
      /does\s+not\s+\w+/gi,
    ];

    // Check for statements that contradict previous ones
    for (const prev of previous) {
      // Look for opposing statements
      if (this.statementsContradict(current, prev)) {
        contradictions.push(`Current response contradicts previous statement: "${prev.substring(0, 100)}..."`);
      }
    }

    return contradictions;
  }

  /**
   * Check if two statements contradict each other
   */
  private statementsContradict(stmt1: string, stmt2: string): boolean {
    // Simplified contradiction detection
    // In production, would use semantic similarity + negation detection

    const words1 = new Set(stmt1.toLowerCase().split(/\s+/));
    const words2 = new Set(stmt2.toLowerCase().split(/\s+/));

    // Check for negation patterns
    const hasNegation1 = /(not|never|no|cannot|doesn't|don't|won't)/i.test(stmt1);
    const hasNegation2 = /(not|never|no|cannot|doesn't|don't|won't)/i.test(stmt2);

    // High word overlap with opposing negation patterns suggests contradiction
    const overlap = [...words1].filter((w) => words2.has(w)).length;
    const totalWords = Math.min(words1.size, words2.size);

    return overlap / totalWords > 0.6 && hasNegation1 !== hasNegation2;
  }

  /**
   * Extract factual claims from response
   */
  private extractFacts(text: string): string[] {
    // Extract statements that make factual claims
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Filter for factual statements (contains dates, numbers, proper nouns)
    return sentences.filter((sentence) => {
      const hasDate = /\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(sentence);
      const hasNumber = /\d+/.test(sentence);
      const hasProperNoun = /[A-Z][a-z]+/.test(sentence);

      return hasDate || hasNumber || hasProperNoun;
    });
  }

  /**
   * Calculate overall quality score for response
   */
  calculateQualityScore(detectionResult: HallucinationDetectionResult): number {
    // Weighted average of evidence scores
    if (detectionResult.evidence.length === 0) return 0.5;

    const weights = {
      knowledge_base: 0.4,
      citation: 0.3,
      consistency: 0.2,
      fact_check: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const item of detectionResult.evidence) {
      const weight = weights[item.type] || 0.25;
      totalScore += item.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }

  /**
   * Determine if response should be flagged for review
   */
  shouldFlagForReview(detectionResult: HallucinationDetectionResult): boolean {
    return (
      detectionResult.recommendation === 'flag_for_review' ||
      detectionResult.recommendation === 'reject' ||
      detectionResult.confidence < this.config.confidenceThreshold
    );
  }

  /**
   * Determine issue types from detection result
   */
  determineIssueTypes(detectionResult: HallucinationDetectionResult): QualityIssueType[] {
    const issues: QualityIssueType[] = [];

    if (detectionResult.isHallucination) {
      issues.push('hallucination');
    }

    for (const evidence of detectionResult.evidence) {
      if (evidence.score < 0.6) {
        switch (evidence.type) {
          case 'knowledge_base':
            issues.push('factual_error');
            break;
          case 'citation':
            issues.push('missing_citation');
            break;
          case 'consistency':
            issues.push('inconsistency');
            break;
          case 'fact_check':
            issues.push('factual_error');
            break;
        }
      }
    }

    if (detectionResult.confidence < this.config.confidenceThreshold) {
      issues.push('low_confidence');
    }

    return [...new Set(issues)]; // Remove duplicates
  }

  /**
   * Determine review priority
   */
  determinePriority(
    detectionResult: HallucinationDetectionResult,
    issueTypes: QualityIssueType[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (detectionResult.recommendation === 'reject') {
      return 'critical';
    }

    if (issueTypes.includes('hallucination') || issueTypes.includes('factual_error')) {
      return 'high';
    }

    if (issueTypes.includes('inconsistency') || issueTypes.includes('missing_citation')) {
      return 'medium';
    }

    return 'low';
  }
}

/**
 * Default QA service instance
 */
export const qualityAssuranceService = new QualityAssuranceService();
