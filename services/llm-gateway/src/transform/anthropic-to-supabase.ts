/**
 * Transform Anthropic Messages API request to Supabase Edge Function format
 * With proper tool calling support
 */

import {
    AnthropicMessagesRequest,
    AnthropicMessage,
    AnthropicContentBlock,
    AnthropicTool,
} from '../types/index.js';
import { compactMessages, estimateTokens } from './compact-messages.js';

export interface SupabaseGenerateRequest {
    model: string;
    prompt: string;
    instruction: string;
    streaming: boolean;
    user: {
        id: string;
        tier: string;
        quota: number;
    };
    images?: string[];
    previousHtml?: string;
}

/**
 * Model mapping from Anthropic model names to Supabase-supported models
 */
const MODEL_MAP: Record<string, string> = {
    // Claude 4.6
    'claude-opus-4-6': 'claude-opus-4-6',
    'claude-opus-4-6-20260201': 'claude-opus-4-6',
    // Claude 4.5
    'claude-opus-4-5-20251101': 'claude-opus-4-5-20251101',
    'claude-opus-4-5': 'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929': 'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-5-thinking': 'claude-sonnet-4-5-20250929',
    'claude-opus-4-5-thinking': 'claude-opus-4-5-20251101',
    // Gemini
    'gemini-3-pro-preview': 'gemini-3-pro-preview',
    'gemini-3-pro-high': 'gemini-3-pro-preview',
    'gemini-3-flash': 'gemini-3-pro-preview',
    'gemini-3-flash-preview': 'gemini-3-pro-preview',
    'gemini-2.5-pro': 'gemini-2.5-pro',
    // OpenAI
    'gpt-5.2-2025-12-11': 'gpt-5.2-2025-12-11',
    'gpt-5.1-2025-11-13': 'gpt-5.1-2025-11-13',
    // Claude Haiku 4.5
    'claude-haiku-4-5-20251001': 'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5': 'claude-sonnet-4-5-20250929',
    // Legacy Claude mappings → upgrade to best available
    'claude-3-opus-20240229': 'claude-opus-4-5-20251101',
    'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5-20250929',
    'claude-3-5-sonnet-latest': 'claude-sonnet-4-5-20250929',
    'claude-3-sonnet-20240229': 'claude-sonnet-4-5-20250929',
    'claude-3-haiku-20240307': 'claude-sonnet-4-5-20250929',
};

/**
 * Extract text content from Anthropic message content
 * Preserves tool_use and tool_result blocks in a structured format
 * that the model can understand for multi-turn tool interactions
 */
function extractTextContent(content: string | AnthropicContentBlock[]): string {
    if (typeof content === 'string') {
        return content;
    }

    const parts: string[] = [];

    for (const block of content) {
        if (block.type === 'text' && block.text) {
            parts.push(block.text);
        } else if (block.type === 'tool_result') {
            // Format tool result clearly so the model recognizes the tool-use loop
            const toolId = block.tool_use_id || 'unknown';
            const isError = (block as any).is_error === true;
            const resultContent = typeof block.content === 'string'
                ? block.content
                : (Array.isArray(block.content)
                    ? block.content
                        .filter((b: any) => b.type === 'text')
                        .map((b: any) => b.text)
                        .join('\n')
                    : JSON.stringify(block.content));
            const status = isError ? 'ERROR' : 'SUCCESS';
            parts.push(`<tool_result tool_use_id="${toolId}" status="${status}">\n${resultContent}\n</tool_result>`);
        } else if (block.type === 'tool_use') {
            // Format previous tool calls so the model sees what was already called
            parts.push(`<tool_use id="${block.id || 'unknown'}" name="${block.name}">\n${JSON.stringify(block.input || {})}\n</tool_use>`);
        }
    }

    return parts.join('\n');
}

/**
 * Format conversation history as a prompt string
 */
function formatConversationHistory(messages: AnthropicMessage[]): string {
    if (messages.length === 0) {
        return '';
    }

    if (messages.length === 1) {
        return extractTextContent(messages[0].content);
    }

    const formattedMessages = messages.map((msg, index) => {
        const content = extractTextContent(msg.content);
        const role = msg.role === 'user' ? 'Human' : 'Assistant';

        if (index === messages.length - 1 && msg.role === 'user') {
            return content;
        }

        return `${role}: ${content}`;
    });

    if (messages.length > 1) {
        const history = formattedMessages.slice(0, -1).join('\n\n');
        const current = formattedMessages[formattedMessages.length - 1];

        // Check if conversation has tool results — if so, add a format reminder
        const hasToolResults = messages.some(m =>
            Array.isArray(m.content) && m.content.some(b => b.type === 'tool_result')
        );

        // Check if there are multiple pending tool results (parallel tool execution)
        const lastMessage = messages[messages.length - 1];
        const toolResultCount = Array.isArray(lastMessage.content)
            ? lastMessage.content.filter(b => b.type === 'tool_result').length
            : 0;

        let reminder = '';
        if (hasToolResults && toolResultCount > 1) {
            reminder = '\n\nREMINDER: Multiple tool results provided above. Review ALL results before responding. You can call more tools if needed (multiple at once if independent), or provide a summary if the task is complete.';
        } else if (hasToolResults) {
            reminder = '\n\nREMINDER: Tool result provided above. You can call another tool if needed: {"type":"tool_use","id":"toolu_XXXXX","name":"TOOL_NAME","input":{...}} — or provide a summary if the task is complete.';
        }

        return `Previous conversation:\n${history}\n\nCurrent request:\n${current}${reminder}`;
    }

    return formattedMessages.join('\n\n');
}

/**
 * Generate a few-shot example for a tool based on its name and schema
 */
function generateToolExample(tool: AnthropicTool, exampleIndex: number): string | null {
    const name = tool.name;
    const props = tool.input_schema?.properties || {};
    const required = tool.input_schema?.required || [];

    // Build a minimal valid input from required params
    const input: Record<string, unknown> = {};
    for (const key of required) {
        const prop = (props as Record<string, any>)[key];
        if (!prop) continue;
        if (prop.type === 'string') {
            // Use sensible placeholder based on param name
            if (key.includes('path') || key.includes('file')) input[key] = '.';
            else if (key.includes('command')) input[key] = 'ls -la';
            else if (key.includes('pattern')) input[key] = '*.ts';
            else if (key.includes('content') || key.includes('text')) input[key] = 'hello';
            else input[key] = 'example';
        } else if (prop.type === 'boolean') {
            input[key] = true;
        } else if (prop.type === 'number' || prop.type === 'integer') {
            input[key] = 1;
        } else if (prop.type === 'array') {
            input[key] = [];
        } else if (prop.type === 'object') {
            input[key] = {};
        } else {
            input[key] = 'example';
        }
    }

    // Generate a unique-looking ID for the example
    const exampleId = `toolu_0${exampleIndex}ABC`;
    return JSON.stringify({ type: 'tool_use', id: exampleId, name, input });
}

/**
 * Format tools for the prompt - structured for reliable parsing
 */
function formatToolsForPrompt(tools: AnthropicTool[]): string {
    if (!tools || tools.length === 0) return '';

    // Filter out tools with missing schemas to prevent errors
    const validTools = tools.filter(tool => tool?.name && tool?.input_schema);

    const toolList = validTools.map(tool => {
        const requiredParams = tool.input_schema?.required || [];
        const properties = tool.input_schema?.properties || {};

        const params = Object.entries(properties)
            .map(([key, value]: [string, any]) => {
                const required = requiredParams.includes(key) ? ' (required)' : ' (optional)';
                const type = value.type || 'any';
                const desc = value.description || '';
                return `    "${key}": ${type}${required} - ${desc}`;
            })
            .join('\n');

        return `Tool: ${tool.name}
Description: ${tool.description}
Parameters:
${params}`;
    }).join('\n\n');

    // Generate few-shot examples from available tools (pick up to 3)
    const exampleTools = validTools.slice(0, 3);
    const examples = exampleTools
        .map((t, i) => generateToolExample(t, i + 1))
        .filter(Boolean)
        .map((ex, i) => `Example ${i + 1}: ${ex}`)
        .join('\n');

    return `

## Available Tools

You have access to the following tools. To use a tool, output ONLY raw JSON objects in this exact format:

{"type":"tool_use","id":"toolu_UNIQUE_ID","name":"TOOL_NAME","input":{...parameters...}}

${examples ? `### Few-shot examples of CORRECT output:\n${examples}\n` : ''}
### Multiple Tool Calls:
To call multiple tools in one response, output multiple JSON objects separated by newlines:

{"type":"tool_use","id":"toolu_01ABC","name":"Read","input":{"file_path":"file1.txt"}}
{"type":"tool_use","id":"toolu_02DEF","name":"Read","input":{"file_path":"file2.txt"}}
{"type":"tool_use","id":"toolu_03GHI","name":"Grep","input":{"pattern":"TODO","path":"."}}

### WRONG output (NEVER do this):
- "I'll list the files for you" ← WRONG, narration
- "Let me read that file" ← WRONG, narration
- "Here's what I'll do:" ← WRONG, narration

CRITICAL RULES:
1. Each tool call MUST be a complete JSON object on its own line
2. Generate a unique ID for each tool call using format "toolu_[5-char-alphanumeric]"
3. Do NOT wrap in code blocks, XML tags, or markdown
4. Do NOT narrate, describe, or explain what you plan to do
5. Do NOT output bare parameters without the {"type":"tool_use","name":"...","input":{...}} wrapper
6. You can call multiple independent tools at once (e.g., reading multiple files)
7. Only output plain text when you have completed ALL actions and are giving a final summary
8. Every tool call MUST have ALL 4 fields separated by commas: "type", "id", "name", "input"
9. The "input" field MUST always be a JSON object wrapped in {} — NEVER merge it with "name"
10. Ensure all JSON strings are properly quoted and escaped — use \\n for newlines inside strings
11. STOP IMMEDIATELY after outputting your tool call JSON — do NOT simulate tool results, do NOT write "Human:", do NOT continue the conversation. Your response ENDS after the last tool call JSON.

Available tools:

${toolList}
`;
}

/**
 * Map model name to supported model
 */
export function mapModel(model: string): string {
    // MODEL_OVERRIDE forces ALL requests to this exact model - no mapping, no fallback.
    // If the value is invalid for the provider, the upstream call will fail (by design).
    const override = process.env.MODEL_OVERRIDE;
    if (override) {
        return override;
    }

    if (MODEL_MAP[model]) {
        return MODEL_MAP[model];
    }

    const lowerModel = model.toLowerCase();

    if (lowerModel.includes('opus') && lowerModel.includes('4-6')) {
        return 'claude-opus-4-6';
    }
    if (lowerModel.includes('opus')) {
        return 'claude-opus-4-5-20251101';
    }
    if (lowerModel.includes('sonnet')) {
        return 'claude-sonnet-4-5-20250929';
    }
    if (lowerModel.includes('gemini')) {
        return 'gemini-3-pro-preview';
    }
    if (lowerModel.includes('gpt')) {
        return 'gpt-5.2-2025-12-11';
    }

    return 'claude-opus-4-5-20251101';
}

/**
 * Check if the mapped model is a non-Claude model (GPT, Gemini, etc.)
 * These models need extra prompting help for tool calling.
 */
export function isNonClaudeModel(model: string): boolean {
    const mapped = mapModel(model);
    return !mapped.startsWith('claude');
}

/**
 * Check if thinking mode is enabled
 */
export function isThinkingEnabled(request: AnthropicMessagesRequest): boolean {
    return request.thinking?.type === 'enabled';
}

/**
 * Check if request has tools
 */
export function hasTools(request: AnthropicMessagesRequest): boolean {
    return Boolean(request.tools && request.tools.length > 0);
}

/**
 * Get system prompt from request
 */
function extractSystemPrompt(system: string | Array<{ type: string; text: string }> | undefined): string {
    if (!system) return '';
    if (typeof system === 'string') return system;
    if (Array.isArray(system)) {
        return system
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');
    }
    return '';
}

/**
 * Build instruction with tool and thinking support
 */
function buildInstruction(
    request: AnthropicMessagesRequest,
    thinkingEnabled: boolean
): string {
    let instruction = extractSystemPrompt(request.system) ||
        'You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.';

    // Add thinking mode instruction
    if (thinkingEnabled) {
        instruction += `

## Thinking Mode
Before providing your answer, think through the problem step-by-step inside <thinking> tags.
After </thinking>, provide your response or tool call.`;
    }

    // Add tools if present - this enables tool calling!
    if (request.tools && request.tools.length > 0) {
        instruction += formatToolsForPrompt(request.tools);
    }

    return instruction;
}

/**
 * Max tokens for the combined prompt + instruction sent to Aura.
 * Aura's limit is 200K tokens; we leave headroom for response + estimation error.
 */
const AURA_MAX_MESSAGE_TOKENS = 160000;

/**
 * Transform Anthropic request to Supabase format
 */
export function transformAnthropicToSupabase(
    request: AnthropicMessagesRequest
): SupabaseGenerateRequest {
    const thinkingEnabled = isThinkingEnabled(request);
    const instruction = buildInstruction(request, thinkingEnabled);

    // Compact messages if they'd exceed Aura's token limit
    // Subtract instruction tokens from the budget
    const instructionTokens = estimateTokens(instruction);
    const messageBudget = AURA_MAX_MESSAGE_TOKENS - instructionTokens;
    const messages = compactMessages(request.messages, messageBudget);
    const prompt = formatConversationHistory(messages);
    const model = mapModel(request.model);

    return {
        model,
        prompt,
        instruction,
        streaming: request.stream ?? true,
        user: {
            id: 'claude-code-proxy',
            tier: 'pro',
            quota: 1000000,
        },
    };
}
