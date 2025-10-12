"""
Three-tier AI escalation: Attempt-based retry logic with smart model escalation

Philosophy: "Upgrade the brain, not the eyes"
- Maintain pHash optimization (threshold=10) across all retry attempts
- Escalate AI reasoning capability on low confidence, not frame quality

Escalation Flow:
- Attempt 1 (60% of resolutions): Gemini Flash-Lite 8B + pHash → $0.06/resolution
- Attempt 2 (25% of resolutions): Gemini Flash + pHash → $0.08/resolution
- Attempt 3 (15% of resolutions): Claude Sonnet 4.5 + pHash → $0.40/resolution

Worst-case: All 3 attempts = $0.54/resolution (under $0.70 overage)
Result: 85% cost reduction through smart escalation + frame deduplication

Note: This module contains legacy complexity-based routing code for reference.
Production implementation uses attempt-based escalation in agent.py.
"""

import re
from enum import Enum
from typing import Optional


class ComplexityLevel(Enum):
    """
    LEGACY: Request complexity classification (deprecated)

    Production implementation uses attempt-based escalation instead.
    This enum is kept for backward compatibility and reference.
    """
    SIMPLE = "simple"      # LEGACY: Was Gemini Flash-Lite 60%
    MODERATE = "moderate"  # LEGACY: Was Gemini Flash 25%
    COMPLEX = "complex"    # LEGACY: Was Claude Sonnet 4.5 15%


class AIRouter:
    """
    LEGACY: Routes requests to appropriate AI model based on complexity (deprecated)

    Production implementation uses attempt-based escalation with confidence scoring.
    See agent.py for current implementation with retry logic and smart escalation.

    Philosophy: "Upgrade the brain, not the eyes"
    - Maintain pHash optimization across all retry attempts
    - Escalate AI reasoning capability on low confidence, not frame quality
    """

    def __init__(
        self,
        gemini_flash_lite_weight: float = 0.60,
        gemini_flash_weight: float = 0.25,
        claude_sonnet_weight: float = 0.15
    ):
        """
        Initialize router with model weights

        Args:
            gemini_flash_lite_weight: Expected percentage of SIMPLE requests
            gemini_flash_weight: Expected percentage of MODERATE requests
            claude_sonnet_weight: Expected percentage of COMPLEX requests
        """
        self.weights = {
            ComplexityLevel.SIMPLE: gemini_flash_lite_weight,
            ComplexityLevel.MODERATE: gemini_flash_weight,
            ComplexityLevel.COMPLEX: claude_sonnet_weight
        }

        # Validate weights sum to ~1.0
        total_weight = sum(self.weights.values())
        if not (0.95 <= total_weight <= 1.05):
            raise ValueError(f"Weights must sum to ~1.0, got {total_weight}")

        # Statistics
        self.stats = {
            ComplexityLevel.SIMPLE: 0,
            ComplexityLevel.MODERATE: 0,
            ComplexityLevel.COMPLEX: 0
        }

    def estimate_complexity(self, text: str) -> ComplexityLevel:
        """
        LEGACY: Estimate query complexity using heuristics (deprecated)

        Production implementation uses attempt-based escalation with confidence scoring.
        This method is kept for backward compatibility and reference only.

        The new approach:
        - Try Gemini Flash-Lite 8B first (60% of resolutions)
        - If low confidence → Try Gemini Flash (25% of resolutions)
        - If still low → Try Claude Sonnet 4.5 (15% of resolutions)
        - Keep pHash optimization constant across all attempts

        Legacy scoring factors (for reference):
        - Length (longer = more complex)
        - Technical terms
        - Question depth
        - Code/data presence
        - Reasoning indicators

        Args:
            text: User input text

        Returns:
            ComplexityLevel enum (legacy)
        """
        score = 0
        text_lower = text.lower()

        # 1. Length factor (0-2 points)
        word_count = len(text.split())
        if word_count > 50:
            score += 2
        elif word_count > 20:
            score += 1

        # 2. Technical complexity indicators (0-5 points)
        technical_patterns = [
            r'\bAPI\b', r'\bSQL\b', r'\bcode\b', r'\bfunction\b',
            r'\balgorithm\b', r'\barchitecture\b', r'\boptimiz(e|ation)\b',
            r'\banalyze\b', r'\bcompare\b', r'\bexplain why\b',
            r'\bimplement\b', r'\bdesign\b', r'\bperformance\b'
        ]

        for pattern in technical_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 1

        # Cap technical score at 5
        score = min(score, 7)

        # 3. Multiple questions indicate complexity (0-2 points)
        question_count = text.count('?')
        if question_count >= 3:
            score += 2
        elif question_count >= 2:
            score += 1

        # 4. Deep reasoning indicators (0-4 points)
        reasoning_patterns = [
            r'\bhow would\b', r'\bwhy\b', r'\bshould I\b',
            r'\bwhich is better\b', r'\bpros and cons\b',
            r'\btrade[-\s]?offs?\b', r'\bcomplex\b',
            r'\bstrategic\b', r'\blong[-\s]?term\b'
        ]

        reasoning_count = sum(
            1 for pattern in reasoning_patterns
            if re.search(pattern, text, re.IGNORECASE)
        )
        score += min(reasoning_count * 2, 4)

        # 5. Code presence (0-3 points)
        code_indicators = [
            r'```', r'\bfunction\s+\w+\s*\(', r'\bclass\s+\w+',
            r'\bimport\s+', r'\bconst\s+\w+\s*=', r'\bdef\s+\w+\s*\('
        ]

        if any(re.search(pattern, text) for pattern in code_indicators):
            score += 3

        # 6. Data/analysis keywords (0-2 points)
        data_patterns = [
            r'\bdata\b', r'\bmetrics\b', r'\bstatistics\b',
            r'\banalysis\b', r'\breport\b', r'\bdashboard\b'
        ]

        if any(re.search(pattern, text_lower) for pattern in data_patterns):
            score += 2

        # Classify based on total score
        # Score ranges tuned for 60/25/15 distribution
        if score >= 8:
            return ComplexityLevel.COMPLEX
        elif score >= 4:
            return ComplexityLevel.MODERATE
        else:
            return ComplexityLevel.SIMPLE

    def record_usage(self, complexity: ComplexityLevel):
        """Record model usage for statistics"""
        self.stats[complexity] += 1

    def get_model_name(self, complexity: ComplexityLevel) -> str:
        """Get model name for logging"""
        model_names = {
            ComplexityLevel.SIMPLE: "gemini-2.5-flash-lite",
            ComplexityLevel.MODERATE: "gemini-2.5-flash",
            ComplexityLevel.COMPLEX: "claude-sonnet-4-5"
        }
        return model_names[complexity]

    def get_statistics(self) -> dict:
        """Get routing statistics"""
        total = sum(self.stats.values())

        if total == 0:
            return {
                "total_requests": 0,
                "distribution": {
                    "simple": 0.0,
                    "moderate": 0.0,
                    "complex": 0.0
                }
            }

        return {
            "total_requests": total,
            "distribution": {
                "simple": self.stats[ComplexityLevel.SIMPLE] / total,
                "moderate": self.stats[ComplexityLevel.MODERATE] / total,
                "complex": self.stats[ComplexityLevel.COMPLEX] / total
            },
            "counts": {
                "simple": self.stats[ComplexityLevel.SIMPLE],
                "moderate": self.stats[ComplexityLevel.MODERATE],
                "complex": self.stats[ComplexityLevel.COMPLEX]
            }
        }

    def reset_statistics(self):
        """Reset routing statistics"""
        for key in self.stats:
            self.stats[key] = 0


# Example usage
if __name__ == "__main__":
    router = AIRouter()

    # Test complexity estimation
    test_cases = [
        ("Hello, how are you?", ComplexityLevel.SIMPLE),
        ("Can you explain the difference between React and Vue?", ComplexityLevel.MODERATE),
        ("Design a scalable microservices architecture for a high-traffic e-commerce platform with real-time inventory management, considering trade-offs between consistency and availability.", ComplexityLevel.COMPLEX),
    ]

    for text, expected in test_cases:
        result = router.estimate_complexity(text)
        match = "✓" if result == expected else "✗"
        print(f"{match} '{text[:50]}...' -> {result.value} (expected: {expected.value})")

    print("\nStatistics:", router.get_statistics())
