/**
 * OpenAI Response Emitters
 *
 * Shared logic for emitting responses in OpenAI Chat Completions API format.
 * Used by /v1/chat/completions — handles both streaming (SSE) and non-streaming (JSON).
 */

import { Response } from 'express';
import { parseToolCallsFromText } from '../transform/supabase-to-anthropic.js';

/**
 * Helper to create an OpenAI SSE chunk
 */
function chunk(id: string, model: string, delta: object, finishReason: string | null = null) {
    return {
        id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
            index: 0,
            delta,
            finish_reason: finishReason,
        }],
    };
}

/**
 * Write SSE headers
 */
function writeSSEHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
}

/**
 * Emit a full OpenAI streaming (SSE) response.
 */
export function emitOpenAISSE(
    res: Response,
    content: string,
    model: string,
    completionId: string,
    toolNames?: string[]
): void {
    writeSSEHeaders(res);

    // Initial chunk with role
    res.write(`data: ${JSON.stringify(chunk(completionId, model, { role: 'assistant' }))}\n\n`);

    // Parse tool calls
    const { text: cleanedText, toolCalls } = parseToolCallsFromText(content, toolNames);

    // Stream text content
    if (cleanedText && cleanedText.length > 0) {
        res.write(`data: ${JSON.stringify(chunk(completionId, model, { content: cleanedText }))}\n\n`);
    }

    if (toolCalls.length > 0) {
        // Emit structured tool_calls per OpenAI SSE spec
        for (let i = 0; i < toolCalls.length; i++) {
            const tc = toolCalls[i];

            // First delta: id, type, name, empty arguments
            res.write(`data: ${JSON.stringify(chunk(completionId, model, {
                tool_calls: [{
                    index: i,
                    id: tc.id,
                    type: 'function' as const,
                    function: { name: tc.function.name, arguments: '' },
                }],
            }))}\n\n`);

            // Arguments in chunks
            const args = tc.function.arguments;
            const CHUNK_SIZE = 512;
            for (let offset = 0; offset < args.length; offset += CHUNK_SIZE) {
                res.write(`data: ${JSON.stringify(chunk(completionId, model, {
                    tool_calls: [{
                        index: i,
                        function: { arguments: args.slice(offset, offset + CHUNK_SIZE) },
                    }],
                }))}\n\n`);
            }
        }

        // Final chunk: tool_calls finish reason
        res.write(`data: ${JSON.stringify(chunk(completionId, model, {}, 'tool_calls'))}\n\n`);
    } else {
        // Final chunk: stop
        res.write(`data: ${JSON.stringify(chunk(completionId, model, {}, 'stop'))}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
}

/**
 * Emit a full OpenAI non-streaming (JSON) response.
 */
export function emitOpenAIJSON(
    res: Response,
    content: string,
    model: string,
    completionId: string,
    toolNames?: string[]
): void {
    const { text: cleanedText, toolCalls } = parseToolCallsFromText(content, toolNames);

    let message: any;
    let finishReason = 'stop';

    if (toolCalls.length > 0) {
        message = {
            role: 'assistant',
            content: cleanedText || null,
            tool_calls: toolCalls,
        };
        finishReason = 'tool_calls';
    } else {
        message = {
            role: 'assistant',
            content: cleanedText || content,
        };
    }

    res.json({
        id: completionId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        system_fingerprint: null,
        choices: [{
            index: 0,
            message,
            logprobs: null,
            finish_reason: finishReason,
        }],
        usage: {
            prompt_tokens: 0,
            completion_tokens: Math.ceil(content.length / 4),
            total_tokens: Math.ceil(content.length / 4),
        },
    });
}

/**
 * Emit an OpenAI-format error response.
 */
export function emitOpenAIError(
    res: Response,
    statusCode: number,
    message: string,
    type = 'api_error',
    code?: string
): void {
    res.status(statusCode).json({
        error: { message, type, code },
    });
}
