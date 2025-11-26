/**
 * Golden Evaluation Dataset
 * Week 1, Day 5: Phase 12 Implementation
 *
 * 200 query-answer pairs for systematic RAG evaluation
 * Distribution: 40% simple, 35% moderate, 20% complex, 5% edge cases
 */

export interface EvaluationExample {
  id: string;
  query: string;
  expectedAnswer: string;
  category: 'simple' | 'moderate' | 'complex' | 'edge_case';
  requiredChunks: string[]; // IDs of chunks that should be retrieved
  metadata: {
    complexity: number; // 0-1 scale
    expectedModel: 'gemini-flash' | 'gpt-4o-mini' | 'claude-sonnet';
    createdAt: Date;
    source: 'real_ticket' | 'synthetic' | 'manual';
  };
}

/**
 * Golden Dataset - Production Evaluation Examples
 *
 * TODO: Expand to 200 examples total
 * Current: Foundation with representative examples from each category
 *
 * Sources:
 * 1. Anonymized real customer tickets
 * 2. Synthetic generation with GPT-4/Claude
 * 3. Team brainstorming sessions
 *
 * Update monthly with new edge cases discovered in production
 */
export const goldenDataset: EvaluationExample[] = [
  // ========================================
  // SIMPLE FACTUAL QUERIES (40% - Target: 80 examples)
  // ========================================
  {
    id: 'simple_001',
    query: 'What is the maximum file upload size?',
    expectedAnswer:
      'The maximum file upload size is 10MB per file. For larger files, please use our bulk upload API or contact support for enterprise options.',
    category: 'simple',
    requiredChunks: ['chunk_upload_limits'],
    metadata: {
      complexity: 0.1,
      expectedModel: 'gemini-flash',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'simple_002',
    query: 'How do I reset my password?',
    expectedAnswer:
      'To reset your password: 1) Click "Forgot Password" on the login page, 2) Enter your email address, 3) Check your inbox for the reset link, 4) Click the link and create a new password. The reset link expires in 1 hour.',
    category: 'simple',
    requiredChunks: ['chunk_password_reset'],
    metadata: {
      complexity: 0.15,
      expectedModel: 'gemini-flash',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'simple_003',
    query: 'What browsers are supported?',
    expectedAnswer:
      'We support the latest versions of Chrome, Firefox, Edge, and Safari. For the best experience, we recommend Chrome or Edge. Note: Internet Explorer is not supported.',
    category: 'simple',
    requiredChunks: ['chunk_browser_requirements'],
    metadata: {
      complexity: 0.12,
      expectedModel: 'gemini-flash',
      createdAt: new Date('2025-01-10'),
      source: 'manual',
    },
  },
  {
    id: 'simple_004',
    query: 'How do I invite team members?',
    expectedAnswer:
      'To invite team members: 1) Go to Settings > Team, 2) Click "Invite Member", 3) Enter their email address, 4) Select their role (Admin, Member, or Viewer), 5) Click "Send Invitation". They will receive an email with setup instructions.',
    category: 'simple',
    requiredChunks: ['chunk_team_management'],
    metadata: {
      complexity: 0.18,
      expectedModel: 'gemini-flash',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'simple_005',
    query: 'What payment methods do you accept?',
    expectedAnswer:
      'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and wire transfer for annual plans. Billing is processed securely through Stripe.',
    category: 'simple',
    requiredChunks: ['chunk_payment_methods'],
    metadata: {
      complexity: 0.10,
      expectedModel: 'gemini-flash',
      createdAt: new Date('2025-01-10'),
      source: 'manual',
    },
  },

  // TODO: Add 75 more simple examples covering:
  // - Account setup and configuration
  // - Basic feature usage
  // - Pricing and billing inquiries
  // - Platform capabilities
  // - Integration basics

  // ========================================
  // MODERATE TROUBLESHOOTING (35% - Target: 70 examples)
  // ========================================
  {
    id: 'moderate_001',
    query: 'My video is not loading in the meeting room. What should I check?',
    expectedAnswer:
      'Please verify: 1) Browser permissions for camera access (check the address bar icon), 2) No other apps are using the camera, 3) Browser is up-to-date (Chrome 90+, Firefox 88+, Edge 90+), 4) Try refreshing the page with Cmd/Ctrl+Shift+R. If the issue persists, check your network connection (minimum 1 Mbps upload) and firewall settings (allow WebRTC ports 3478, 19302-19309).',
    category: 'moderate',
    requiredChunks: [
      'chunk_video_troubleshooting',
      'chunk_camera_permissions',
      'chunk_network_requirements',
    ],
    metadata: {
      complexity: 0.5,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'moderate_002',
    query: 'Why am I getting "Rate limit exceeded" errors when uploading documents?',
    expectedAnswer:
      'The rate limit for document uploads is 50 files per hour per account. If you need to upload more: 1) Wait for the rate limit to reset (displays countdown in the error message), 2) Upgrade to Pro plan for 500 files/hour, or 3) Use our bulk upload API with batching support. For one-time migrations, contact support to temporarily increase your limit.',
    category: 'moderate',
    requiredChunks: [
      'chunk_rate_limits',
      'chunk_bulk_upload',
      'chunk_plan_limits',
    ],
    metadata: {
      complexity: 0.45,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'moderate_003',
    query: 'The AI is not finding answers from my uploaded documents. Why?',
    expectedAnswer:
      'If the AI is not retrieving your documents: 1) Check document processing status in the Knowledge Base page (may take 2-5 minutes per document), 2) Verify documents are in supported formats (PDF, DOCX, TXT, MD), 3) Ensure content is searchable (scanned PDFs need OCR), 4) Check if your query matches document terminology (try rephrasing), 5) Review the "Retrieved Chunks" in debug mode to see what was found. If documents show as "Processed" but still not found, they may need re-indexing.',
    category: 'moderate',
    requiredChunks: [
      'chunk_rag_troubleshooting',
      'chunk_document_processing',
      'chunk_supported_formats',
    ],
    metadata: {
      complexity: 0.55,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'moderate_004',
    query: 'How do I configure SSO for my team using Azure AD?',
    expectedAnswer:
      'To set up Azure AD SSO: 1) In Azure Portal, create a new Enterprise Application, 2) Configure SAML-based sign-on, 3) Copy the SAML metadata URL, 4) In our platform, go to Settings > Security > SSO, 5) Paste the metadata URL and click "Validate", 6) Map Azure AD attributes (email → email, displayName → name), 7) Enable SSO and test with a test user. Note: SSO is available on Enterprise plans only. Contact support if you encounter attribute mapping issues.',
    category: 'moderate',
    requiredChunks: [
      'chunk_sso_configuration',
      'chunk_azure_ad_setup',
      'chunk_attribute_mapping',
    ],
    metadata: {
      complexity: 0.6,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'manual',
    },
  },
  {
    id: 'moderate_005',
    query: 'Users are reporting slow response times during peak hours. How can I optimize?',
    expectedAnswer:
      'To optimize peak-hour performance: 1) Review your plan limits (check if you are hitting concurrent user limits), 2) Enable prompt caching in Settings > AI > Advanced (90% cost reduction + faster responses), 3) Configure regional endpoints if your team is distributed globally, 4) Check your knowledge base size (>1000 documents may need index optimization), 5) Consider upgrading to Pro/Enterprise for dedicated resources. Use the Performance Dashboard to identify specific bottlenecks.',
    category: 'moderate',
    requiredChunks: [
      'chunk_performance_optimization',
      'chunk_prompt_caching',
      'chunk_plan_limits',
    ],
    metadata: {
      complexity: 0.58,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },

  // TODO: Add 65 more moderate examples covering:
  // - Technical troubleshooting (connectivity, performance, integrations)
  // - Configuration issues (permissions, settings, customization)
  // - API usage and debugging
  // - Advanced feature setup
  // - Multi-step problem resolution

  // ========================================
  // COMPLEX MULTI-STEP PROBLEMS (20% - Target: 40 examples)
  // ========================================
  {
    id: 'complex_001',
    query:
      'I need to migrate 500 documents from our old system, maintain version history, and ensure all user permissions are preserved. What is the recommended approach?',
    expectedAnswer:
      'For large-scale migration with version history and permissions: 1) Export data: Use old system API to export documents with metadata (versions, permissions, timestamps), 2) Prepare mapping: Create CSV mapping old user IDs to new email addresses, 3) Use bulk import API: POST to /api/v1/migration/bulk with `preserveHistory: true` and `preservePermissions: true` flags, 4) Batch uploads: Upload in batches of 50 documents to avoid rate limits, 5) Validate each batch: Check /api/v1/migration/status/{batchId} for errors, 6) Map permissions: Upload permission CSV to /api/v1/migration/permissions, 7) Run integrity check: Use POST /api/v1/migration/verify to validate all documents and permissions, 8) Monitor in dashboard: Review Migration Dashboard for progress and errors. Estimated time: 2-3 hours for 500 documents. We recommend scheduling a call with our migration specialist for enterprise migrations (included in Enterprise plan).',
    category: 'complex',
    requiredChunks: [
      'chunk_bulk_import_api',
      'chunk_version_history',
      'chunk_permissions_migration',
      'chunk_audit_tools',
      'chunk_migration_best_practices',
    ],
    metadata: {
      complexity: 0.85,
      expectedModel: 'claude-sonnet',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'complex_002',
    query:
      'We need to integrate your AI assistant into our existing customer support workflow with Zendesk, Slack, and Jira. How do we set this up to ensure seamless ticket handoffs?',
    expectedAnswer:
      'For multi-tool workflow integration: 1) Install apps: Add our apps from Zendesk Marketplace, Slack App Directory, and Jira Marketplace, 2) Configure Zendesk: a) Enable webhook triggers for new tickets, b) Set AI resolution threshold (recommend 0.8 confidence), c) Configure escalation rules (human handoff when confidence <0.8 or customer requests), 3) Configure Slack: a) Add bot to support channels, b) Enable threaded responses, c) Set notification preferences for escalations, 4) Configure Jira: a) Create automation rule for ticket creation on escalation, b) Map priority levels (AI confidence <0.5 = High priority), c) Set assignee routing rules, 5) Test workflow: Create test ticket → AI attempts resolution → If successful, auto-close in Zendesk → If escalated, create Jira ticket + notify Slack, 6) Monitor: Use Integration Dashboard to track success rates and optimize thresholds. Setup time: 2-4 hours. Requires Enterprise plan with Integration Pack ($299/mo). We provide hands-on setup assistance for Enterprise customers.',
    category: 'complex',
    requiredChunks: [
      'chunk_zendesk_integration',
      'chunk_slack_integration',
      'chunk_jira_integration',
      'chunk_workflow_automation',
      'chunk_escalation_rules',
    ],
    metadata: {
      complexity: 0.9,
      expectedModel: 'claude-sonnet',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'complex_003',
    query:
      'Our AI is hallucinating and providing incorrect information about our product features. How do we improve answer accuracy and implement guardrails?',
    expectedAnswer:
      'To improve accuracy and add guardrails: 1) Audit knowledge base: Review all documents for completeness and accuracy, identify gaps in critical areas, 2) Implement grounding: a) Enable strict grounding mode (Settings > AI > Grounding), b) Require citations for all factual claims, c) Set confidence threshold for "I do not know" responses (recommend 0.75), 3) Add quality checks: a) Enable RAGAS continuous evaluation, b) Monitor faithfulness score (should be >80%), c) Review low-score responses weekly, 4) Create validation rules: a) Add domain-specific validators (e.g., "never mention competitor products"), b) Block sensitive topics (pricing negotiations, legal advice), c) Require human review for high-risk categories, 5) Improve training data: a) Create golden evaluation dataset (200+ examples), b) Add examples of correct vs. incorrect responses, c) Run A/B tests on prompt variations, 6) Implement feedback loop: a) Add thumbs-up/down for all AI responses, b) Automatically flag responses with negative feedback, c) Retrain monthly with corrected examples, 7) Monitor dashboards: Track faithfulness, answer relevancy, and context precision daily. Expected improvement: 20-40% reduction in hallucinations within 2-4 weeks. Enterprise customers receive dedicated AI accuracy consultant.',
    category: 'complex',
    requiredChunks: [
      'chunk_grounding_configuration',
      'chunk_ragas_evaluation',
      'chunk_golden_dataset',
      'chunk_validation_rules',
      'chunk_feedback_loop',
      'chunk_prompt_engineering',
    ],
    metadata: {
      complexity: 0.95,
      expectedModel: 'claude-sonnet',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },

  // TODO: Add 37 more complex examples covering:
  // - Enterprise migrations and integrations
  // - Custom workflow implementations
  // - Advanced AI configuration and tuning
  // - Compliance and security setup
  // - Multi-tenant architecture design
  // - Performance optimization at scale

  // ========================================
  // EDGE CASES (5% - Target: 10 examples)
  // ========================================
  {
    id: 'edge_001',
    query: 'Can your AI help me write a resignation letter?',
    expectedAnswer:
      'I cannot help with that as it is outside the scope of our product support. I can only assist with questions related to our platform features, troubleshooting, account management, and integration setup. Is there anything about our AI assistant platform I can help you with?',
    category: 'edge_case',
    requiredChunks: [],
    metadata: {
      complexity: 0.2,
      expectedModel: 'gemini-flash',
      createdAt: new Date('2025-01-10'),
      source: 'manual',
    },
  },
  {
    id: 'edge_002',
    query: 'Your service is terrible and I want to cancel immediately! This is ridiculous!',
    expectedAnswer:
      'I understand your frustration and want to help resolve this. Let me connect you with a specialist who can address your concerns and assist with any account changes you need. Please hold for a moment while I transfer you to our support team. [Escalation triggered: Sentiment = negative, Urgency = high]',
    category: 'edge_case',
    requiredChunks: [],
    metadata: {
      complexity: 0.4,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'edge_003',
    query: 'Hey buddy, can you send me a list of all your customers? I promise I will not spam them!',
    expectedAnswer:
      'I cannot provide customer lists or any confidential business information. If you need information about our public directory or partner ecosystem, please visit our website or contact our partnerships team at partnerships@platform.com. Is there anything else related to your own account that I can help you with?',
    category: 'edge_case',
    requiredChunks: [],
    metadata: {
      complexity: 0.3,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'manual',
    },
  },
  {
    id: 'edge_004',
    query: 'The meeting link is not working and I have investors joining in 5 minutes!',
    expectedAnswer:
      'This is urgent - I am immediately escalating you to our priority support team who will join within 60 seconds. In the meantime: 1) Try refreshing the meeting link, 2) Check if you can create a new meeting room as backup, 3) Have your phone ready - support will call you. [Priority Escalation: Urgency = critical, Business impact = high, Customer = VIP]',
    category: 'edge_case',
    requiredChunks: ['chunk_emergency_protocols'],
    metadata: {
      complexity: 0.5,
      expectedModel: 'gpt-4o-mini',
      createdAt: new Date('2025-01-10'),
      source: 'real_ticket',
    },
  },
  {
    id: 'edge_005',
    query: 'Tell me a joke about developers!',
    expectedAnswer:
      'While I appreciate your friendly approach, I am specifically designed to help with our platform support. I focus on answering questions about features, troubleshooting issues, and helping you get the most out of our AI assistant. How can I help you with the platform today?',
    category: 'edge_case',
    requiredChunks: [],
    metadata: {
      complexity: 0.15,
      expectedModel: 'gemini-flash',
      createdAt: new Date('2025-01-10'),
      source: 'manual',
    },
  },

  // TODO: Add 5 more edge cases covering:
  // - Inappropriate requests
  // - Ambiguous or unclear queries
  // - Requests for confidential information
  // - Emergency/high-urgency scenarios
  // - Queries requiring human judgment
];

/**
 * Filter dataset by category
 */
export function getGoldenDatasetByCategory(
  category?: EvaluationExample['category']
): EvaluationExample[] {
  if (!category) return goldenDataset;
  return goldenDataset.filter((ex) => ex.category === category);
}

/**
 * Get dataset statistics
 */
export function getGoldenDatasetStats() {
  const stats = {
    total: goldenDataset.length,
    simple: goldenDataset.filter((ex) => ex.category === 'simple').length,
    moderate: goldenDataset.filter((ex) => ex.category === 'moderate').length,
    complex: goldenDataset.filter((ex) => ex.category === 'complex').length,
    edge_case: goldenDataset.filter((ex) => ex.category === 'edge_case')
      .length,
  };

  return {
    ...stats,
    percentages: {
      simple: ((stats.simple / stats.total) * 100).toFixed(1) + '%',
      moderate: ((stats.moderate / stats.total) * 100).toFixed(1) + '%',
      complex: ((stats.complex / stats.total) * 100).toFixed(1) + '%',
      edge_case: ((stats.edge_case / stats.total) * 100).toFixed(1) + '%',
    },
    target: {
      simple: 80,
      moderate: 70,
      complex: 40,
      edge_case: 10,
      total: 200,
    },
    remaining: {
      simple: 80 - stats.simple,
      moderate: 70 - stats.moderate,
      complex: 40 - stats.complex,
      edge_case: 10 - stats.edge_case,
      total: 200 - stats.total,
    },
  };
}

/**
 * Get examples by complexity range
 */
export function getExamplesByComplexity(
  min: number,
  max: number
): EvaluationExample[] {
  return goldenDataset.filter(
    (ex) => ex.metadata.complexity >= min && ex.metadata.complexity <= max
  );
}

/**
 * Get examples by expected model
 */
export function getExamplesByModel(
  model: EvaluationExample['metadata']['expectedModel']
): EvaluationExample[] {
  return goldenDataset.filter((ex) => ex.metadata.expectedModel === model);
}

/**
 * Get random sample for testing
 */
export function getRandomSample(count: number): EvaluationExample[] {
  const shuffled = [...goldenDataset].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Validate example structure
 */
export function validateExample(
  example: EvaluationExample
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!example.id) errors.push('Missing id');
  if (!example.query || example.query.length < 10)
    errors.push('Query too short or missing');
  if (!example.expectedAnswer || example.expectedAnswer.length < 20)
    errors.push('Expected answer too short or missing');
  if (!example.category) errors.push('Missing category');
  if (!Array.isArray(example.requiredChunks))
    errors.push('requiredChunks must be array');
  if (
    typeof example.metadata?.complexity !== 'number' ||
    example.metadata.complexity < 0 ||
    example.metadata.complexity > 1
  ) {
    errors.push('Invalid complexity score (must be 0-1)');
  }
  if (!example.metadata?.expectedModel) errors.push('Missing expected model');
  if (!example.metadata?.createdAt) errors.push('Missing created date');
  if (!example.metadata?.source) errors.push('Missing source');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate entire dataset
 */
export function validateDataset(): {
  valid: boolean;
  totalExamples: number;
  invalidExamples: Array<{ id: string; errors: string[] }>;
  stats: ReturnType<typeof getGoldenDatasetStats>;
} {
  const invalidExamples: Array<{ id: string; errors: string[] }> = [];

  for (const example of goldenDataset) {
    const validation = validateExample(example);
    if (!validation.valid) {
      invalidExamples.push({
        id: example.id,
        errors: validation.errors,
      });
    }
  }

  return {
    valid: invalidExamples.length === 0,
    totalExamples: goldenDataset.length,
    invalidExamples,
    stats: getGoldenDatasetStats(),
  };
}
