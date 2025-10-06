"""
Routing Intelligence Layer

Complexity-based routing algorithms for cost optimization:
- Vision routing: Simple frames → Gemini Flash, Complex frames → Claude Sonnet
- LLM routing: Simple queries → GPT-4o-mini, Complex queries → GPT-4o

Complexity assessment based on:
- Query patterns (multi-step, comparisons, reasoning)
- Visual complexity (UI elements, charts, forms)
- Context requirements (short vs long-term memory)
"""

from .complexity import ComplexityAssessor, VisionComplexityScorer, QueryComplexityScorer

__all__ = [
    "ComplexityAssessor",
    "VisionComplexityScorer",
    "QueryComplexityScorer",
]
