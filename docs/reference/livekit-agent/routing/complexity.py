"""
Complexity Assessment for Cost-Optimized Routing

Determines whether to use routine (cheap) or premium (expensive) AI providers
based on query and visual complexity analysis.

Routing Strategy:
- Vision: <0.7 → Gemini Flash (85%), ≥0.7 → Claude Sonnet (15%)
- LLM: <0.5 → GPT-4o-mini (70%), ≥0.5 → GPT-4o (30%)

Complexity Factors:
- Multi-step reasoning ("then", "after", "next")
- Comparative analysis ("compare", "versus", "difference")
- Temporal references ("before", "after", "history")
- Technical depth ("debug", "analyze", "explain why")
- Visual complexity (charts, forms, code, multiple UI elements)
"""

import re
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ComplexityResult:
    """Result of complexity assessment"""
    score: float  # 0.0 - 1.0
    factors: Dict[str, float]  # Individual factor contributions
    recommended_tier: str  # "routine" or "premium"
    explanation: str  # Human-readable reasoning


class QueryComplexityScorer:
    """Assess complexity of text queries for LLM routing"""

    # Pattern weights (sum to 1.0 for normalization)
    MULTI_STEP_WEIGHT = 0.25
    COMPARATIVE_WEIGHT = 0.20
    TEMPORAL_WEIGHT = 0.15
    TECHNICAL_WEIGHT = 0.20
    LENGTH_WEIGHT = 0.10
    REASONING_WEIGHT = 0.10

    # Complexity patterns
    MULTI_STEP_PATTERNS = [
        r"\b(then|after|next|following|step|first|second|third)\b",
        r"\b(and then|after that|once.*complete)\b",
    ]

    COMPARATIVE_PATTERNS = [
        r"\b(compare|versus|vs|difference|similar|better|worse)\b",
        r"\b(which|what.*best|should I choose)\b",
    ]

    TEMPORAL_PATTERNS = [
        r"\b(before|after|previously|earlier|later|history|past)\b",
        r"\b(timeline|chronological|sequence)\b",
    ]

    TECHNICAL_PATTERNS = [
        r"\b(debug|analyze|explain why|root cause|troubleshoot)\b",
        r"\b(architecture|design pattern|optimize|refactor)\b",
        r"\b(algorithm|complexity|performance|scalability)\b",
    ]

    REASONING_PATTERNS = [
        r"\b(because|reason|why|how come|explain)\b",
        r"\b(implication|consequence|impact|effect)\b",
    ]

    def assess(self, query: str) -> ComplexityResult:
        """
        Assess query complexity for LLM routing.

        Args:
            query: User query text

        Returns:
            ComplexityResult with score and routing recommendation
        """
        query_lower = query.lower()
        factors = {}

        # Multi-step reasoning
        multi_step = self._count_pattern_matches(query_lower, self.MULTI_STEP_PATTERNS)
        factors["multi_step"] = min(multi_step * 0.3, 1.0) * self.MULTI_STEP_WEIGHT

        # Comparative analysis
        comparative = self._count_pattern_matches(query_lower, self.COMPARATIVE_PATTERNS)
        factors["comparative"] = min(comparative * 0.4, 1.0) * self.COMPARATIVE_WEIGHT

        # Temporal reasoning
        temporal = self._count_pattern_matches(query_lower, self.TEMPORAL_PATTERNS)
        factors["temporal"] = min(temporal * 0.3, 1.0) * self.TEMPORAL_WEIGHT

        # Technical depth
        technical = self._count_pattern_matches(query_lower, self.TECHNICAL_PATTERNS)
        factors["technical"] = min(technical * 0.4, 1.0) * self.TECHNICAL_WEIGHT

        # Query length (longer = more complex)
        word_count = len(query.split())
        length_complexity = min(word_count / 50, 1.0)  # Cap at 50 words
        factors["length"] = length_complexity * self.LENGTH_WEIGHT

        # Reasoning requirements
        reasoning = self._count_pattern_matches(query_lower, self.REASONING_PATTERNS)
        factors["reasoning"] = min(reasoning * 0.4, 1.0) * self.REASONING_WEIGHT

        # Calculate total score
        total_score = sum(factors.values())

        # Determine tier (threshold: 0.5 for LLM routing)
        recommended_tier = "premium" if total_score >= 0.5 else "routine"

        # Build explanation
        top_factors = sorted(
            [(k, v) for k, v in factors.items() if v > 0.1],
            key=lambda x: x[1],
            reverse=True
        )
        explanation = f"Score: {total_score:.2f}. "
        if top_factors:
            explanation += f"Key factors: {', '.join([f'{k}({v:.2f})' for k, v in top_factors[:3]])}"

        return ComplexityResult(
            score=total_score,
            factors=factors,
            recommended_tier=recommended_tier,
            explanation=explanation
        )

    def _count_pattern_matches(self, text: str, patterns: List[str]) -> int:
        """Count matches across multiple regex patterns"""
        count = 0
        for pattern in patterns:
            count += len(re.findall(pattern, text, re.IGNORECASE))
        return count


class VisionComplexityScorer:
    """Assess complexity of vision analysis tasks for vision routing"""

    # Pattern weights for vision complexity
    UI_ELEMENT_WEIGHT = 0.20
    CHART_WEIGHT = 0.25
    CODE_WEIGHT = 0.20
    FORM_WEIGHT = 0.15
    MULTI_ITEM_WEIGHT = 0.20

    # Vision complexity patterns
    UI_PATTERNS = [
        r"\b(button|menu|dropdown|checkbox|radio|input|field)\b",
        r"\b(click|select|choose|pick|navigate)\b",
    ]

    CHART_PATTERNS = [
        r"\b(chart|graph|plot|visualization|dashboard)\b",
        r"\b(trend|metric|data|analytics)\b",
    ]

    CODE_PATTERNS = [
        r"\b(code|function|variable|class|method|API)\b",
        r"\b(syntax|error|bug|debug)\b",
    ]

    FORM_PATTERNS = [
        r"\b(form|submit|validate|required|optional)\b",
        r"\b(fill|enter|type|input)\b",
    ]

    MULTI_ITEM_PATTERNS = [
        r"\b(all|each|every|multiple|several|list)\b",
        r"\b(compare.*items|find all|select multiple)\b",
    ]

    def assess(self, prompt: str, frame_metadata: Optional[Dict] = None) -> ComplexityResult:
        """
        Assess vision task complexity for vision routing.

        Args:
            prompt: Vision analysis prompt
            frame_metadata: Optional metadata about the frame (UI elements, etc.)

        Returns:
            ComplexityResult with score and routing recommendation
        """
        prompt_lower = prompt.lower()
        factors = {}

        # UI element analysis
        ui_matches = self._count_pattern_matches(prompt_lower, self.UI_PATTERNS)
        factors["ui_elements"] = min(ui_matches * 0.2, 1.0) * self.UI_ELEMENT_WEIGHT

        # Chart/data visualization
        chart_matches = self._count_pattern_matches(prompt_lower, self.CHART_PATTERNS)
        factors["charts"] = min(chart_matches * 0.3, 1.0) * self.CHART_WEIGHT

        # Code analysis
        code_matches = self._count_pattern_matches(prompt_lower, self.CODE_PATTERNS)
        factors["code"] = min(code_matches * 0.3, 1.0) * self.CODE_WEIGHT

        # Form analysis
        form_matches = self._count_pattern_matches(prompt_lower, self.FORM_PATTERNS)
        factors["forms"] = min(form_matches * 0.2, 1.0) * self.FORM_WEIGHT

        # Multi-item analysis
        multi_matches = self._count_pattern_matches(prompt_lower, self.MULTI_ITEM_PATTERNS)
        factors["multi_item"] = min(multi_matches * 0.3, 1.0) * self.MULTI_ITEM_WEIGHT

        # Frame metadata boost (if available)
        if frame_metadata:
            ui_count = frame_metadata.get("ui_element_count", 0)
            if ui_count > 10:
                factors["ui_elements"] = min(factors.get("ui_elements", 0) + 0.2, 1.0)

        # Calculate total score
        total_score = sum(factors.values())

        # Determine tier (threshold: 0.7 for vision routing)
        recommended_tier = "premium" if total_score >= 0.7 else "routine"

        # Build explanation
        top_factors = sorted(
            [(k, v) for k, v in factors.items() if v > 0.1],
            key=lambda x: x[1],
            reverse=True
        )
        explanation = f"Score: {total_score:.2f}. "
        if top_factors:
            explanation += f"Key factors: {', '.join([f'{k}({v:.2f})' for k, v in top_factors[:3]])}"

        return ComplexityResult(
            score=total_score,
            factors=factors,
            recommended_tier=recommended_tier,
            explanation=explanation
        )

    def _count_pattern_matches(self, text: str, patterns: List[str]) -> int:
        """Count matches across multiple regex patterns"""
        count = 0
        for pattern in patterns:
            count += len(re.findall(pattern, text, re.IGNORECASE))
        return count


class ComplexityAssessor:
    """
    Main complexity assessor orchestrating query and vision scoring.

    Usage:
        assessor = ComplexityAssessor()

        # For LLM routing
        result = assessor.assess_query("Compare the performance of these two algorithms")
        if result.score >= 0.5:
            use_gpt4o()  # Premium
        else:
            use_gpt4o_mini()  # Routine

        # For vision routing
        result = assessor.assess_vision("Analyze this chart and explain the trend")
        if result.score >= 0.7:
            use_claude_sonnet()  # Premium
        else:
            use_gemini_flash()  # Routine
    """

    def __init__(self):
        self.query_scorer = QueryComplexityScorer()
        self.vision_scorer = VisionComplexityScorer()

    def assess_query(self, query: str) -> ComplexityResult:
        """Assess query complexity for LLM routing (threshold: 0.5)"""
        return self.query_scorer.assess(query)

    def assess_vision(
        self,
        prompt: str,
        frame_metadata: Optional[Dict] = None
    ) -> ComplexityResult:
        """Assess vision task complexity for vision routing (threshold: 0.7)"""
        return self.vision_scorer.assess(prompt, frame_metadata)
