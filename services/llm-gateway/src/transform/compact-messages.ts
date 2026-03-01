/**
 * Shared context compaction for all providers.
 * Two-phase approach:
 *   1. Compress large tool_result blocks (preserves all messages)
 *   2. Drop older middle messages if still over budget
 */

import { AnthropicMessage, AnthropicContentBlock } from '../types/index.js';

const MAX_TOOL_RESULT_CHARS = 30000;
const TRUNCATION_MARKER = '\n\n... [content truncated to fit context limit] ...';

/**
 * Estimate token count from character length.
 * Rough heuristic: ~4 chars per token for English/code mixed content.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Estimate the total character length of a messages array.
 */
function estimateMessagesLength(messages: AnthropicMessage[]): number {
    let total = 0;
    for (const msg of messages) {
        if (typeof msg.content === 'string') {
            total += msg.content.length;
        } else if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
                if (block.type === 'text' && block.text) total += block.text.length;
                else if (block.type === 'tool_result') {
                    if (typeof block.content === 'string') total += block.content.length;
                    else if (Array.isArray(block.content)) {
                        total += block.content.reduce((sum: number, b: any) =>
                            sum + (b.text?.length || JSON.stringify(b).length || 0), 0);
                    }
                } else if (block.type === 'tool_use') {
                    total += JSON.stringify(block.input || {}).length;
                }
            }
        }
    }
    return total;
}

/**
 * Phase 1: Compress large tool_result blocks in-place.
 * Preserves all messages but shrinks verbose file reads / command outputs.
 */
function compressToolResults(messages: AnthropicMessage[]): AnthropicMessage[] {
    let totalSaved = 0;

    const compressed = messages.map(msg => {
        if (!Array.isArray(msg.content)) return msg;

        let changed = false;
        const newContent = msg.content.map((block: AnthropicContentBlock) => {
            if (block.type !== 'tool_result') return block;

            if (typeof block.content === 'string' && block.content.length > MAX_TOOL_RESULT_CHARS) {
                const original = block.content.length;
                changed = true;
                totalSaved += original - MAX_TOOL_RESULT_CHARS;
                return {
                    ...block,
                    content: block.content.slice(0, MAX_TOOL_RESULT_CHARS) + TRUNCATION_MARKER,
                };
            }

            if (Array.isArray(block.content)) {
                let blockLen = 0;
                const truncatedContent = block.content.map((b: any) => {
                    if (b.type === 'text' && b.text) {
                        blockLen += b.text.length;
                        if (blockLen > MAX_TOOL_RESULT_CHARS) {
                            const excess = blockLen - MAX_TOOL_RESULT_CHARS;
                            const keep = Math.max(0, b.text.length - excess);
                            if (keep < b.text.length) {
                                changed = true;
                                totalSaved += b.text.length - keep;
                                return { ...b, text: b.text.slice(0, keep) + TRUNCATION_MARKER };
                            }
                        }
                    }
                    return b;
                });
                if (changed) return { ...block, content: truncatedContent };
            }

            return block;
        });

        return changed ? { ...msg, content: newContent } : msg;
    });

    if (totalSaved > 0) {
        console.log(`[compactMessages] Phase 1: saved ~${Math.round(totalSaved / 4)} est. tokens by truncating large tool results`);
    }
    return compressed;
}

/**
 * Phase 2: Drop older middle messages.
 * Keeps first 2 messages (context setup) + as many recent messages as fit.
 */
function dropMiddleMessages(
    messages: AnthropicMessage[],
    maxChars: number
): AnthropicMessage[] {
    if (messages.length <= 4) return messages;

    const keepStart = 2;
    let keepEnd = 4;
    let bestMessages = [...messages.slice(0, keepStart), ...messages.slice(-keepEnd)];

    while (keepEnd < messages.length - keepStart) {
        const candidate = [...messages.slice(0, keepStart), ...messages.slice(-(keepEnd + 2))];
        if (estimateMessagesLength(candidate) > maxChars) {
            break;
        }
        keepEnd += 2;
        bestMessages = candidate;
    }

    const droppedCount = messages.length - bestMessages.length;
    if (droppedCount > 0) {
        const notice: AnthropicMessage = {
            role: 'user',
            content: `[System: ${droppedCount} earlier messages were trimmed to fit context limits. The conversation continues from the most recent messages below.]`,
        };
        bestMessages = [
            ...bestMessages.slice(0, keepStart),
            notice,
            ...bestMessages.slice(keepStart),
        ];
        console.log(`[compactMessages] Phase 2: dropped ${droppedCount} middle messages, kept first ${keepStart} + last ${keepEnd}`);
    }

    return bestMessages;
}

/**
 * Compact messages to fit within a token budget.
 * Used by all providers before their specific request transforms.
 *
 * @param messages - The raw Anthropic messages array
 * @param maxTokens - Maximum token budget for messages (provider-specific)
 * @returns Compacted messages array
 */
export function compactMessages(
    messages: AnthropicMessage[],
    maxTokens: number
): AnthropicMessage[] {
    const maxChars = maxTokens * 4; // Inverse of estimateTokens

    // Quick check: does it already fit?
    const totalChars = estimateMessagesLength(messages);
    if (totalChars <= maxChars) {
        return messages;
    }

    const estTokens = Math.ceil(totalChars / 4);
    console.log(`[compactMessages] Messages ~${estTokens} est. tokens exceeds budget ~${maxTokens}, compacting ${messages.length} messages`);

    // Phase 1: compress large tool results
    let result = compressToolResults(messages);
    let resultChars = estimateMessagesLength(result);
    if (resultChars <= maxChars) {
        console.log(`[compactMessages] Phase 1 sufficient: ~${Math.ceil(resultChars / 4)} tokens`);
        return result;
    }

    // Phase 2: drop middle messages
    console.log(`[compactMessages] Phase 1 reduced to ~${Math.ceil(resultChars / 4)} tokens, still over. Dropping middle messages...`);
    result = dropMiddleMessages(result, maxChars);

    return result;
}
