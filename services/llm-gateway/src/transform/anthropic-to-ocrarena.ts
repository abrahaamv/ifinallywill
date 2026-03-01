/**
 * Transform Anthropic Messages API requests to OCR Arena format
 */

import { AnthropicMessagesRequest, AnthropicMessage, AnthropicContentBlock } from '../types/index.js';

export interface OcrArenaRequest {
    imageUrls: string[];
    modelId: string;
    settings: {
        reasoning: string;
        temperature: number;
        prompt: string;
        imageDetail?: string;
        verbosity?: string;
    };
}

/**
 * Model configuration for OCR Arena
 * Ordered by quality for coding tasks: Anthropic > Gemini > GPT > Others
 */
interface ModelConfig {
    id: string;
    reasoning: 'high' | 'medium' | 'none';
    imageDetail?: 'auto' | 'high' | 'low';
    verbosity?: 'high' | 'medium' | 'low';
}

/**
 * Model ID mapping for OCR Arena
 * Models ordered from best to worst for coding tasks
 */
const MODEL_CONFIG_MAP: Record<string, ModelConfig> = {
    // ═══════════════════════════════════════════════════════
    // Anthropic Models (Best for code)
    // ═══════════════════════════════════════════════════════
    'claude-opus-4-6': {
        id: '4fa4c408-bc59-4474-8d7d-9477197e2464',
        reasoning: 'high',
        verbosity: 'high',
    },
    'claude-opus-4-5': {
        id: '8fe3fe3d-4383-464e-a34d-ce203bce2cc1',
        reasoning: 'high',
        verbosity: 'high',
    },
    'claude-sonnet-4-5': {
        id: 'b9b87dc3-f71b-4fb1-a3d7-d964bee84426',
        reasoning: 'high',
        verbosity: 'high',
    },

    // ═══════════════════════════════════════════════════════
    // Gemini Models
    // ═══════════════════════════════════════════════════════
    'gemini-3-pro-preview': {
        id: 'b4aa4e4c-47fa-4bf8-8401-7b09135c73ff',
        reasoning: 'high',
        imageDetail: 'auto',
        verbosity: 'high',
    },
    'gemini-2.5-pro': {
        id: 'de4f0d30-5958-40a9-a8b5-554e8fa60851',
        reasoning: 'high',
        imageDetail: 'auto',
        verbosity: 'high',
    },
    'gemini-2.5-flash': {
        id: 'e9d2c517-39cb-4745-8b49-442c9fc0436f',
        reasoning: 'medium',
        imageDetail: 'auto',
        verbosity: 'medium',
    },
    'gemini-3-flash': {
        id: '40c6c841-f041-49fc-b77b-635d361d8e68',
        reasoning: 'medium',
        imageDetail: 'auto',
        verbosity: 'medium',
    },

    // ═══════════════════════════════════════════════════════
    // GPT Models
    // ═══════════════════════════════════════════════════════
    'gpt-5.2-medium': {
        id: 'c7bd3454-975a-4054-aeb3-dd8c7b2cc6a4',
        reasoning: 'medium',
        verbosity: 'high',
    },
    'gpt-5.2': {
        id: 'c7bd3454-975a-4054-aeb3-dd8c7b2cc6a4',
        reasoning: 'medium',
        verbosity: 'high',
    },
    'gpt-5.1': {
        id: '1dab83e3-add6-41c8-aab9-1cbfa9b16312',
        reasoning: 'medium',
        verbosity: 'high',
    },
    'gpt-5': {
        id: '5b3d5828-fc03-4e82-a10c-28c4416f1dbd',
        reasoning: 'medium',
        verbosity: 'high',
    },

    // ═══════════════════════════════════════════════════════
    // Other Models (OCR-focused, less ideal for code)
    // ═══════════════════════════════════════════════════════
    'qwen3-vl-235b': {
        id: '171afc89-53ff-43cf-a928-b77c9bbe3f3f',
        reasoning: 'medium',
        imageDetail: 'auto',
    },
    'qwen3-vl-8b': {
        id: '63c2acdf-5d77-48af-a8db-d57d0c6c5b2a',
        reasoning: 'medium',
        imageDetail: 'auto',
    },
    'deepseek-ocr': {
        id: '0f4262e8-6b45-4393-ad2a-d5885fd02282',
        reasoning: 'medium',
    },
    'glm-ocr': {
        id: '0ff94598-c725-40eb-a88c-7917eaf3a4d9',
        reasoning: 'medium',
    },
    'iris': {
        id: '6146d953-354a-4430-84a4-1f667ecfa5a8',
        reasoning: 'medium',
    },
    'mistral-ocr-v3': {
        id: '15c23e32-256f-405d-b801-21a6ecb9d5b5',
        reasoning: 'medium',
    },
    'olmocr-2': {
        id: '2c6269cc-c1ff-48c0-9f2b-861d72aabd71',
        reasoning: 'medium',
    },
    'dots-ocr': {
        id: '783714e7-2989-4a22-ad58-ac90d6c7c42c',
        reasoning: 'medium',
    },
    'nanonets2-3b': {
        id: '2721cd0e-fa9a-4418-84c9-a0ad0043f24c',
        reasoning: 'medium',
    },
    'nemotron-parse': {
        id: 'c8d4e5f6-7890-4abc-8ef1-234567890abc',
        reasoning: 'medium',
    },
};

/**
 * Extract image URLs from Anthropic message content
 */
function extractImageUrls(anthropicRequest: AnthropicMessagesRequest): string[] {
    const imageUrls: string[] = [];

    for (const message of anthropicRequest.messages) {
        if (Array.isArray(message.content)) {
            for (const block of message.content) {
                if (block.type === 'image' && block.source?.type === 'url' && block.source.url) {
                    imageUrls.push(block.source.url);
                } else if (block.type === 'image' && block.source?.type === 'base64' && block.source.data) {
                    // OCR Arena expects URLs, so we'd need to handle base64 differently
                    // For now, skip base64 images or convert them to data URLs
                    const dataUrl = `data:${block.source.media_type || 'image/png'};base64,${block.source.data}`;
                    imageUrls.push(dataUrl);
                }
            }
        }
    }

    return imageUrls;
}

/**
 * Format tool definitions in a clear, parseable format
 */
function formatToolDefinitions(tools: AnthropicMessagesRequest['tools']): string {
    if (!tools || tools.length === 0) return '';

    let toolsSection = '\n\n# TOOL CALLING INSTRUCTIONS\n\n';
    toolsSection += 'You have access to the following tools. To use a tool, respond with ONLY a JSON object in this exact format:\n\n';
    toolsSection += '{"type":"tool_use","id":"unique_id_here","name":"TOOL_NAME","input":{...parameters...}}\n\n';
    toolsSection += 'CRITICAL RULES:\n';
    toolsSection += '1. Output ONLY the JSON object, nothing else\n';
    toolsSection += '2. Generate a unique ID using a format like "toolu_01A2B3C4D5E6F7"\n';
    toolsSection += '3. Include all required parameters in the input object\n';
    toolsSection += '4. Do NOT add explanatory text before or after the JSON\n';
    toolsSection += '5. You can output multiple tool calls, one per line\n\n';
    toolsSection += '## Available Tools:\n\n';

    for (const tool of tools) {
        toolsSection += `### ${tool.name}\n`;
        toolsSection += `**Description:** ${tool.description}\n\n`;
        toolsSection += `**Input Schema:**\n\`\`\`json\n${JSON.stringify(tool.input_schema, null, 2)}\n\`\`\`\n\n`;
    }

    return toolsSection;
}

/**
 * Format a single content block for the conversation
 */
function formatContentBlock(block: AnthropicContentBlock): string {
    if (block.type === 'text') {
        return block.text || '';
    } else if (block.type === 'tool_use') {
        // Format tool use as JSON
        const toolCall = {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input || {}
        };
        return JSON.stringify(toolCall);
    } else if (block.type === 'tool_result') {
        // Format tool result
        const content = typeof block.content === 'string'
            ? block.content
            : (Array.isArray(block.content)
                ? block.content.map((c: any) => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n')
                : JSON.stringify(block.content));
        const isError = (block as any).is_error === true;
        return `<tool_result tool_use_id="${block.tool_use_id}" status="${isError ? 'error' : 'success'}">\n${content}\n</tool_result>`;
    }
    return '';
}

/**
 * Build the full conversation prompt with proper multi-turn support
 */
function buildPrompt(anthropicRequest: AnthropicMessagesRequest): string {
    let prompt = '';

    // Add system message if present
    if (anthropicRequest.system) {
        if (typeof anthropicRequest.system === 'string') {
            prompt += anthropicRequest.system;
        } else if (Array.isArray(anthropicRequest.system)) {
            for (const block of anthropicRequest.system) {
                if (block.type === 'text') {
                    prompt += block.text;
                }
            }
        }
    }

    // Add tool definitions if present (integrated into system prompt)
    if (anthropicRequest.tools && anthropicRequest.tools.length > 0) {
        prompt += formatToolDefinitions(anthropicRequest.tools);
    }

    prompt += '\n\n# CONVERSATION\n\n';

    // Build conversation history with proper role formatting
    for (let i = 0; i < anthropicRequest.messages.length; i++) {
        const message = anthropicRequest.messages[i];
        const role = message.role === 'user' ? 'Human' : 'Assistant';

        // Format message content
        let content = '';
        if (typeof message.content === 'string') {
            content = message.content;
        } else if (Array.isArray(message.content)) {
            // Handle multiple content blocks
            const parts: string[] = [];
            for (const block of message.content) {
                const formatted = formatContentBlock(block);
                if (formatted) {
                    parts.push(formatted);
                }
            }
            content = parts.join('\n\n');
        }

        if (content) {
            prompt += `${role}: ${content}\n\n`;
        }
    }

    // Add final Assistant prompt to encourage response
    prompt += 'Assistant:';

    return prompt;
}

/**
 * Get model configuration with fallback to claude-opus-4-6
 */
function getModelConfig(modelName: string): ModelConfig {
    // Try exact match
    if (MODEL_CONFIG_MAP[modelName]) {
        return MODEL_CONFIG_MAP[modelName];
    }

    // Try lowercase match
    const lowerModel = modelName.toLowerCase();
    if (MODEL_CONFIG_MAP[lowerModel]) {
        return MODEL_CONFIG_MAP[lowerModel];
    }

    // Try partial matches for common variations
    if (lowerModel.includes('opus') && lowerModel.includes('4.6')) {
        return MODEL_CONFIG_MAP['claude-opus-4-6'];
    }
    if (lowerModel.includes('opus') && lowerModel.includes('4-6')) {
        return MODEL_CONFIG_MAP['claude-opus-4-6'];
    }
    if (lowerModel.includes('opus')) {
        return MODEL_CONFIG_MAP['claude-opus-4-5'];
    }
    if (lowerModel.includes('sonnet')) {
        return MODEL_CONFIG_MAP['claude-sonnet-4-5'];
    }
    if (lowerModel.includes('gemini') && lowerModel.includes('pro')) {
        return MODEL_CONFIG_MAP['gemini-2.5-pro'];
    }
    if (lowerModel.includes('gemini') && lowerModel.includes('flash')) {
        return MODEL_CONFIG_MAP['gemini-2.5-flash'];
    }
    if (lowerModel.includes('gpt-5.2')) {
        return MODEL_CONFIG_MAP['gpt-5.2'];
    }
    if (lowerModel.includes('gpt')) {
        return MODEL_CONFIG_MAP['gpt-5'];
    }

    // Default to best model for code
    console.log(`[OCR Arena] Unknown model "${modelName}", defaulting to claude-opus-4-6`);
    return MODEL_CONFIG_MAP['claude-opus-4-6'];
}

/**
 * Transform Anthropic request to OCR Arena format
 */
export function transformAnthropicToOcrArena(
    anthropicRequest: AnthropicMessagesRequest
): OcrArenaRequest {
    const model = anthropicRequest.model || 'claude-opus-4-6';
    const config = getModelConfig(model);

    let imageUrls = extractImageUrls(anthropicRequest);
    const prompt = buildPrompt(anthropicRequest);

    // Map temperature (Anthropic uses 0-1, OCR Arena uses 0-1)
    const temperature = anthropicRequest.temperature ?? 0.1;

    // OCR Arena requires at least one image URL
    // If no images provided, use a placeholder transparent 1x1 pixel image
    if (imageUrls.length === 0) {
        imageUrls = ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='];
    }

    console.log(`[OCR Arena] Using model: ${model} → ${config.id} (reasoning: ${config.reasoning}${config.verbosity ? `, verbosity: ${config.verbosity}` : ''})`);

    const settings: OcrArenaRequest['settings'] = {
        reasoning: config.reasoning,
        temperature,
        prompt,
    };

    // Add optional settings if present
    if (config.imageDetail) {
        settings.imageDetail = config.imageDetail;
    }
    if (config.verbosity) {
        settings.verbosity = config.verbosity;
    }

    return {
        imageUrls,
        modelId: config.id,
        settings,
    };
}
