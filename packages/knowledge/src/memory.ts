/**
 * LlamaIndex Memory System Integration (Phase 10 - Week 1)
 * Conversation memory for context retention and summarization
 */

import { ChatMemoryBuffer } from '@llamaindex/core/memory';
import type { ChatMessage } from '@llamaindex/core/llms';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('MemorySystem');

export interface MemoryOptions {
  /** Maximum number of messages to retain in buffer */
  maxMessages?: number;
  /** Token limit for memory buffer */
  tokenLimit?: number;
  /** Session ID for memory isolation */
  sessionId: string;
}

export interface MemorySummary {
  /** Summary of conversation history */
  summary: string;
  /** Number of messages summarized */
  messageCount: number;
  /** Estimated token count */
  tokenCount: number;
}

/**
 * Session-based memory manager using LlamaIndex ChatMemoryBuffer
 */
export class ConversationMemory {
  private memory: ChatMemoryBuffer;
  private sessionId: string;

  constructor(options: MemoryOptions) {
    const { maxMessages = 50, tokenLimit = 3000, sessionId } = options;

    this.sessionId = sessionId;
    this.memory = new ChatMemoryBuffer({
      tokenLimit,
    });

    logger.info('Conversation memory initialized', {
      sessionId,
      maxMessages,
      tokenLimit,
    });
  }

  /**
   * Add a user message to memory
   */
  async addUserMessage(content: string): Promise<void> {
    try {
      await this.memory.put({
        role: 'user',
        content,
      });

      logger.debug('User message added to memory', {
        sessionId: this.sessionId,
        contentLength: content.length,
      });
    } catch (error) {
      logger.error('Failed to add user message', { error, sessionId: this.sessionId });
      throw new Error(`Failed to add user message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add an assistant message to memory
   */
  async addAssistantMessage(content: string): Promise<void> {
    try {
      await this.memory.put({
        role: 'assistant',
        content,
      });

      logger.debug('Assistant message added to memory', {
        sessionId: this.sessionId,
        contentLength: content.length,
      });
    } catch (error) {
      logger.error('Failed to add assistant message', { error, sessionId: this.sessionId });
      throw new Error(`Failed to add assistant message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a system message to memory
   */
  async addSystemMessage(content: string): Promise<void> {
    try {
      await this.memory.put({
        role: 'system',
        content,
      });

      logger.debug('System message added to memory', {
        sessionId: this.sessionId,
        contentLength: content.length,
      });
    } catch (error) {
      logger.error('Failed to add system message', { error, sessionId: this.sessionId });
      throw new Error(`Failed to add system message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation history as messages
   */
  async getMessages(): Promise<ChatMessage[]> {
    try {
      // ChatMemoryBuffer stores messages in chatHistory property
      const messages = (this.memory as any).chatHistory || [];

      logger.debug('Retrieved messages from memory', {
        sessionId: this.sessionId,
        messageCount: messages.length,
      });

      return messages;
    } catch (error) {
      logger.error('Failed to retrieve messages', { error, sessionId: this.sessionId });
      throw new Error(`Failed to retrieve messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation history as formatted string
   */
  async getConversationText(): Promise<string> {
    try {
      const messages = await this.getMessages();

      const formatted = messages
        .map((msg) => {
          const role = msg.role.toUpperCase();
          return `[${role}]: ${msg.content}`;
        })
        .join('\n\n');

      return formatted;
    } catch (error) {
      logger.error('Failed to format conversation', { error, sessionId: this.sessionId });
      throw new Error(`Failed to format conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all messages from memory
   */
  async clear(): Promise<void> {
    try {
      await this.memory.reset();

      logger.info('Memory cleared', { sessionId: this.sessionId });
    } catch (error) {
      logger.error('Failed to clear memory', { error, sessionId: this.sessionId });
      throw new Error(`Failed to clear memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate summary of conversation history
   * Uses simple extractive summarization (first/last messages + key points)
   */
  async generateSummary(): Promise<MemorySummary> {
    try {
      const messages = await this.getMessages();

      if (messages.length === 0) {
        return {
          summary: 'No conversation history.',
          messageCount: 0,
          tokenCount: 0,
        };
      }

      // Simple summarization: include first message, last message, and middle highlights
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const middleMessages = messages.slice(1, -1);

      let summary = `Conversation started with:\n${firstMessage?.role.toUpperCase()}: ${firstMessage?.content}\n\n`;

      if (middleMessages.length > 0) {
        summary += `Discussion covered ${middleMessages.length} additional exchanges.\n\n`;
      }

      if (messages.length > 1) {
        summary += `Most recent:\n${lastMessage?.role.toUpperCase()}: ${lastMessage?.content}`;
      }

      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      const tokenCount = Math.ceil(summary.length / 4);

      logger.info('Generated conversation summary', {
        sessionId: this.sessionId,
        messageCount: messages.length,
        summaryLength: summary.length,
        tokenCount,
      });

      return {
        summary,
        messageCount: messages.length,
        tokenCount,
      };
    } catch (error) {
      logger.error('Failed to generate summary', { error, sessionId: this.sessionId });
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Memory manager for multiple sessions
 */
export class MemoryManager {
  private sessions: Map<string, ConversationMemory> = new Map();
  private defaultOptions: Omit<MemoryOptions, 'sessionId'>;

  constructor(defaultOptions: Omit<MemoryOptions, 'sessionId'> = {}) {
    this.defaultOptions = {
      maxMessages: defaultOptions.maxMessages ?? 50,
      tokenLimit: defaultOptions.tokenLimit ?? 3000,
    };

    logger.info('Memory manager initialized', {
      maxMessages: this.defaultOptions.maxMessages,
      tokenLimit: this.defaultOptions.tokenLimit,
    });
  }

  /**
   * Get or create memory for a session
   */
  getSession(sessionId: string): ConversationMemory {
    let memory = this.sessions.get(sessionId);

    if (!memory) {
      memory = new ConversationMemory({
        ...this.defaultOptions,
        sessionId,
      });
      this.sessions.set(sessionId, memory);

      logger.info('New session created', {
        sessionId,
        totalSessions: this.sessions.size,
      });
    }

    return memory;
  }

  /**
   * Remove a session from memory
   */
  async removeSession(sessionId: string): Promise<void> {
    const memory = this.sessions.get(sessionId);

    if (memory) {
      await memory.clear();
      this.sessions.delete(sessionId);

      logger.info('Session removed', {
        sessionId,
        remainingSessions: this.sessions.size,
      });
    }
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());

    for (const sessionId of sessionIds) {
      await this.removeSession(sessionId);
    }

    logger.info('All sessions cleared', {
      clearedCount: sessionIds.length,
    });
  }

  /**
   * Get active session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all active session IDs
   */
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

/**
 * Build RAG prompt with conversation memory context
 */
export async function buildRAGPromptWithMemory(
  query: string,
  ragContext: string,
  memory: ConversationMemory
): Promise<string> {
  // Get recent conversation history
  const conversationText = await memory.getConversationText();

  const prompt = `You are an AI assistant with access to the following knowledge base context and conversation history.

KNOWLEDGE BASE CONTEXT:
${ragContext}

CONVERSATION HISTORY:
${conversationText}

CURRENT QUESTION:
${query}

INSTRUCTIONS:
- Use both the knowledge base context and conversation history to provide accurate answers
- Reference previous conversation points when relevant
- Cite specific information from the knowledge base using [1], [2], etc.
- If the context doesn't help, acknowledge that and provide a general answer
- Be concise and direct`;

  return prompt;
}

/**
 * Estimate memory storage cost
 * Based on token storage and retrieval operations
 */
export function estimateMemoryCost(sessionCount: number, avgMessagesPerSession: number): number {
  // Assume average message ~50 tokens
  const tokensPerMessage = 50;
  const totalTokens = sessionCount * avgMessagesPerSession * tokensPerMessage;

  // Memory operations cost (simplified estimate)
  // $0.01 per 1K tokens for storage/retrieval
  const costPer1KTokens = 0.01;

  return (totalTokens / 1000) * costPer1KTokens;
}
