/**
 * AI Core Type Definitions
 * Shared types for AI provider abstractions
 */

export type AIProvider = 'openai' | 'anthropic' | 'google';

export type AIModel =
  // OpenAI
  | 'gpt-4o'
  | 'gpt-4o-mini'
  // Anthropic
  | 'claude-3-5-sonnet-20241022'
  // Google
  | 'gemini-2.0-flash-exp';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface AICompletionRequest {
  messages: Message[];
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface AICompletionResponse {
  content: string;
  model: AIModel;
  provider: AIProvider;
  usage: AIUsage;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

export interface AIProviderInterface {
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  streamComplete?(request: AICompletionRequest): AsyncGenerator<string, AICompletionResponse>;
}

export interface ComplexityAnalysis {
  score: number; // 0-1 scale
  reasoning: string;
  factors: {
    messageLength: number;
    contextComplexity: number;
    requiresReasoning: boolean;
    requiresCreativity: boolean;
  };
}

export interface CostEstimate {
  provider: AIProvider;
  model: AIModel;
  estimatedCost: number;
  inputCost: number;
  outputCost: number;
}
