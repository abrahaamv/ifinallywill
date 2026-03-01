/**
 * Format Converters
 *
 * Converts between OpenAI Chat Completions format and Anthropic Messages format.
 * Used so that:
 *  - /v1/messages can serve ANY model (even non-Claude) in Anthropic format
 *  - /v1/chat/completions can serve ANY model (even Claude) in OpenAI format
 */

import {
    AnthropicMessagesRequest,
    AnthropicMessage,
    AnthropicContentBlock,
} from '../types/index.js';

/**
 * OpenAI Chat Completion request format
 */
export interface OpenAIChatRequest {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string | null;
        name?: string;
        tool_call_id?: string;
        tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
        }>;
    }>;
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stop?: string | string[];
    tools?: Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: Record<string, unknown>;
        };
    }>;
    tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * Convert OpenAI messages to Anthropic messages.
 */
function convertMessages(openaiMessages: OpenAIChatRequest['messages']): {
    system: string | undefined;
    messages: AnthropicMessage[];
} {
    let system: string | undefined;
    const messages: AnthropicMessage[] = [];

    for (const msg of openaiMessages) {
        if (msg.role === 'system') {
            system = (system ? system + '\n' : '') + (msg.content || '');
            continue;
        }

        if (msg.role === 'user') {
            messages.push({ role: 'user', content: msg.content || '' });
        } else if (msg.role === 'assistant') {
            const contentBlocks: AnthropicContentBlock[] = [];

            if (msg.content) {
                contentBlocks.push({ type: 'text', text: msg.content });
            }

            if (msg.tool_calls && msg.tool_calls.length > 0) {
                for (const tc of msg.tool_calls) {
                    let input: Record<string, unknown> = {};
                    try {
                        input = JSON.parse(tc.function.arguments);
                    } catch {
                        input = { raw_arguments: tc.function.arguments };
                    }
                    contentBlocks.push({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.function.name,
                        input,
                    });
                }
            }

            messages.push({
                role: 'assistant',
                content: contentBlocks.length > 0 ? contentBlocks : (msg.content || ''),
            });
        } else if (msg.role === 'tool') {
            let resultContent: string | Record<string, unknown>;

            if (typeof msg.content === 'string') {
                resultContent = msg.content;
            } else if (typeof msg.content === 'object' && msg.content !== null) {
                const contentObj = msg.content as Record<string, unknown>;
                if (Array.isArray(contentObj.questions)) {
                    const questions = contentObj.questions as Array<{ question?: string; answer?: string }>;
                    const questionTexts = questions
                        .map(q => q.question || q.answer || '')
                        .filter(Boolean)
                        .join('\n');
                    resultContent = questionTexts || JSON.stringify(contentObj);
                } else {
                    resultContent = JSON.stringify(contentObj);
                }
            } else {
                resultContent = String(msg.content || '');
            }

            messages.push({
                role: 'user',
                content: [{
                    type: 'tool_result',
                    tool_use_id: msg.tool_call_id || '',
                    content: resultContent,
                }] as AnthropicContentBlock[],
            });
        }
    }

    return { system, messages };
}

/**
 * Convert OpenAI tools to Anthropic tools.
 */
function convertTools(openaiTools?: OpenAIChatRequest['tools']) {
    if (!openaiTools || openaiTools.length === 0) return undefined;

    return openaiTools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: {
            type: 'object' as const,
            properties: (tool.function.parameters as any)?.properties || {},
            required: (tool.function.parameters as any)?.required,
        },
    }));
}

/**
 * Convert OpenAI tool_choice to Anthropic tool_choice.
 */
function convertToolChoice(choice?: OpenAIChatRequest['tool_choice']) {
    if (!choice) return undefined;
    if (choice === 'none') return undefined;
    if (choice === 'auto') return { type: 'auto' };
    if (choice === 'required') return { type: 'any' };
    if (typeof choice === 'object' && choice.function) {
        return { type: 'tool', name: choice.function.name };
    }
    return undefined;
}

/**
 * Convert an OpenAI Chat Completions request to an Anthropic Messages request.
 */
export function openaiToAnthropic(openaiRequest: OpenAIChatRequest): AnthropicMessagesRequest {
    const { system, messages } = convertMessages(openaiRequest.messages);
    const tools = convertTools(openaiRequest.tools);
    const toolChoice = convertToolChoice(openaiRequest.tool_choice);

    return {
        model: openaiRequest.model || 'claude-opus-4-5-20251101',
        max_tokens: openaiRequest.max_tokens || 8192,
        messages,
        system,
        stream: openaiRequest.stream ?? false,
        temperature: openaiRequest.temperature,
        top_p: openaiRequest.top_p,
        stop_sequences: openaiRequest.stop
            ? (Array.isArray(openaiRequest.stop) ? openaiRequest.stop : [openaiRequest.stop])
            : undefined,
        tools,
        tool_choice: toolChoice,
    };
}
