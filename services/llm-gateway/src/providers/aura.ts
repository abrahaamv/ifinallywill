/**
 * Aura (Supabase) Provider
 *
 * Routes requests through Supabase Edge Functions (generate-html).
 * Supports full tool calling with parallel execution and auto-retry for non-Claude models.
 */

import { LLMProvider } from './base.js';
import { AnthropicMessagesRequest } from '../types/index.js';
import {
    transformAnthropicToSupabase,
    mapModel,
    isNonClaudeModel,
    SupabaseGenerateRequest,
} from '../transform/anthropic-to-supabase.js';
import {
    parseSupabaseSSELine,
    extractChunkContent,
} from '../transform/supabase-to-anthropic.js';
import { authService } from '../services/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hoirqrkdgbmvpwutwuwj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

/**
 * Patterns that indicate the model is hallucinating tool results
 * (i.e., role-playing both sides of the conversation in a single response).
 * When detected, we stop reading the stream to save tokens and time.
 */
const HALLUCINATION_PATTERNS = [
    '\nH: ',              // Abbreviated "Human:" turn
    '\nHuman: ',          // Full "Human:" turn
    '\n\nHuman:',         // Double-newline human turn
    '<tool_result',       // Model generating fake tool results
    '_result tool_use_id=', // Malformed tool result
];

/**
 * Check if accumulated content contains hallucinated conversation turns.
 * Only checks after we've seen at least one tool call (the model should stop there).
 */
function detectHallucination(content: string): boolean {
    // Only check if content has tool calls first
    const hasToolCall = content.includes('"type":"tool_use"') ||
        content.includes('"type": "tool_use"') ||
        content.includes('<tool_use ');
    if (!hasToolCall) return false;

    // Find the last tool call position
    const lastToolIdx = Math.max(
        content.lastIndexOf('"type":"tool_use"'),
        content.lastIndexOf('"type": "tool_use"'),
        content.lastIndexOf('<tool_use ')
    );

    // Check if hallucination patterns appear AFTER the last tool call
    const afterTools = content.slice(lastToolIdx);
    return HALLUCINATION_PATTERNS.some(p => afterTools.includes(p));
}

/**
 * Truncate content at the first hallucinated conversation turn.
 * Keeps everything up to (but not including) the hallucinated Human/tool_result.
 */
function truncateAtHallucination(content: string): string {
    // Find the last tool call position
    const lastToolIdx = Math.max(
        content.lastIndexOf('"type":"tool_use"'),
        content.lastIndexOf('"type": "tool_use"'),
        content.lastIndexOf('<tool_use ')
    );
    if (lastToolIdx === -1) return content;

    // Find the end of the last tool call's JSON object or XML tag
    const afterLastTool = content.slice(lastToolIdx);

    // For JSON tool calls, find the closing brace
    let cutPoint = content.length;
    if (afterLastTool.startsWith('"type"')) {
        // Count braces to find end of JSON object
        const searchStart = content.lastIndexOf('{', lastToolIdx);
        if (searchStart !== -1) {
            let depth = 0;
            let inString = false;
            let escaped = false;
            for (let i = searchStart; i < content.length; i++) {
                const ch = content[i];
                if (escaped) { escaped = false; continue; }
                if (ch === '\\') { escaped = true; continue; }
                if (ch === '"') { inString = !inString; continue; }
                if (inString) continue;
                if (ch === '{') depth++;
                if (ch === '}') {
                    depth--;
                    if (depth === 0) {
                        cutPoint = i + 1;
                        break;
                    }
                }
            }
        }
    } else if (afterLastTool.startsWith('<tool_use')) {
        // For XML, find </tool_use> closing tag
        const closeIdx = content.indexOf('</tool_use>', lastToolIdx);
        if (closeIdx !== -1) {
            cutPoint = closeIdx + '</tool_use>'.length;
        }
    }

    const truncated = content.slice(0, cutPoint).trim();
    if (truncated.length < content.length - 10) {
        console.log(`[Aura] Truncated hallucinated content: ${content.length} → ${truncated.length} chars (saved ${content.length - truncated.length} chars)`);
    }
    return truncated;
}

/**
 * Collect full text from a Supabase SSE stream.
 * Includes early termination when the model starts hallucinating tool results.
 */
async function collectStreamContent(response: globalThis.Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return '';

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let hallucinationDetected = false;

    try {
        while (true) {
            let readResult;
            try {
                readResult = await reader.read();
            } catch {
                break;
            }
            const { done, value } = readResult;
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const parsed = parseSupabaseSSELine(line);
                if (!parsed) continue;
                const content = extractChunkContent(parsed);
                if (content) fullContent += content;
            }

            // Check for hallucination every ~4KB to avoid checking too frequently
            if (!hallucinationDetected && fullContent.length > 500 && fullContent.length % 4096 < 256) {
                if (detectHallucination(fullContent)) {
                    hallucinationDetected = true;
                    console.log(`[Aura] Hallucination detected at ${fullContent.length} chars — stopping stream early`);
                    break;
                }
            }
        }

        if (!hallucinationDetected && buffer.trim()) {
            const parsed = parseSupabaseSSELine(buffer);
            if (parsed) {
                const content = extractChunkContent(parsed);
                if (content) fullContent += content;
            }
        }
    } finally {
        reader.releaseLock();
    }

    // Final truncation pass — even if we didn't catch it during streaming
    if (detectHallucination(fullContent)) {
        fullContent = truncateAtHallucination(fullContent);
    }

    return fullContent;
}

/**
 * Make an authenticated request to Supabase with auto-refresh on 401/403
 */
async function makeSupabaseRequest(
    supabaseRequest: SupabaseGenerateRequest,
    retryCount = 0
): Promise<globalThis.Response> {
    const accessToken = await authService.getAccessToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const endpoint = `${SUPABASE_URL}/functions/v1/generate-html`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(supabaseRequest),
    });

    if ((response.status === 401 || response.status === 403) && retryCount < 1) {
        console.log('[Aura] Auth error, refreshing token...');
        await authService.forceRefresh();
        return makeSupabaseRequest(supabaseRequest, retryCount + 1);
    }

    return response;
}

export class AuraProvider implements LLMProvider {
    readonly name = 'aura';

    mapModel(model: string): string {
        return mapModel(model);
    }

    isNonClaudeModel(model: string): boolean {
        return isNonClaudeModel(model);
    }

    async fetchCompletion(request: AnthropicMessagesRequest): Promise<string> {
        if (!SUPABASE_ANON_KEY) {
            throw new Error('SUPABASE_ANON_KEY not configured (required for PROVIDER=aura)');
        }

        const supabaseRequest = transformAnthropicToSupabase(request);
        const mapped = this.mapModel(request.model);

        console.log(`[Aura] Model: ${request.model} → ${mapped}`);
        console.log(`[Aura] Stream: ${supabaseRequest.streaming}, Messages: ${request.messages.length}, Tools: ${request.tools?.length || 0}`);

        const response = await makeSupabaseRequest(supabaseRequest);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Aura API Error ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('text/event-stream') || supabaseRequest.streaming) {
            return collectStreamContent(response);
        }

        const data = (await response.json()) as any;
        return data.response || data.html || data.content || data.text || JSON.stringify(data);
    }

    async fetchRetry(request: AnthropicMessagesRequest, narration: string): Promise<string> {
        const supabaseRequest = transformAnthropicToSupabase(request);

        const correctionPrompt = `Previous conversation:\nHuman: ${supabaseRequest.prompt}\n\nAssistant: ${narration}\n\nHuman: STOP. You did NOT follow instructions. You output plain text narration instead of a tool call JSON.\nYou MUST respond with ONLY JSON objects in this format (one per line for multiple tools):\n{"type":"tool_use","id":"toolu_01ABC","name":"TOOL_NAME","input":{...}}\n\nDo NOT explain. Do NOT narrate. Output the tool call JSON now (you can output multiple if needed).`;

        const retryReq: SupabaseGenerateRequest = {
            ...supabaseRequest,
            prompt: correctionPrompt,
        };

        const response = await makeSupabaseRequest(retryReq);
        if (!response.ok) {
            throw new Error(`Aura retry failed: ${response.status}`);
        }

        return collectStreamContent(response);
    }
}
