/**
 * /v1/messages — Anthropic Messages API
 *
 * Accepts Anthropic-format requests, routes through the active provider,
 * and emits responses in proper Anthropic SSE or JSON format.
 *
 * Works with ANY model (Claude, GPT, Gemini, etc.) — the provider handles
 * upstream translation, and tool calls are parsed from the raw response.
 */

import { Router, Request, Response } from 'express';
import { AnthropicMessagesRequest } from '../types/index.js';
import { isThinkingEnabled, hasTools } from '../transform/anthropic-to-supabase.js';
import { parseToolCalls } from '../transform/supabase-to-anthropic.js';
import { getProvider } from '../providers/index.js';
import { emitAnthropicSSE, emitAnthropicJSON, emitAnthropicError } from '../formats/anthropic.js';
import { validateProviderConfig } from '../services/provider.js';

const router = Router();

const MAX_TOOL_RETRIES = 2;

// ─────────────────────────────────────────────────────────
// Token counting stub (Claude Code calls this before requests)
// ─────────────────────────────────────────────────────────

router.post('/v1/messages/count_tokens', (req: Request, res: Response) => {
    const body = req.body || {};
    const messages = body.messages || [];
    let charCount = 0;

    if (body.system) {
        if (typeof body.system === 'string') {
            charCount += body.system.length;
        } else if (Array.isArray(body.system)) {
            for (const block of body.system) {
                if (block.text) charCount += block.text.length;
            }
        }
    }

    for (const msg of messages) {
        if (typeof msg.content === 'string') {
            charCount += msg.content.length;
        } else if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
                if (block.text) charCount += block.text.length;
                if (block.input) charCount += JSON.stringify(block.input).length;
                if (block.content) {
                    if (typeof block.content === 'string') charCount += block.content.length;
                    else charCount += JSON.stringify(block.content).length;
                }
            }
        }
    }

    if (body.tools) {
        charCount += JSON.stringify(body.tools).length;
    }

    res.json({ input_tokens: Math.ceil(charCount / 4) });
});

// ─────────────────────────────────────────────────────────
// POST /v1/messages
// ─────────────────────────────────────────────────────────

router.post('/v1/messages', async (req: Request, res: Response) => {
    try {
        const request = req.body as AnthropicMessagesRequest;

        console.log('[Messages] ══════════════════════════════════════');

        // Validate request
        if (!request.messages || !Array.isArray(request.messages)) {
            res.status(400).json({
                type: 'error',
                error: { type: 'invalid_request_error', message: 'messages is required and must be an array' },
            });
            return;
        }

        // Validate provider config
        const providerCheck = validateProviderConfig();
        if (!providerCheck.valid) {
            res.status(500).json({
                type: 'error',
                error: { type: 'api_error', message: providerCheck.error },
            });
            return;
        }

        const provider = getProvider();
        const model = provider.mapModel(request.model);
        const thinkingEnabled = isThinkingEnabled(request);
        const toolsPresent = hasTools(request);
        const toolNames = request.tools?.map(t => t.name);
        const nonClaude = provider.isNonClaudeModel(request.model);

        console.log(`[Messages] Provider: ${provider.name}, Model: ${request.model} → ${model}`);
        console.log(`[Messages] Stream: ${request.stream}, Think: ${thinkingEnabled}, Tools: ${toolsPresent ? request.tools?.length : 0}${nonClaude ? ' (non-Claude, retry enabled)' : ''}`);

        // Fetch completion from provider
        let content: string;
        try {
            content = await provider.fetchCompletion(request);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Provider error';
            console.error(`[Messages] Provider error: ${msg}`);
            emitAnthropicError(res, msg, model);
            return;
        }

        console.log(`[Messages] Response length: ${content.length} chars`);

        // Handle empty responses
        if (!content || content.trim().length === 0) {
            content = 'No response generated. Please try again.';
        }

        // Auto-retry for non-Claude models that narrate instead of calling tools
        if (toolsPresent && nonClaude) {
            let toolResult = parseToolCalls(content, toolNames);

            for (let retry = 0; retry < MAX_TOOL_RETRIES && !toolResult.hasToolUse; retry++) {
                console.log(`[Messages] Non-Claude narrated instead of calling tools. Retry ${retry + 1}/${MAX_TOOL_RETRIES}...`);
                try {
                    content = await provider.fetchRetry(request, content);
                    toolResult = parseToolCalls(content, toolNames);
                    if (toolResult.hasToolUse) {
                        console.log(`[Messages] Retry succeeded — found ${toolResult.blocks.filter(b => b.type === 'tool_use').length} tool call(s)`);
                    }
                } catch {
                    console.error(`[Messages] Retry ${retry + 1} failed`);
                    break;
                }
            }
        }

        // Emit response in Anthropic format
        const opts = { thinkingEnabled, toolsPresent, toolNames };

        if (request.stream) {
            emitAnthropicSSE(res, content, model, opts);
        } else {
            emitAnthropicJSON(res, content, model, { thinkingEnabled, toolNames });
        }
    } catch (error) {
        console.error('[Messages] Error:', error);

        if (res.headersSent) {
            try { res.end(); } catch { /* already closed */ }
            return;
        }

        try {
            const provider = getProvider();
            emitAnthropicError(
                res,
                `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                provider.mapModel('claude-opus-4-5-20251101')
            );
        } catch {
            if (!res.headersSent) {
                res.status(500).json({
                    type: 'error',
                    error: { type: 'api_error', message: 'Internal error' },
                });
            }
        }
    }
});

export default router;
