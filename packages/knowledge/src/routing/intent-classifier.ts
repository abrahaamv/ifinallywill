/**
 * Intent Classification for Query Routing (Phase 12 Week 7-8)
 *
 * Classifies user queries into intent categories to optimize routing:
 * - Factual queries → Fast retrieval-focused models
 * - Technical support → Balanced models with RAG
 * - Analytical questions → Capable reasoning models
 * - Creative requests → Capable generative models
 * - Troubleshooting → Capable models with deep reasoning
 */

import type { AIProviderInterface } from '@platform/ai-core';

// ==================== TYPES ====================

export type Intent =
  | 'factual_query' // Simple fact retrieval (What is X? When does Y happen?)
  | 'technical_support' // Technical help, how-to questions
  | 'troubleshooting' // Problem diagnosis, debugging
  | 'analytical' // Analysis, comparison, evaluation
  | 'creative' // Content generation, ideation
  | 'transactional' // Account actions, billing, settings
  | 'conversational' // Casual chat, greetings
  | 'unclear'; // Unable to determine intent

export interface IntentClassificationResult {
  primaryIntent: Intent;
  secondaryIntents: Intent[];
  confidence: number; // 0-1
  reasoning: string[];
  requiresKnowledge: boolean; // Should RAG be used?
  requiresReasoning: boolean; // Needs complex reasoning?
  urgency: 'low' | 'medium' | 'high'; // Response urgency
}

export interface IntentClassificationInput {
  query: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  metadata?: Record<string, unknown>;
}

export interface IntentClassifierConfig {
  // Intent keywords for rule-based classification
  intentKeywords: Record<Intent, string[]>;

  // Use AI-assisted classification for ambiguous queries
  useAIClassification: boolean;

  // Minimum confidence threshold for AI classification
  minConfidence: number;
}

const DEFAULT_CONFIG: IntentClassifierConfig = {
  intentKeywords: {
    factual_query: [
      'what is', 'what are', 'define', 'explain', 'describe', 'tell me about',
      'when', 'where', 'who', 'which', 'does', 'is', 'are', 'can',
    ],
    technical_support: [
      'how do i', 'how can i', 'how to', 'setup', 'configure', 'install',
      'integrate', 'enable', 'disable', 'use', 'implement',
    ],
    troubleshooting: [
      'not working', 'broken', 'error', 'issue', 'problem', 'bug', 'failed',
      'why', 'troubleshoot', 'debug', 'fix', 'solve', 'resolve',
    ],
    analytical: [
      'analyze', 'compare', 'evaluate', 'assess', 'review', 'difference',
      'pros and cons', 'better', 'best', 'should i', 'recommend',
    ],
    creative: [
      'generate', 'create', 'write', 'draft', 'compose', 'suggest',
      'brainstorm', 'ideas', 'examples', 'template',
    ],
    transactional: [
      'account', 'billing', 'payment', 'subscription', 'upgrade', 'downgrade',
      'cancel', 'refund', 'invoice', 'pricing', 'plan',
    ],
    conversational: [
      'hello', 'hi', 'hey', 'thanks', 'thank you', 'bye', 'goodbye',
      'how are you', 'nice', 'great', 'awesome',
    ],
    unclear: [],
  },
  useAIClassification: true,
  minConfidence: 0.7,
};

// ==================== INTENT CLASSIFIER ====================

export class IntentClassifier {
  constructor(
    private aiProvider: AIProviderInterface,
    private config: IntentClassifierConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Classify query intent
   */
  async classify(input: IntentClassificationInput): Promise<IntentClassificationResult> {
    const reasoning: string[] = [];

    // 1. Rule-based classification (fast, deterministic)
    const ruleBasedResult = this.classifyRuleBased(input, reasoning);

    // 2. If confidence is low and AI classification enabled, use AI
    if (ruleBasedResult.confidence < this.config.minConfidence && this.config.useAIClassification) {
      const aiResult = await this.classifyWithAI(input, reasoning);
      if (aiResult.confidence > ruleBasedResult.confidence) {
        reasoning.push('Using AI classification (higher confidence)');
        return aiResult;
      }
    }

    return ruleBasedResult;
  }

  /**
   * Rule-based classification using keyword matching
   */
  private classifyRuleBased(
    input: IntentClassificationInput,
    reasoning: string[]
  ): IntentClassificationResult {
    const query = input.query.toLowerCase();
    const intentScores: Record<Intent, number> = {
      factual_query: 0,
      technical_support: 0,
      troubleshooting: 0,
      analytical: 0,
      creative: 0,
      transactional: 0,
      conversational: 0,
      unclear: 0,
    };

    // Count keyword matches for each intent
    for (const [intent, keywords] of Object.entries(this.config.intentKeywords)) {
      const matchCount = keywords.filter(keyword => query.includes(keyword)).length;
      intentScores[intent as Intent] = matchCount;
    }

    // Find primary and secondary intents
    const sortedIntents = (Object.entries(intentScores) as [Intent, number][])
      .sort((a, b) => b[1] - a[1]);

    const primaryIntent = sortedIntents[0]?.[0] || 'unclear';
    const primaryScore = sortedIntents[0]?.[1] || 0;
    const secondaryIntents = sortedIntents
      .slice(1, 3)
      .filter(([, score]) => score > 0)
      .map(([intent]) => intent);

    // Calculate confidence
    const totalMatches = sortedIntents.reduce((sum, [, score]) => sum + score, 0);
    const confidence = totalMatches > 0 ? primaryScore / totalMatches : 0.5;

    // Determine knowledge and reasoning requirements
    const requiresKnowledge = ['factual_query', 'technical_support', 'troubleshooting'].includes(primaryIntent);
    const requiresReasoning = ['troubleshooting', 'analytical'].includes(primaryIntent);

    // Determine urgency
    const urgencyKeywords = {
      high: ['urgent', 'critical', 'emergency', 'asap', 'immediately', 'broken', 'down'],
      medium: ['soon', 'help', 'issue', 'problem'],
      low: ['when', 'how', 'what', 'can'],
    };

    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (urgencyKeywords.high.some(k => query.includes(k))) urgency = 'high';
    else if (urgencyKeywords.medium.some(k => query.includes(k))) urgency = 'medium';

    reasoning.push(
      `Rule-based: ${primaryIntent} (${primaryScore} matches, confidence: ${(confidence * 100).toFixed(1)}%)`
    );

    if (secondaryIntents.length > 0) {
      reasoning.push(`Secondary: ${secondaryIntents.join(', ')}`);
    }

    return {
      primaryIntent,
      secondaryIntents,
      confidence,
      reasoning,
      requiresKnowledge,
      requiresReasoning,
      urgency,
    };
  }

  /**
   * AI-assisted classification for ambiguous queries
   */
  private async classifyWithAI(
    input: IntentClassificationInput,
    reasoning: string[]
  ): Promise<IntentClassificationResult> {
    const prompt = `Classify the intent of this user query:

Query: "${input.query}"

Possible intents:
1. factual_query - Simple fact retrieval
2. technical_support - Technical help, how-to questions
3. troubleshooting - Problem diagnosis, debugging
4. analytical - Analysis, comparison, evaluation
5. creative - Content generation, ideation
6. transactional - Account actions, billing, settings
7. conversational - Casual chat, greetings
8. unclear - Unable to determine

Respond in this exact format:
Primary: [intent]
Secondary: [intent1, intent2] or none
Confidence: [0.0-1.0]
Knowledge: [yes/no] (requires knowledge base?)
Reasoning: [yes/no] (requires complex reasoning?)
Urgency: [low/medium/high]`;

    try {
      const response = await this.aiProvider.complete({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        model: 'gemini-flash-8b' as any, // Fast model for classification
      });

      const content = response.content;

      // Parse response
      const primaryMatch = content.match(/Primary:\s*(\w+)/i);
      const secondaryMatch = content.match(/Secondary:\s*([\w,\s]+)/i);
      const confidenceMatch = content.match(/Confidence:\s*(0?\.\d+|1\.0)/i);
      const knowledgeMatch = content.match(/Knowledge:\s*(yes|no)/i);
      const reasoningMatch = content.match(/Reasoning:\s*(yes|no)/i);
      const urgencyMatch = content.match(/Urgency:\s*(low|medium|high)/i);

      const primaryIntent = (primaryMatch && primaryMatch[1] ? primaryMatch[1] : 'unclear') as Intent;
      const secondaryIntents = secondaryMatch && secondaryMatch[1] && secondaryMatch[1] !== 'none'
        ? secondaryMatch[1].split(',').map((s: string) => s.trim() as Intent).filter((i: Intent) => i !== primaryIntent)
        : [];
      const confidence = confidenceMatch && confidenceMatch[1] ? parseFloat(confidenceMatch[1]) : 0.5;
      const requiresKnowledge = knowledgeMatch ? knowledgeMatch[1] === 'yes' : false;
      const requiresReasoning = reasoningMatch ? reasoningMatch[1] === 'yes' : false;
      const urgency = (urgencyMatch ? urgencyMatch[1] : 'low') as 'low' | 'medium' | 'high';

      reasoning.push(
        `AI-assisted: ${primaryIntent} (confidence: ${(confidence * 100).toFixed(1)}%)`
      );

      return {
        primaryIntent,
        secondaryIntents,
        confidence,
        reasoning,
        requiresKnowledge,
        requiresReasoning,
        urgency,
      };
    } catch (error) {
      // Fallback to unclear intent if AI fails
      reasoning.push('AI classification failed, returning unclear intent');
      return {
        primaryIntent: 'unclear',
        secondaryIntents: [],
        confidence: 0.3,
        reasoning,
        requiresKnowledge: true, // Conservative default
        requiresReasoning: true,
        urgency: 'medium',
      };
    }
  }

  /**
   * Batch classify multiple queries
   */
  async classifyBatch(inputs: IntentClassificationInput[]): Promise<IntentClassificationResult[]> {
    return Promise.all(inputs.map(input => this.classify(input)));
  }
}
