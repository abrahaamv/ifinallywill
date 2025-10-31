/**
 * Test Fixtures Utility (Week 4 Day 1)
 *
 * Provides reusable UUID fixtures and test data for all test suites.
 * All UUIDs are valid UUID v4 format to prevent validation errors.
 *
 * Usage:
 * ```typescript
 * import { mockUUIDs, mockUser, mockTenant } from './utils/fixtures';
 *
 * const userId = mockUUIDs.user.default;
 * const user = mockUser({ id: userId });
 * ```
 */

/**
 * UUID Fixtures
 *
 * All UUIDs are valid UUID v4 format for use in tests.
 * Organized by entity type with multiple fixtures per entity.
 */
export const mockUUIDs = {
  /** User UUIDs */
  user: {
    default: '123e4567-e89b-12d3-a456-426614174000',
    member: '123e4567-e89b-12d3-a456-426614174001',
    admin: '123e4567-e89b-12d3-a456-426614174002',
    owner: '123e4567-e89b-12d3-a456-426614174003',
    test1: '123e4567-e89b-12d3-a456-426614174004',
    test2: '123e4567-e89b-12d3-a456-426614174005',
  },

  /** Tenant UUIDs */
  tenant: {
    default: '223e4567-e89b-12d3-a456-426614174000',
    test1: '223e4567-e89b-12d3-a456-426614174001',
    test2: '223e4567-e89b-12d3-a456-426614174002',
  },

  /** Session UUIDs */
  session: {
    default: '323e4567-e89b-12d3-a456-426614174000',
    test1: '323e4567-e89b-12d3-a456-426614174001',
    test2: '323e4567-e89b-12d3-a456-426614174002',
    ended: '323e4567-e89b-12d3-a456-426614174003',
  },

  /** Message UUIDs */
  message: {
    default: '423e4567-e89b-12d3-a456-426614174000',
    user1: '423e4567-e89b-12d3-a456-426614174001',
    assistant1: '423e4567-e89b-12d3-a456-426614174002',
    user2: '423e4567-e89b-12d3-a456-426614174003',
    assistant2: '423e4567-e89b-12d3-a456-426614174004',
  },

  /** Widget UUIDs */
  widget: {
    default: '523e4567-e89b-12d3-a456-426614174000',
    active: '523e4567-e89b-12d3-a456-426614174001',
    inactive: '523e4567-e89b-12d3-a456-426614174002',
    test1: '523e4567-e89b-12d3-a456-426614174003',
  },

  /** Knowledge Document UUIDs */
  document: {
    default: '623e4567-e89b-12d3-a456-426614174000',
    general: '623e4567-e89b-12d3-a456-426614174001',
    technical: '623e4567-e89b-12d3-a456-426614174002',
    faq: '623e4567-e89b-12d3-a456-426614174003',
    test1: '623e4567-e89b-12d3-a456-426614174004',
  },

  /** Knowledge Chunk UUIDs */
  chunk: {
    default: '723e4567-e89b-12d3-a456-426614174000',
    chunk1: '723e4567-e89b-12d3-a456-426614174001',
    chunk2: '723e4567-e89b-12d3-a456-426614174002',
    chunk3: '723e4567-e89b-12d3-a456-426614174003',
  },

  /** AI Personality UUIDs */
  personality: {
    default: '823e4567-e89b-12d3-a456-426614174000',
    assistant: '823e4567-e89b-12d3-a456-426614174001',
    expert: '823e4567-e89b-12d3-a456-426614174002',
    casual: '823e4567-e89b-12d3-a456-426614174003',
  },

  /** Meeting UUIDs */
  meeting: {
    default: '923e4567-e89b-12d3-a456-426614174000',
    active: '923e4567-e89b-12d3-a456-426614174001',
    ended: '923e4567-e89b-12d3-a456-426614174002',
  },

  /** API Key UUIDs */
  apiKey: {
    default: 'a23e4567-e89b-12d3-a456-426614174000',
    active: 'a23e4567-e89b-12d3-a456-426614174001',
    revoked: 'a23e4567-e89b-12d3-a456-426614174002',
  },

  /** Auth Token UUIDs */
  authToken: {
    default: 'b23e4567-e89b-12d3-a456-426614174000',
    refresh: 'b23e4567-e89b-12d3-a456-426614174001',
    mfa: 'b23e4567-e89b-12d3-a456-426614174002',
    reset: 'b23e4567-e89b-12d3-a456-426614174003',
  },
} as const;

/**
 * Mock User Factory
 *
 * Creates mock user objects with sensible defaults.
 *
 * @param overrides - Optional overrides for user properties
 * @returns Mock user object
 */
export const mockUser = (
  overrides?: Partial<{
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
) => ({
  id: mockUUIDs.user.default,
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Mock Tenant Factory
 *
 * Creates mock tenant objects with sensible defaults.
 *
 * @param overrides - Optional overrides for tenant properties
 * @returns Mock tenant object
 */
export const mockTenant = (
  overrides?: Partial<{
    id: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
    createdAt: Date;
    updatedAt: Date;
  }>
) => ({
  id: mockUUIDs.tenant.default,
  name: 'Test Tenant',
  plan: 'pro' as const,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Mock Session Factory
 *
 * Creates mock session objects with sensible defaults.
 *
 * @param overrides - Optional overrides for session properties
 * @returns Mock session object
 */
export const mockSession = (
  overrides?: Partial<{
    id: string;
    tenantId: string;
    widgetId: string | null;
    meetingId: string | null;
    mode: 'text' | 'meeting';
    costUsd: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    endedAt: Date | null;
  }>
) => ({
  id: mockUUIDs.session.default,
  tenantId: mockUUIDs.tenant.default,
  widgetId: null,
  meetingId: null,
  mode: 'text' as const,
  costUsd: '0',
  metadata: {},
  createdAt: new Date('2025-01-01T00:00:00Z'),
  endedAt: null,
  ...overrides,
});

/**
 * Mock Message Factory
 *
 * Creates mock message objects with sensible defaults.
 *
 * @param overrides - Optional overrides for message properties
 * @returns Mock message object
 */
export const mockMessage = (
  overrides?: Partial<{
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments: unknown[];
    metadata: Record<string, unknown>;
    timestamp: Date;
  }>
) => ({
  id: mockUUIDs.message.default,
  sessionId: mockUUIDs.session.default,
  role: 'user' as const,
  content: 'Test message content',
  attachments: [],
  metadata: {},
  timestamp: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Mock Widget Factory
 *
 * Creates mock widget objects with sensible defaults.
 *
 * @param overrides - Optional overrides for widget properties
 * @returns Mock widget object
 */
export const mockWidget = (
  overrides?: Partial<{
    id: string;
    tenantId: string;
    name: string;
    domainWhitelist: string[];
    settings: {
      theme: 'light' | 'dark' | 'auto';
      position: 'bottom-right' | 'bottom-left';
      greeting?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
) => ({
  id: mockUUIDs.widget.default,
  tenantId: mockUUIDs.tenant.default,
  name: 'Test Widget',
  domainWhitelist: ['https://example.com', 'https://app.example.com'],
  settings: {
    theme: 'light' as const,
    position: 'bottom-right' as const,
    greeting: 'Hello! How can I help you?',
    primaryColor: '#1a73e8',
    secondaryColor: '#34a853',
  },
  isActive: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Mock Knowledge Document Factory
 *
 * Creates mock knowledge document objects with sensible defaults.
 *
 * @param overrides - Optional overrides for document properties
 * @returns Mock document object
 */
export const mockDocument = (
  overrides?: Partial<{
    id: string;
    tenantId: string;
    title: string;
    content: string;
    category: string;
    metadata: Record<string, unknown>;
    chunkCount: number;
    tokenCount: number;
    embeddingCost: number;
    createdAt: Date;
    updatedAt: Date;
  }>
) => ({
  id: mockUUIDs.document.default,
  tenantId: mockUUIDs.tenant.default,
  title: 'Test Document',
  content: 'Test document content for RAG system.',
  category: 'general',
  metadata: {},
  chunkCount: 2,
  tokenCount: 100,
  embeddingCost: 0.001,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Mock Knowledge Chunk Factory
 *
 * Creates mock knowledge chunk objects with sensible defaults.
 *
 * @param overrides - Optional overrides for chunk properties
 * @returns Mock chunk object
 */
export const mockChunk = (
  overrides?: Partial<{
    id: string;
    documentId: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>
) => ({
  id: mockUUIDs.chunk.default,
  documentId: mockUUIDs.document.default,
  content: 'Test chunk content',
  embedding: Array(1024).fill(0.1), // 1024-dim embedding
  chunkIndex: 0,
  metadata: {},
  createdAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Mock AI Personality Factory
 *
 * Creates mock AI personality objects with sensible defaults.
 *
 * @param overrides - Optional overrides for personality properties
 * @returns Mock personality object
 */
export const mockPersonality = (
  overrides?: Partial<{
    id: string;
    tenantId: string;
    name: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
) => ({
  id: mockUUIDs.personality.default,
  tenantId: mockUUIDs.tenant.default,
  name: 'Default Assistant',
  systemPrompt: 'You are a helpful AI assistant.',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  isDefault: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Mock Auth Token Factory
 *
 * Creates mock auth token objects with sensible defaults.
 *
 * @param overrides - Optional overrides for token properties
 * @returns Mock token object
 */
export const mockAuthToken = (
  overrides?: Partial<{
    id: string;
    userId: string;
    token: string;
    type: 'access' | 'refresh' | 'mfa' | 'reset';
    expiresAt: Date;
    createdAt: Date;
  }>
) => ({
  id: mockUUIDs.authToken.default,
  userId: mockUUIDs.user.default,
  token: 'mock_token_' + Math.random().toString(36).substring(7),
  type: 'access' as const,
  expiresAt: new Date('2025-12-31T23:59:59Z'),
  createdAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Helper to generate multiple users with sequential UUIDs
 *
 * @param count - Number of users to generate
 * @returns Array of mock users
 */
export const generateMockUsers = (count: number) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(
      mockUser({
        id: `123e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, '0')}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
      })
    );
  }
  return users;
};

/**
 * Helper to generate multiple widgets with sequential UUIDs
 *
 * @param count - Number of widgets to generate
 * @returns Array of mock widgets
 */
export const generateMockWidgets = (count: number) => {
  const widgets = [];
  for (let i = 0; i < count; i++) {
    widgets.push(
      mockWidget({
        id: `523e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, '0')}`,
        name: `Widget ${i}`,
      })
    );
  }
  return widgets;
};

/**
 * Helper to generate multiple documents with sequential UUIDs
 *
 * @param count - Number of documents to generate
 * @returns Array of mock documents
 */
export const generateMockDocuments = (count: number) => {
  const documents = [];
  for (let i = 0; i < count; i++) {
    documents.push(
      mockDocument({
        id: `623e4567-e89b-12d3-a456-42661417${i.toString().padStart(4, '0')}`,
        title: `Document ${i}`,
      })
    );
  }
  return documents;
};
