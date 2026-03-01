/**
 * tldraw Provider
 *
 * Uses tldraw's agent endpoint in text-only mode.
 * The model receives the "fsociety kernel" prompt and emits tool calls
 * which are parsed from the stream.
 */

import { LLMProvider } from './base.js';
import { AnthropicMessagesRequest } from '../types/index.js';
import { mapModel } from '../transform/anthropic-to-supabase.js';
import { convertToTldrawRequest, cleanTldrawContent, TldrawChatRequest } from '../routes/tldraw-handler.js';
import { parseSSELine } from '../transform/tldraw-parser.js';
import { compactMessages } from '../transform/compact-messages.js';

const TLDRAW_AGENT_URL = process.env.TLDRAW_AGENT_URL || 'https://agent.templates.tldraw.dev/stream';

/**
 * Build a tldraw-compatible request from an Anthropic Messages request
 */
function buildTldrawFromAnthropic(
    anthropicRequest: AnthropicMessagesRequest,
    mappedModel: string
): TldrawChatRequest {
    const messages: TldrawChatRequest['messages'] = [];

    // Add system as a system message
    if (anthropicRequest.system) {
        const systemText = typeof anthropicRequest.system === 'string'
            ? anthropicRequest.system
            : anthropicRequest.system
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('\n');
        if (systemText) {
            messages.push({ role: 'system', content: systemText });
        }
    }

    // Convert Anthropic messages
    for (const msg of anthropicRequest.messages) {
        if (typeof msg.content === 'string') {
            messages.push({ role: msg.role, content: msg.content });
        } else {
            const textParts = msg.content
                .filter(b => b.type === 'text' && b.text)
                .map(b => b.text!)
                .join('\n');
            const toolUseParts = msg.content
                .filter(b => b.type === 'tool_use' && b.name)
                .map(b => `<tool_use id="${b.id || 'unknown'}" name="${b.name}">\n${JSON.stringify(b.input || {})}\n</tool_use>`)
                .join('\n');
            const toolResultParts = msg.content
                .filter(b => b.type === 'tool_result')
                .map(b => {
                    const rc = typeof b.content === 'string' ? b.content
                        : (Array.isArray(b.content)
                            ? (b.content as any[]).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n')
                            : JSON.stringify(b.content));
                    const isError = (b as any).is_error === true;
                    const status = isError ? 'ERROR' : 'SUCCESS';
                    return `<tool_result tool_use_id="${b.tool_use_id}" status="${status}">\n${rc}\n</tool_result>`;
                })
                .join('\n');
            const combined = [textParts, toolUseParts, toolResultParts].filter(Boolean).join('\n');
            if (combined) {
                messages.push({ role: msg.role, content: combined });
            }
        }
    }

    // Convert Anthropic tools to OpenAI-style tools
    const tools = anthropicRequest.tools?.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema as Record<string, unknown>,
        },
    }));

    return {
        model: mappedModel,
        messages,
        stream: anthropicRequest.stream,
        tools,
        enable_canvas: false,
    };
}

/**
 * Collect text content from a tldraw SSE stream
 */
async function collectTldrawContent(response: globalThis.Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return '';

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

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

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const action = parseSSELine(line);
                if (!action) continue;

                if (action._type === 'message' && action.text) {
                    fullContent = action.text;
                } else if (action._type === 'think' && action.text && !fullContent) {
                    fullContent = action.text;
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return fullContent;
}

export class TldrawProvider implements LLMProvider {
    readonly name = 'tldraw';

    mapModel(model: string): string {
        return mapModel(model);
    }

    isNonClaudeModel(model: string): boolean {
        const mapped = this.mapModel(model);
        return !mapped.startsWith('claude');
    }

    async fetchCompletion(request: AnthropicMessagesRequest): Promise<string> {
        const mapped = this.mapModel(request.model);
        // tldraw has a ~128K context window; compact to stay safe
        const compacted = { ...request, messages: compactMessages(request.messages, 100000) };
        const tldrawRequest = buildTldrawFromAnthropic(compacted, mapped);
        const body = convertToTldrawRequest(tldrawRequest);

        console.log(`[tldraw] Model: ${request.model} → ${mapped}`);
        console.log(`[tldraw] Messages: ${request.messages.length}, Tools: ${request.tools?.length || 0}`);

        const response = await fetch(TLDRAW_AGENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: '*/*',
                Origin: 'https://agent.templates.tldraw.dev',
                Referer: 'https://agent.templates.tldraw.dev/',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`tldraw API Error ${response.status}: ${errorText}`);
        }

        const raw = await collectTldrawContent(response);
        const cleaned = cleanTldrawContent(raw);

        console.log(`[tldraw] Raw length: ${raw.length}, cleaned length: ${cleaned.length}`);

        return cleaned;
    }

    async fetchRetry(request: AnthropicMessagesRequest, narration: string): Promise<string> {
        // tldraw doesn't have a separate retry mechanism — re-fetch with the same request
        return this.fetchCompletion(request);
    }
}
