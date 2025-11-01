"""
Phase 12 Week 3: Prompt Engineering Integration for LiveKit Agent
Production-grade prompt management with dynamic selection
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import json
import re

class PromptType(Enum):
    BASE = "base"
    TECHNICAL = "technical"
    CONVERSATIONAL = "conversational"

class UserSentiment(Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    FRUSTRATED = "frustrated"

@dataclass
class ConversationContext:
    tenant_name: Optional[str] = None
    user_name: Optional[str] = None
    conversation_history: List[Dict[str, str]] = None
    retrieved_context: Optional[str] = None
    escalation_attempts: int = 0
    session_duration_minutes: float = 0
    problem_complexity: str = "simple"  # simple, moderate, complex
    user_sentiment: UserSentiment = UserSentiment.NEUTRAL
    issue_category: Optional[str] = None

    def __post_init__(self):
        if self.conversation_history is None:
            self.conversation_history = []

@dataclass
class EscalationDecision:
    should_escalate: bool
    reason: str
    priority: str  # low, medium, high, urgent
    recommended_specialist: Optional[str] = None

class PromptEngineer:
    """
    Dynamic prompt selection and construction for LiveKit AI agent
    """

    # Base system prompt - foundation for all interactions
    BASE_SYSTEM_PROMPT = """You are a professional AI customer support assistant with expertise in technical troubleshooting and product knowledge.

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
3. Confirm understanding and offer follow-up assistance"""

    # Technical specialist prompt
    TECHNICAL_SPECIALIST_PROMPT = f"""{BASE_SYSTEM_PROMPT}

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
5. **Document**: Summarize what was done for future reference"""

    # Conversational agent prompt
    CONVERSATIONAL_AGENT_PROMPT = f"""{BASE_SYSTEM_PROMPT}

CONVERSATIONAL SUPPORT FOCUS:
You excel at handling general inquiries, account questions, and product usage guidance.

COMMUNICATION STYLE:
- Warm and approachable tone
- Patient with non-technical users
- Break down complex concepts into simple terms
- Use analogies when helpful"""

    # Hallucination prevention constraints
    HALLUCINATION_CONSTRAINTS = [
        "Never invent features, pricing, or capabilities not explicitly documented",
        "If unsure about specific details (dates, versions, limits), acknowledge uncertainty",
        "Prefer 'I don't have that specific information' over guessing",
        "Always distinguish between general knowledge and product-specific facts",
    ]

    def __init__(self):
        self.current_context = ConversationContext()
        self.prompts = {
            PromptType.BASE: self.BASE_SYSTEM_PROMPT,
            PromptType.TECHNICAL: self.TECHNICAL_SPECIALIST_PROMPT,
            PromptType.CONVERSATIONAL: self.CONVERSATIONAL_AGENT_PROMPT,
        }

    def select_prompt_type(self, user_message: str) -> PromptType:
        """
        Classify user message to select appropriate prompt type
        """
        message_lower = user_message.lower()

        # Technical indicators
        technical_terms = [
            'configure', 'implement', 'integrate', 'api', 'ssl', 'debug',
            'install', 'setup', 'error', 'code', 'deploy', 'server', 'database'
        ]

        if any(term in message_lower for term in technical_terms):
            return PromptType.TECHNICAL

        # Conversational indicators
        conversational_terms = [
            'how do i', 'help me', 'can you', 'what is', 'explain',
            'account', 'billing', 'profile', 'settings'
        ]

        if any(term in message_lower for term in conversational_terms):
            return PromptType.CONVERSATIONAL

        return PromptType.BASE

    def build_prompt(
        self,
        prompt_type: PromptType,
        context: ConversationContext
    ) -> str:
        """
        Build complete prompt with context
        """
        base_prompt = self.prompts[prompt_type]

        # Add conversation history
        if context.conversation_history:
            base_prompt += "\n\nCONVERSATION HISTORY:\n"
            for msg in context.conversation_history[-10:]:  # Last 10 messages
                role = msg.get('role', 'user').upper()
                content = msg.get('content', '')
                base_prompt += f"{role}: {content}\n"

        # Add knowledge base context
        if context.retrieved_context:
            base_prompt += "\n\nKNOWLEDGE BASE CONTEXT:\n"
            base_prompt += context.retrieved_context
            base_prompt += "\n\n(Cite this context as [KB: Source] when using it)"

        # Add escalation context
        if context.escalation_attempts > 0:
            base_prompt += f"\n\nNOTE: This is escalation attempt {context.escalation_attempts}. "
            base_prompt += f"User has already tried resolving this {context.escalation_attempts} time(s)."

        # Add constraints
        base_prompt += "\n\nCONSTRAINTS:\n"
        for constraint in self.HALLUCINATION_CONSTRAINTS:
            base_prompt += f"- {constraint}\n"

        return base_prompt

    def evaluate_escalation_need(self, context: ConversationContext) -> EscalationDecision:
        """
        Determine if human escalation is needed
        """
        # Immediate escalation triggers
        if context.issue_category in ['billing', 'refund', 'account_suspension', 'legal', 'security_incident']:
            return EscalationDecision(
                should_escalate=True,
                reason=f"Issue category '{context.issue_category}' requires human specialist",
                priority='urgent' if context.issue_category == 'security_incident' else 'high',
                recommended_specialist=context.issue_category
            )

        # Frustration-based escalation
        if context.user_sentiment == UserSentiment.FRUSTRATED and context.escalation_attempts >= 1:
            return EscalationDecision(
                should_escalate=True,
                reason="User showing frustration, early escalation recommended",
                priority='high'
            )

        # Complexity + time-based escalation
        if context.problem_complexity == 'complex' and context.session_duration_minutes > 15:
            return EscalationDecision(
                should_escalate=True,
                reason="Complex issue not resolved within 15 minutes",
                priority='medium',
                recommended_specialist='technical'
            )

        # Attempt-based escalation
        if context.escalation_attempts >= 3:
            return EscalationDecision(
                should_escalate=True,
                reason="Failed to resolve after 3 attempts",
                priority='medium'
            )

        # Time-based warning
        if context.session_duration_minutes > 20 and context.escalation_attempts >= 2:
            return EscalationDecision(
                should_escalate=True,
                reason="Session exceeding 20 minutes without resolution",
                priority='low'
            )

        return EscalationDecision(
            should_escalate=False,
            reason="Continue AI resolution attempts",
            priority='low'
        )

    def calculate_response_confidence(
        self,
        response: str,
        kb_context_provided: bool
    ) -> Dict[str, Any]:
        """
        Calculate confidence score for AI response
        """
        # Count uncertainty markers
        uncertainty_markers = [
            'maybe', 'might', 'probably', 'possibly', 'uncertain',
            'not sure', 'unclear', 'I think', 'I believe', 'could be'
        ]

        uncertainty_count = sum(
            len(re.findall(rf'\b{marker}\b', response.lower()))
            for marker in uncertainty_markers
        )

        # Count KB citations
        kb_citations = len(re.findall(r'\[KB:', response))

        # Calculate factors
        kb_coverage = min(kb_citations / 2, 1.0) if kb_context_provided else 0.3
        response_specificity = min(len(response) / 500, 1.0) if len(response) > 100 else 0.5
        uncertainty_penalty = max(0, 1 - (uncertainty_count * 0.2))

        # Weighted score
        confidence_score = (
            kb_coverage * 0.4 +
            response_specificity * 0.3 +
            uncertainty_penalty * 0.3
        )

        return {
            'score': confidence_score,
            'factors': {
                'knowledge_base_coverage': kb_coverage,
                'response_specificity': response_specificity,
                'uncertainty_markers': uncertainty_count,
                'citation_count': kb_citations
            },
            'should_escalate': confidence_score < 0.5
        }

    def generate_resolution_verification_prompt(self) -> str:
        """
        Generate prompt for verifying if issue was resolved
        """
        return """Based on the conversation, evaluate if the user's problem has been fully resolved.

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
}"""

    def detect_user_sentiment(self, message: str) -> UserSentiment:
        """
        Detect user sentiment from message
        """
        message_lower = message.lower()

        # Frustrated indicators
        frustrated_indicators = [
            'frustrated', 'angry', 'upset', 'terrible', 'awful',
            'worst', 'hate', 'horrible', 'useless', 'waste'
        ]

        if any(indicator in message_lower for indicator in frustrated_indicators):
            return UserSentiment.FRUSTRATED

        # Negative indicators
        negative_indicators = [
            'problem', 'issue', 'broken', 'not working', 'doesn\'t work',
            'failed', 'error', 'bug', 'crash'
        ]

        if any(indicator in message_lower for indicator in negative_indicators):
            return UserSentiment.NEGATIVE

        # Positive indicators
        positive_indicators = [
            'thank', 'thanks', 'great', 'perfect', 'excellent',
            'helpful', 'solved', 'fixed', 'working now'
        ]

        if any(indicator in message_lower for indicator in positive_indicators):
            return UserSentiment.POSITIVE

        return UserSentiment.NEUTRAL

# Example usage in LiveKit agent
if __name__ == "__main__":
    # Initialize prompt engineer
    prompt_eng = PromptEngineer()

    # Example context
    context = ConversationContext(
        tenant_name="Acme Corp",
        user_name="John Doe",
        conversation_history=[
            {"role": "user", "content": "I'm having trouble configuring SSL certificates"},
            {"role": "assistant", "content": "I can help with that. What web server are you using?"}
        ],
        retrieved_context="SSL certificate configuration requires: 1) Valid certificate file, 2) Private key...",
        escalation_attempts=0,
        session_duration_minutes=5,
        problem_complexity="moderate"
    )

    # Select prompt type
    user_message = "I'm having trouble configuring SSL certificates"
    prompt_type = prompt_eng.select_prompt_type(user_message)
    print(f"Selected prompt type: {prompt_type}")

    # Build complete prompt
    full_prompt = prompt_eng.build_prompt(prompt_type, context)
    print(f"\nFull prompt:\n{full_prompt[:500]}...")

    # Evaluate escalation need
    escalation = prompt_eng.evaluate_escalation_need(context)
    print(f"\nEscalation decision: {escalation}")

    # Calculate confidence for a response
    response = "Based on the knowledge base [KB: SSL Guide], you need to..."
    confidence = prompt_eng.calculate_response_confidence(response, kb_context_provided=True)
    print(f"\nResponse confidence: {confidence}")
