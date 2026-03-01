/**
 * Anthropic Response Emitters
 *
 * Shared logic for emitting responses in Anthropic Messages API format.
 * Used by /v1/messages — handles both streaming (SSE) and non-streaming (JSON).
 */

import { Response } from 'express';
import {
    formatSSEEvent,
    createMessageStartEvent,
    createContentBlockStartEvent,
    createContentBlockDeltaEvent,
    createContentBlockStopEvent,
    createMessageDeltaEvent,
    createMessageStopEvent,
    createNonStreamingResponse,
    parseToolCalls,
    parseThinkingBlocks,
} from '../transform/supabase-to-anthropic.js';

/**
 * Content block used internally before emission.
 */
interface ContentBlock {
    type: 'text' | 'thinking' | 'tool_use';
    text?: string;
    thinking?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
}

/**
 * Parse raw content into blocks (text, thinking, tool_use) based on request context.
 */
export function parseContentBlocks(
    content: string,
    opts: { thinkingEnabled: boolean; toolsPresent: boolean; toolNames?: string[] }
): { blocks: ContentBlock[]; stopReason: 'end_turn' | 'tool_use' } {
    let blocks: ContentBlock[];
    let stopReason: 'end_turn' | 'tool_use' = 'end_turn';

    if (opts.toolsPresent) {
        const result = parseToolCalls(content, opts.toolNames);
        if (result.hasToolUse) {
            blocks = result.blocks as ContentBlock[];
            stopReason = 'tool_use';
        } else {
            blocks = [{ type: 'text', text: content }];
        }
    } else if (opts.thinkingEnabled) {
        blocks = parseThinkingBlocks(content) as ContentBlock[];
    } else {
        blocks = [{ type: 'text', text: content }];
    }

    if (blocks.length === 0) {
        blocks = [{ type: 'text', text: content || 'No response generated.' }];
    }

    return { blocks, stopReason };
}

/**
 * Write SSE headers to the response.
 */
function writeSSEHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
}

/**
 * Emit content blocks as Anthropic SSE events.
 */
function emitBlocks(res: Response, blocks: ContentBlock[]): number {
    let blockIndex = 0;

    for (const block of blocks) {
        if (block.type === 'thinking' && block.thinking) {
            res.write(formatSSEEvent('content_block_start', createContentBlockStartEvent(blockIndex, 'thinking')));
            res.write(formatSSEEvent('content_block_delta', createContentBlockDeltaEvent(block.thinking, blockIndex, 'thinking_delta')));
            res.write(formatSSEEvent('content_block_stop', createContentBlockStopEvent(blockIndex)));
            blockIndex++;
        } else if (block.type === 'tool_use' && block.id && block.name) {
            const anthropicInput = { ...(block.input || {}) };
            delete (anthropicInput as any).filePath;
            res.write(formatSSEEvent('content_block_start', createContentBlockStartEvent(blockIndex, 'tool_use', {
                id: block.id,
                name: block.name,
            })));
            res.write(formatSSEEvent('content_block_delta', createContentBlockDeltaEvent(
                JSON.stringify(anthropicInput),
                blockIndex,
                'input_json_delta'
            )));
            res.write(formatSSEEvent('content_block_stop', createContentBlockStopEvent(blockIndex)));
            blockIndex++;
        } else if (block.type === 'text' && block.text) {
            res.write(formatSSEEvent('content_block_start', createContentBlockStartEvent(blockIndex, 'text')));
            res.write(formatSSEEvent('content_block_delta', createContentBlockDeltaEvent(block.text, blockIndex)));
            res.write(formatSSEEvent('content_block_stop', createContentBlockStopEvent(blockIndex)));
            blockIndex++;
        }
    }

    return blockIndex;
}

/**
 * Emit a full Anthropic streaming (SSE) response.
 */
export function emitAnthropicSSE(
    res: Response,
    content: string,
    model: string,
    opts: { thinkingEnabled: boolean; toolsPresent: boolean; toolNames?: string[] }
): void {
    writeSSEHeaders(res);

    res.write(formatSSEEvent('message_start', createMessageStartEvent(model)));

    const { blocks, stopReason } = parseContentBlocks(content, opts);
    emitBlocks(res, blocks);

    res.write(formatSSEEvent('message_delta', createMessageDeltaEvent(Math.ceil(content.length / 4), stopReason)));
    res.write(formatSSEEvent('message_stop', createMessageStopEvent()));
    res.end();
}

/**
 * Emit a full Anthropic non-streaming (JSON) response.
 */
export function emitAnthropicJSON(
    res: Response,
    content: string,
    model: string,
    opts: { thinkingEnabled: boolean; toolNames?: string[] }
): void {
    res.json(createNonStreamingResponse(content, model, opts.thinkingEnabled, opts.toolNames));
}

/**
 * Emit an Anthropic-format error in SSE.
 */
export function emitAnthropicError(res: Response, message: string, model: string): void {
    writeSSEHeaders(res);
    res.write(formatSSEEvent('message_start', createMessageStartEvent(model)));
    res.write(formatSSEEvent('content_block_start', createContentBlockStartEvent(0, 'text')));
    res.write(formatSSEEvent('content_block_delta', createContentBlockDeltaEvent(message, 0)));
    res.write(formatSSEEvent('content_block_stop', createContentBlockStopEvent(0)));
    res.write(formatSSEEvent('message_delta', createMessageDeltaEvent(5, 'end_turn')));
    res.write(formatSSEEvent('message_stop', createMessageStopEvent()));
    res.end();
}
