/**
 * /v1/chat/completions — OpenAI Chat Completions API
 *
 * Accepts OpenAI-format requests, converts to Anthropic internally,
 * routes through the active provider, and emits responses in proper
 * OpenAI SSE or JSON format.
 *
 * Works with ANY model (Claude, GPT, Gemini, etc.) — tool calls are
 * correctly formatted as OpenAI function calls regardless of the backend.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { hasTools } from '../transform/anthropic-to-supabase.js';
import { parseToolCallsFromText } from '../transform/supabase-to-anthropic.js';
import { getProvider } from '../providers/index.js';
import { openaiToAnthropic, OpenAIChatRequest } from '../formats/converters.js';
import { emitOpenAISSE, emitOpenAIJSON, emitOpenAIError } from '../formats/openai.js';

const router = Router();

const MAX_TOOL_RETRIES = 2;

// ─────────────────────────────────────────────────────────
// POST /v1/chat/completions
// ─────────────────────────────────────────────────────────

router.post('/v1/chat/completions', async (req: Request, res: Response) => {
    try {
        const openaiRequest = req.body as OpenAIChatRequest;
        const completionId = `chatcmpl-${uuidv4().replace(/-/g, '')}`;

        console.log('[Completions] ══════════════════════════════════════');

        // Validate request
        if (!openaiRequest.messages || !Array.isArray(openaiRequest.messages)) {
            emitOpenAIError(res, 400, 'messages is required and must be an array', 'invalid_request_error', 'invalid_messages');
            return;
        }

        // Convert OpenAI → Anthropic internal format
        const anthropicRequest = openaiToAnthropic(openaiRequest);
        const provider = getProvider();
        const model = provider.mapModel(anthropicRequest.model);
        const toolsPresent = hasTools(anthropicRequest);
        const toolNames = openaiRequest.tools?.map(t => t.function.name);
        const nonClaude = provider.isNonClaudeModel(anthropicRequest.model);

        console.log(`[Completions] Provider: ${provider.name}, Model: ${openaiRequest.model} → ${model}`);
        console.log(`[Completions] Stream: ${openaiRequest.stream}, Messages: ${openaiRequest.messages.length}, Tools: ${toolNames?.length || 0}${nonClaude ? ' (non-Claude, retry enabled)' : ''}`);

        // Fetch completion from provider
        let content: string;
        try {
            content = await provider.fetchCompletion(anthropicRequest);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Provider error';
            console.error(`[Completions] Provider error: ${msg}`);
            emitOpenAIError(res, 502, msg, 'api_error', 'upstream_error');
            return;
        }

        console.log(`[Completions] Response length: ${content.length} chars`);

        // Handle empty responses
        if (!content || content.trim().length === 0) {
            content = 'No response generated. Please try again.';
        }

        // Auto-retry for non-Claude models that narrate instead of calling tools
        if (toolsPresent && nonClaude) {
            let { toolCalls } = parseToolCallsFromText(content, toolNames);

            for (let retry = 0; retry < MAX_TOOL_RETRIES && toolCalls.length === 0; retry++) {
                console.log(`[Completions] Non-Claude narrated instead of calling tools. Retry ${retry + 1}/${MAX_TOOL_RETRIES}...`);
                try {
                    content = await provider.fetchRetry(anthropicRequest, content);
                    const retryResult = parseToolCallsFromText(content, toolNames);
                    toolCalls = retryResult.toolCalls;
                    if (toolCalls.length > 0) {
                        console.log(`[Completions] Retry succeeded — found ${toolCalls.length} tool call(s)`);
                    }
                } catch {
                    console.error(`[Completions] Retry ${retry + 1} failed`);
                    break;
                }
            }
        }

        // Emit response in OpenAI format
        if (openaiRequest.stream) {
            emitOpenAISSE(res, content, model, completionId, toolNames);
        } else {
            emitOpenAIJSON(res, content, model, completionId, toolNames);
        }
    } catch (error) {
        console.error('[Completions] Error:', error);

        if (res.headersSent) {
            try {
                res.write('data: [DONE]\n\n');
                res.end();
            } catch { /* already closed */ }
            return;
        }

        emitOpenAIError(
            res, 500,
            error instanceof Error ? error.message : 'Internal server error',
            'server_error'
        );
    }
});

export default router;
