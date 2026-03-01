/**
 * LLM Provider Interface
 *
 * All backend providers (Aura, tldraw, OCR Arena) implement this interface.
 * The route handlers use it to fetch completions without knowing provider details.
 */

import { AnthropicMessagesRequest } from '../types/index.js';

/**
 * Unified provider interface.
 * Each provider transforms the Anthropic-format request to its upstream format,
 * makes the HTTP call, collects the stream, and returns raw text.
 */
export interface LLMProvider {
    /** Human-readable provider name for logging */
    readonly name: string;

    /** Map a client-facing model name to the provider's internal identifier */
    mapModel(model: string): string;

    /** Whether a model is non-Claude (GPT, Gemini, etc.) — needs tool-call retry logic */
    isNonClaudeModel(model: string): boolean;

    /**
     * Send a request and collect the full text response.
     * The provider handles its own upstream format, auth, and stream collection.
     */
    fetchCompletion(request: AnthropicMessagesRequest): Promise<string>;

    /**
     * Retry with a correction prompt when non-Claude models narrate instead of
     * emitting tool calls. Returns the collected text from the retry.
     */
    fetchRetry(originalRequest: AnthropicMessagesRequest, narration: string): Promise<string>;
}
