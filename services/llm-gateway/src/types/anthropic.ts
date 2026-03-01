/**
 * Anthropic API Types
 * Based on Anthropic Messages API specification
 */

export interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
    type: 'text' | 'image' | 'tool_use' | 'tool_result' | 'thinking';
    text?: string;
    thinking?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string | AnthropicContentBlock[];
    signature?: string;
    source?: {
        type: 'url' | 'base64';
        url?: string;
        media_type?: string;
        data?: string;
    };
}

export interface AnthropicThinkingConfig {
    type: 'enabled' | 'disabled';
    budget_tokens?: number;
}

export interface AnthropicTool {
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties: Record<string, unknown>;
        required?: string[];
    };
}

export interface AnthropicMessagesRequest {
    model: string;
    max_tokens: number;
    messages: AnthropicMessage[];
    system?: string | Array<{ type: string; text: string; cache_control?: unknown }>;
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
    thinking?: AnthropicThinkingConfig;
    tools?: AnthropicTool[];
    tool_choice?: { type: string; name?: string };
    metadata?: {
        user_id?: string;
    };
}

export interface AnthropicMessagesResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    content: AnthropicContentBlock[];
    model: string;
    stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
    stop_sequence: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

// SSE Event Types
export interface MessageStartEvent {
    type: 'message_start';
    message: {
        id: string;
        type: 'message';
        role: 'assistant';
        content: [];
        model: string;
        stop_reason: null;
        stop_sequence: null;
        usage: {
            input_tokens: number;
            output_tokens: number;
        };
    };
}

export interface ContentBlockStartEvent {
    type: 'content_block_start';
    index: number;
    content_block: {
        type: 'text' | 'thinking' | 'tool_use';
        text?: string;
        thinking?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown> | string;
    };
}

export interface ContentBlockDeltaEvent {
    type: 'content_block_delta';
    index: number;
    delta: {
        type: 'text_delta' | 'thinking_delta' | 'input_json_delta';
        text?: string;
        thinking?: string;
        partial_json?: string;
    };
}

export interface ContentBlockStopEvent {
    type: 'content_block_stop';
    index: number;
}

export interface MessageDeltaEvent {
    type: 'message_delta';
    delta: {
        stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
        stop_sequence: string | null;
    };
    usage: {
        output_tokens: number;
    };
}

export interface MessageStopEvent {
    type: 'message_stop';
}

export type AnthropicSSEEvent =
    | MessageStartEvent
    | ContentBlockStartEvent
    | ContentBlockDeltaEvent
    | ContentBlockStopEvent
    | MessageDeltaEvent
    | MessageStopEvent;
