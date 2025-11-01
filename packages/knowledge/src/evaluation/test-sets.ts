/**
 * Default Test Sets for RAGAS Evaluation (Phase 12 Week 4)
 *
 * Provides comprehensive test cases covering:
 * - Factual queries (straightforward facts)
 * - Analytical queries (requiring reasoning)
 * - Multi-hop queries (requiring multiple sources)
 * - Edge cases (ambiguous, out-of-scope)
 */

export interface TestCase {
  query: string;
  expectedContext?: string[];
  expectedAnswer?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface TestSet {
  name: string;
  description: string;
  testCases: TestCase[];
  tags?: string[];
}

// ==================== DEFAULT TEST SETS ====================

export const DEFAULT_TEST_SETS: TestSet[] = [
  {
    name: 'Baseline Quality Assurance',
    description: 'Comprehensive baseline test set covering common query patterns',
    tags: ['baseline', 'quality-assurance'],
    testCases: [
      // Factual queries (easy)
      {
        query: 'What are the business hours?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'What is the return policy?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'How do I reset my password?',
        category: 'procedural',
        difficulty: 'easy',
      },
      {
        query: 'What payment methods are accepted?',
        category: 'factual',
        difficulty: 'easy',
      },

      // Analytical queries (medium)
      {
        query: 'What is the difference between the Basic and Premium plans?',
        category: 'analytical',
        difficulty: 'medium',
      },
      {
        query: 'Why was my account suspended?',
        category: 'analytical',
        difficulty: 'medium',
      },
      {
        query: 'How can I improve my account security?',
        category: 'analytical',
        difficulty: 'medium',
      },
      {
        query: 'What happens if I cancel my subscription?',
        category: 'analytical',
        difficulty: 'medium',
      },

      // Multi-hop queries (hard)
      {
        query: 'I upgraded to Premium but still see ads. What should I do?',
        category: 'multi-hop',
        difficulty: 'hard',
      },
      {
        query: 'Can I transfer my subscription to a different email address?',
        category: 'multi-hop',
        difficulty: 'hard',
      },
      {
        query: 'If I cancel today, will I get a refund for the remaining days?',
        category: 'multi-hop',
        difficulty: 'hard',
      },

      // Edge cases
      {
        query: 'What is the meaning of life?',
        category: 'out-of-scope',
        difficulty: 'easy',
      },
      {
        query: 'Can you help me with my math homework?',
        category: 'out-of-scope',
        difficulty: 'easy',
      },
      {
        query: 'What time is it?',
        category: 'out-of-scope',
        difficulty: 'easy',
      },
    ],
  },

  {
    name: 'Technical Support Queries',
    description: 'Test set focused on technical troubleshooting scenarios',
    tags: ['technical', 'support'],
    testCases: [
      {
        query: 'The app keeps crashing when I try to upload a file',
        category: 'troubleshooting',
        difficulty: 'medium',
      },
      {
        query: 'I cannot connect to the VPN',
        category: 'troubleshooting',
        difficulty: 'medium',
      },
      {
        query: 'Error code 500 when submitting the form',
        category: 'troubleshooting',
        difficulty: 'medium',
      },
      {
        query: 'How do I export my data in CSV format?',
        category: 'procedural',
        difficulty: 'easy',
      },
      {
        query: 'What are the API rate limits?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'How do I integrate with Slack?',
        category: 'procedural',
        difficulty: 'medium',
      },
    ],
  },

  {
    name: 'Billing and Pricing',
    description: 'Test set focused on billing, pricing, and subscription queries',
    tags: ['billing', 'pricing'],
    testCases: [
      {
        query: 'How much does the Premium plan cost?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'Do you offer student discounts?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'Can I get a refund?',
        category: 'analytical',
        difficulty: 'medium',
      },
      {
        query: 'Why was I charged twice this month?',
        category: 'troubleshooting',
        difficulty: 'medium',
      },
      {
        query: 'How do I update my billing information?',
        category: 'procedural',
        difficulty: 'easy',
      },
      {
        query: 'What happens if my payment fails?',
        category: 'analytical',
        difficulty: 'medium',
      },
      {
        query: 'Can I switch from monthly to annual billing?',
        category: 'procedural',
        difficulty: 'medium',
      },
    ],
  },

  {
    name: 'Product Features',
    description: 'Test set covering product capabilities and features',
    tags: ['features', 'product'],
    testCases: [
      {
        query: 'Does the platform support video conferencing?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'Can I customize the AI personality?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'What integrations are available?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'Is there a mobile app?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'How does the knowledge base work?',
        category: 'analytical',
        difficulty: 'medium',
      },
      {
        query: 'What is the maximum number of users allowed?',
        category: 'factual',
        difficulty: 'easy',
      },
      {
        query: 'Can I upload custom training data?',
        category: 'analytical',
        difficulty: 'medium',
      },
    ],
  },
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Create a default test set for a tenant
 */
export function createDefaultTestSet(
  tenantId: string,
  testSetName = 'Baseline Quality Assurance'
): {
  tenantId: string;
  name: string;
  description: string;
  testCases: TestCase[];
  metadata: { tags?: string[]; source: string };
} {
  const testSet = DEFAULT_TEST_SETS.find(ts => ts.name === testSetName);

  if (!testSet) {
    throw new Error(`Test set "${testSetName}" not found`);
  }

  return {
    tenantId,
    name: testSet.name,
    description: testSet.description,
    testCases: testSet.testCases,
    metadata: {
      tags: testSet.tags,
      source: 'default',
    },
  };
}

/**
 * Get all available test set names
 */
export function getAvailableTestSets(): string[] {
  return DEFAULT_TEST_SETS.map(ts => ts.name);
}

/**
 * Get test set statistics
 */
export function getTestSetStats(testSetName: string): {
  totalCases: number;
  categoriesCount: Record<string, number>;
  difficultiesCount: Record<string, number>;
} {
  const testSet = DEFAULT_TEST_SETS.find(ts => ts.name === testSetName);

  if (!testSet) {
    throw new Error(`Test set "${testSetName}" not found`);
  }

  const categoriesCount: Record<string, number> = {};
  const difficultiesCount: Record<string, number> = {};

  for (const testCase of testSet.testCases) {
    if (testCase.category) {
      categoriesCount[testCase.category] = (categoriesCount[testCase.category] || 0) + 1;
    }
    if (testCase.difficulty) {
      difficultiesCount[testCase.difficulty] = (difficultiesCount[testCase.difficulty] || 0) + 1;
    }
  }

  return {
    totalCases: testSet.testCases.length,
    categoriesCount,
    difficultiesCount,
  };
}
