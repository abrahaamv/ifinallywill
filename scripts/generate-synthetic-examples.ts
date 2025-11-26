/**
 * Synthetic Example Generation Script
 * Phase 12 Week 1 Day 5 - Golden Dataset Population
 *
 * Generates realistic customer support queries using Claude Sonnet
 * to fill the golden evaluation dataset to 200 examples
 *
 * Usage:
 *   pnpm tsx scripts/generate-synthetic-examples.ts --category simple --count 75
 *   pnpm tsx scripts/generate-synthetic-examples.ts --category moderate --count 65
 *   pnpm tsx scripts/generate-synthetic-examples.ts --category complex --count 37
 *   pnpm tsx scripts/generate-synthetic-examples.ts --category edge_case --count 5
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface SyntheticExample {
  query: string;
  expectedAnswer: string;
  complexity: number;
  requiredChunks?: string[];
}

const CATEGORY_PROMPTS = {
  simple: `Generate realistic simple customer support queries for a multi-modal AI assistant platform with video meetings, knowledge base, and real-time chat.

Category: SIMPLE FACTUAL QUERIES
Characteristics:
- Single-step answers
- Factual information retrieval
- Clear, direct questions
- Low complexity (0.1-0.2)
- Can be answered by Gemini Flash

Topics to cover:
- Account setup and configuration
- Basic feature usage (uploading files, inviting members, etc.)
- Pricing and billing inquiries
- Platform capabilities and limits
- Browser/system requirements
- Integration basics
- Password and security basics`,

  moderate: `Generate realistic moderate customer support queries for a multi-modal AI assistant platform with video meetings, knowledge base, and real-time chat.

Category: MODERATE TROUBLESHOOTING
Characteristics:
- Multi-step problem resolution
- Requires context from 2-3 knowledge chunks
- Technical troubleshooting
- Medium complexity (0.4-0.6)
- Requires GPT-4o-mini

Topics to cover:
- Video/audio connectivity issues
- Performance and latency problems
- Integration configuration (SSO, webhooks, APIs)
- Permission and access control issues
- Document processing and RAG troubleshooting
- Rate limiting and quota issues
- Advanced feature setup (caching, CDN, etc.)`,

  complex: `Generate realistic complex customer support queries for a multi-modal AI assistant platform with video meetings, knowledge base, and real-time chat.

Category: COMPLEX MULTI-STEP PROBLEMS
Characteristics:
- Enterprise-level issues
- Requires 4+ knowledge chunks
- Multi-system integration
- High complexity (0.8-0.95)
- Requires Claude Sonnet

Topics to cover:
- Large-scale data migrations (100s-1000s of documents)
- Multi-tool workflow integrations (Zendesk + Slack + Jira)
- AI accuracy and hallucination issues
- Enterprise security and compliance (HIPAA, SOC 2, GDPR)
- Custom workflow automation
- Performance optimization at scale
- Advanced AI configuration and tuning`,

  edge_case: `Generate realistic edge case customer support queries for a multi-modal AI assistant platform with video meetings, knowledge base, and real-time chat.

Category: EDGE CASES
Characteristics:
- Out-of-scope requests
- Emotionally charged situations
- Malicious or inappropriate requests
- Urgent/emergency scenarios
- Ambiguous or unclear queries
- Low-medium complexity (0.15-0.5)

Topics to cover:
- Inappropriate content requests
- Personal assistance unrelated to product
- Attempts to extract confidential information
- High-emotion complaints and cancellation threats
- Emergency/time-critical issues
- Ambiguous multi-intent queries
- Boundary testing (can you do X for me?)`,
};

const EXPECTED_MODELS = {
  simple: 'gemini-flash' as const,
  moderate: 'gpt-4o-mini' as const,
  complex: 'claude-sonnet' as const,
  edge_case: 'gpt-4o-mini' as const,
};

async function generateSyntheticExamples(
  category: keyof typeof CATEGORY_PROMPTS,
  count: number
): Promise<SyntheticExample[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const client = new Anthropic({ apiKey });

  const prompt = `${CATEGORY_PROMPTS[category]}

Generate ${count} examples in valid JSON format:

[
  {
    "query": "The customer query...",
    "expectedAnswer": "Helpful, detailed answer with specific steps...",
    "complexity": 0.5,
    "requiredChunks": ["chunk_id_1", "chunk_id_2"]
  }
]

Requirements:
- Queries should reflect real user pain points and use cases
- Answers must be helpful, accurate, and actionable
- Include numbered steps when appropriate
- Complexity scores match category guidelines
- Provide realistic chunk IDs that would contain this information
- Vary question phrasing and scenarios
- Cover diverse use cases within the category

Return ONLY the JSON array, no additional text.`;

  console.log(`🤖 Generating ${count} ${category} examples...`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4.5',
    max_tokens: 16384,
    temperature: 0.8, // Higher temperature for diverse examples
    messages: [{ role: 'user', content: prompt }],
  });

  const content =
    response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const examples = JSON.parse(content) as SyntheticExample[];
    console.log(`✅ Generated ${examples.length} examples`);
    return examples;
  } catch (error) {
    console.error('❌ Failed to parse Claude response:', content);
    throw error;
  }
}

function formatExamplesForDataset(
  examples: SyntheticExample[],
  category: string,
  startId: number
): string {
  return examples
    .map((ex, index) => {
      const id = `${category}_${String(startId + index).padStart(3, '0')}`;
      return `  {
    id: '${id}',
    query: ${JSON.stringify(ex.query)},
    expectedAnswer: ${JSON.stringify(ex.expectedAnswer)},
    category: '${category}',
    requiredChunks: ${JSON.stringify(ex.requiredChunks || [])},
    metadata: {
      complexity: ${ex.complexity.toFixed(2)},
      expectedModel: '${EXPECTED_MODELS[category as keyof typeof EXPECTED_MODELS]}',
      createdAt: new Date('${new Date().toISOString().split('T')[0]}'),
      source: 'synthetic',
    },
  }`;
    })
    .join(',\n');
}

async function main() {
  const args = process.argv.slice(2);
  const categoryArg = args.find((arg) => arg.startsWith('--category='));
  const countArg = args.find((arg) => arg.startsWith('--count='));

  if (!categoryArg || !countArg) {
    console.error(`Usage: pnpm tsx scripts/generate-synthetic-examples.ts --category=<category> --count=<count>

Categories: simple, moderate, complex, edge_case
Example: pnpm tsx scripts/generate-synthetic-examples.ts --category=simple --count=75`);
    process.exit(1);
  }

  const category = categoryArg.split('=')[1] as keyof typeof CATEGORY_PROMPTS;
  const count = parseInt(countArg.split('=')[1], 10);

  if (!CATEGORY_PROMPTS[category]) {
    console.error(
      `Invalid category: ${category}. Must be one of: ${Object.keys(CATEGORY_PROMPTS).join(', ')}`
    );
    process.exit(1);
  }

  console.log(`\n📊 Generating ${count} ${category} examples...\n`);

  try {
    const examples = await generateSyntheticExamples(category, count);

    // Read current dataset to determine next ID
    const datasetPath = join(
      process.cwd(),
      'packages/knowledge/src/evaluation/golden-dataset.ts'
    );
    const currentDataset = readFileSync(datasetPath, 'utf-8');

    // Find highest existing ID for this category
    const regex = new RegExp(`${category}_(\\d+)`, 'g');
    const matches = Array.from(currentDataset.matchAll(regex));
    const existingIds = matches.map((m) => parseInt(m[1], 10));
    const startId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    // Format examples
    const formattedExamples = formatExamplesForDataset(
      examples,
      category,
      startId
    );

    // Write to output file
    const outputPath = join(
      process.cwd(),
      `scripts/output/synthetic_${category}_${new Date().toISOString().split('T')[0]}.ts`
    );

    writeFileSync(
      outputPath,
      `// Generated ${count} ${category} examples on ${new Date().toISOString()}
// Paste these into packages/knowledge/src/evaluation/golden-dataset.ts

${formattedExamples}
`,
      'utf-8'
    );

    console.log(`\n✅ Success! Generated ${examples.length} examples`);
    console.log(`📝 Output saved to: ${outputPath}`);
    console.log(
      `\n📋 Next steps:\n1. Review the generated examples for quality\n2. Copy/paste into golden-dataset.ts\n3. Run validation: pnpm test packages/knowledge/src/evaluation/golden-dataset.test.ts`
    );
  } catch (error) {
    console.error('❌ Error generating examples:', error);
    process.exit(1);
  }
}

main();
