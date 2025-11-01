/**
 * Phase 12 Week 3: Prompt Engineering System
 * Production-grade prompts for enterprise AI customer support
 */

export interface PromptContext {
  tenantName?: string;
  userName?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  retrievedContext?: string;
  escalationAttempts?: number;
  sessionDuration?: number;
  problemComplexity?: 'simple' | 'moderate' | 'complex';
}

export interface PromptTemplate {
  system: string;
  few_shot_examples?: Array<{ user: string; assistant: string }>;
  constraints: string[];
  escalation_triggers: string[];
}

/**
 * Base System Prompt - Foundation for all interactions
 */
export const BASE_SYSTEM_PROMPT = `You are a professional AI customer support assistant with expertise in technical troubleshooting and product knowledge.

CORE PRINCIPLES:
1. **Accuracy First**: Only provide information you are confident about
2. **Cite Sources**: Reference the knowledge base context when available
3. **Progressive Disclosure**: Start simple, add details as needed
4. **Empathy**: Acknowledge user frustration and validate their concerns
5. **Clarity**: Use clear, jargon-free language unless technical depth is requested

KNOWLEDGE BASE USAGE:
- When knowledge base context is provided, cite it as [KB: Source]
- If context doesn't contain the answer, clearly state this
- Never fabricate information or make unsupported claims

ESCALATION PROTOCOL:
- If you cannot resolve the issue after 2 attempts, offer human escalation
- If user explicitly requests human support, escalate immediately
- If issue involves billing, refunds, or account suspension, escalate to human

RESPONSE STRUCTURE:
1. Acknowledge the user's specific problem
2. Provide the solution or next steps
3. Confirm understanding and offer follow-up assistance`;

/**
 * Technical Troubleshooting Specialist Prompt
 */
export const TECHNICAL_SPECIALIST_PROMPT = `${BASE_SYSTEM_PROMPT}

TECHNICAL TROUBLESHOOTING EXPERTISE:
You specialize in diagnosing and resolving technical issues including:
- Configuration problems
- Integration failures
- API errors and debugging
- Performance issues
- Security concerns

DIAGNOSTIC APPROACH:
1. **Gather Information**: Ask clarifying questions about the environment
2. **Isolate Variables**: Identify what changed or what's unique about the setup
3. **Test Hypotheses**: Suggest specific tests to narrow down root cause
4. **Provide Solutions**: Offer step-by-step resolution with validation steps
5. **Document**: Summarize what was done for future reference

TECHNICAL COMMUNICATION:
- Use technical terminology appropriately
- Provide code examples when helpful
- Link to documentation for further reading
- Explain the "why" behind solutions`;

/**
 * Conversational Support Agent Prompt
 */
export const CONVERSATIONAL_AGENT_PROMPT = `${BASE_SYSTEM_PROMPT}

CONVERSATIONAL SUPPORT FOCUS:
You excel at handling general inquiries, account questions, and product usage guidance.

COMMUNICATION STYLE:
- Warm and approachable tone
- Patient with non-technical users
- Break down complex concepts into simple terms
- Use analogies when helpful

COMMON SCENARIOS:
- Account setup and configuration
- Feature explanations and tutorials
- Billing inquiries (escalate to human for disputes)
- General product navigation
- Best practices guidance`;

/**
 * Hallucination Prevention Patterns
 */
export const HALLUCINATION_PREVENTION_CONSTRAINTS = [
  "Never invent features, pricing, or capabilities not explicitly documented",
  "If unsure about specific details (dates, versions, limits), acknowledge uncertainty",
  "Prefer 'I don't have that specific information' over guessing",
  "Always distinguish between general knowledge and product-specific facts",
  "When referencing knowledge base, cite the specific section",
];

/**
 * Escalation Decision Logic
 */
export interface EscalationDecision {
  should_escalate: boolean;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recommended_specialist?: string;
}

export function evaluateEscalationNeed(context: {
  attempts: number;
  session_duration_minutes: number;
  user_sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated';
  issue_complexity?: 'simple' | 'moderate' | 'complex';
  explicit_request?: boolean;
  issue_category?: string;
}): EscalationDecision {
  const { attempts, session_duration_minutes, user_sentiment, issue_complexity, explicit_request, issue_category } = context;

  // Immediate escalation triggers
  if (explicit_request) {
    return {
      should_escalate: true,
      reason: "User explicitly requested human support",
      priority: 'high',
    };
  }

  if (issue_category && ['billing', 'refund', 'account_suspension', 'legal', 'security_incident'].includes(issue_category)) {
    return {
      should_escalate: true,
      reason: `Issue category '${issue_category}' requires human specialist`,
      priority: issue_category === 'security_incident' ? 'urgent' : 'high',
      recommended_specialist: issue_category,
    };
  }

  // Frustration-based escalation
  if (user_sentiment === 'frustrated' && attempts >= 1) {
    return {
      should_escalate: true,
      reason: "User showing frustration, early escalation recommended",
      priority: 'high',
    };
  }

  // Complexity + time-based escalation
  if (issue_complexity === 'complex' && session_duration_minutes > 15) {
    return {
      should_escalate: true,
      reason: "Complex issue not resolved within 15 minutes",
      priority: 'medium',
      recommended_specialist: 'technical',
    };
  }

  // Attempt-based escalation
  if (attempts >= 3) {
    return {
      should_escalate: true,
      reason: "Failed to resolve after 3 attempts",
      priority: 'medium',
    };
  }

  // Time-based warning
  if (session_duration_minutes > 20 && attempts >= 2) {
    return {
      should_escalate: true,
      reason: "Session exceeding 20 minutes without resolution",
      priority: 'low',
    };
  }

  return {
    should_escalate: false,
    reason: "Continue AI resolution attempts",
    priority: 'low',
  };
}

/**
 * Build context-aware prompt
 */
export function buildPrompt(
  template: PromptTemplate,
  context: PromptContext
): string {
  let prompt = template.system;

  // Add conversation history if available
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    prompt += '\n\nCONVERSATION HISTORY:\n';
    prompt += context.conversationHistory
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  // Add retrieved context if available
  if (context.retrievedContext) {
    prompt += '\n\nKNOWLEDGE BASE CONTEXT:\n';
    prompt += context.retrievedContext;
    prompt += '\n\n(Cite this context as [KB: Source] when using it in your response)';
  }

  // Add escalation context if relevant
  if (context.escalationAttempts && context.escalationAttempts > 0) {
    prompt += `\n\nNOTE: This is escalation attempt ${context.escalationAttempts}. User has already tried resolving this ${context.escalationAttempts} time(s).`;
  }

  // Add constraints
  if (template.constraints.length > 0) {
    prompt += '\n\nCONSTRAINTS:\n';
    prompt += template.constraints.map((c) => `- ${c}`).join('\n');
  }

  return prompt;
}

/**
 * Confidence Scoring for Responses
 */
export interface ConfidenceScore {
  score: number; // 0-1 scale
  factors: {
    knowledge_base_coverage: number; // 0-1
    response_specificity: number; // 0-1
    uncertainty_markers: number; // Count of "maybe", "might", "probably"
    citation_count: number; // Number of KB citations
  };
  should_escalate: boolean;
}

export function calculateResponseConfidence(
  response: string,
  kb_context_provided: boolean,
  kb_citations_count: number
): ConfidenceScore {
  const uncertaintyMarkers = [
    'maybe', 'might', 'probably', 'possibly', 'uncertain',
    'not sure', 'unclear', 'I think', 'I believe', 'could be'
  ];

  const uncertaintyCount = uncertaintyMarkers.reduce((count, marker) =>
    count + (response.toLowerCase().match(new RegExp(marker, 'g'))?.length || 0),
    0
  );

  // Factors
  const knowledge_base_coverage = kb_context_provided ? Math.min(kb_citations_count / 2, 1.0) : 0.3;
  const response_specificity = response.length > 100 ? Math.min(response.length / 500, 1.0) : 0.5;
  const uncertainty_penalty = Math.max(0, 1 - (uncertaintyCount * 0.2));

  // Weighted score
  const score = (
    knowledge_base_coverage * 0.4 +
    response_specificity * 0.3 +
    uncertainty_penalty * 0.3
  );

  return {
    score,
    factors: {
      knowledge_base_coverage,
      response_specificity,
      uncertainty_markers: uncertaintyCount,
      citation_count: kb_citations_count,
    },
    should_escalate: score < 0.5, // Low confidence triggers escalation offer
  };
}

/**
 * Resolution Verification Prompt
 */
export const RESOLUTION_VERIFICATION_PROMPT = `Based on the conversation, evaluate if the user's problem has been fully resolved.

VERIFICATION CRITERIA:
1. User explicitly confirmed solution worked
2. All mentioned issues have been addressed
3. No outstanding questions or concerns
4. User expressed satisfaction

Respond with JSON:
{
  "resolved": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "explanation",
  "follow_up_needed": true/false
}`;

/**
 * Export all prompt templates
 */
export const PROMPT_TEMPLATES = {
  base: {
    system: BASE_SYSTEM_PROMPT,
    constraints: HALLUCINATION_PREVENTION_CONSTRAINTS,
    escalation_triggers: [
      "User explicitly requests human support",
      "Issue involves billing, refunds, or account suspension",
      "Failed to resolve after 3 attempts",
      "Session exceeds 20 minutes without progress",
      "User shows high frustration",
    ],
  },
  technical: {
    system: TECHNICAL_SPECIALIST_PROMPT,
    constraints: [
      ...HALLUCINATION_PREVENTION_CONSTRAINTS,
      "Provide code examples only from official documentation",
      "Include version information when relevant",
      "Warn about breaking changes or deprecated features",
    ],
    escalation_triggers: [
      "Issue requires code review or debugging",
      "Problem involves infrastructure or deployment",
      "Security vulnerability identified",
      "Custom implementation or edge case",
    ],
  },
  conversational: {
    system: CONVERSATIONAL_AGENT_PROMPT,
    constraints: HALLUCINATION_PREVENTION_CONSTRAINTS,
    escalation_triggers: [
      "User needs sales consultation",
      "Account-specific inquiry beyond public knowledge",
      "Custom contract or pricing discussion",
    ],
  },
};
