/**
 * OCR Arena Provider
 *
 * Specialized for vision and OCR tasks. Supports 20+ models
 * across Anthropic, Gemini, GPT, and specialized OCR models.
 */

import { LLMProvider } from './base.js';
import { AnthropicMessagesRequest } from '../types/index.js';
import { transformAnthropicToOcrArena } from '../transform/anthropic-to-ocrarena.js';
import { collectOcrArenaStreamContent } from '../transform/ocrarena-collector.js';
import { compactMessages } from '../transform/compact-messages.js';

const OCRARENA_API_URL = process.env.OCRARENA_API_URL || 'https://www.ocrarena.ai/api/ocr/stream';

export class OcrArenaProvider implements LLMProvider {
    readonly name = 'ocrarena';

    mapModel(model: string): string {
        // OCR Arena uses its own model mapping via transformAnthropicToOcrArena
        // Return the client-facing model name; the actual UUID mapping happens in the transform
        return model;
    }

    isNonClaudeModel(model: string): boolean {
        const lower = model.toLowerCase();
        return !lower.includes('claude');
    }

    async fetchCompletion(request: AnthropicMessagesRequest): Promise<string> {
        // OCR Arena models vary in context size; compact conservatively
        const compacted = { ...request, messages: compactMessages(request.messages, 100000) };
        const ocrArenaRequest = transformAnthropicToOcrArena(compacted);

        console.log(`[OCR Arena] Model: ${request.model}, Images: ${ocrArenaRequest.imageUrls.length}, Prompt: ${ocrArenaRequest.settings.prompt.length} chars`);

        const response = await fetch(OCRARENA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: '*/*',
                Origin: 'https://www.ocrarena.ai',
                Referer: 'https://www.ocrarena.ai/',
            },
            body: JSON.stringify(ocrArenaRequest),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OCR Arena API Error ${response.status}: ${errorText}`);
        }

        return collectOcrArenaStreamContent(response);
    }

    async fetchRetry(request: AnthropicMessagesRequest, _narration: string): Promise<string> {
        // OCR Arena doesn't support retry — re-fetch
        return this.fetchCompletion(request);
    }
}
