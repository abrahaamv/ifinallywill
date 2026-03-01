
/**
 * Transform Supabase Edge Function responses to Anthropic Messages API format
 * With proper tool_use block generation
 */

import { v4 as uuidv4 } from 'uuid';
import {
    AnthropicMessagesResponse,
    AnthropicContentBlock,
    MessageStartEvent,
    ContentBlockStartEvent,
    ContentBlockDeltaEvent,
    ContentBlockStopEvent,
    MessageDeltaEvent,
    MessageStopEvent,
} from '../types/index.js';

export interface SupabaseSSEChunk {
    content?: string;
    chunk?: string;
    text?: string;
    response?: string;
    delta?: {
        content?: string;
    };
}

export interface ParsedContent {
    blocks: AnthropicContentBlock[];
    hasToolUse: boolean;
}

/**
 * Manually parse TOOL_EX format when JSON parsing fails
 * Handles: { tool: write_file, input: { path: file.txt, content: <multiline> } }
 */
function parseToolExManually(content: string): any | null {
    // Look for the tool name
    const toolMatch = content.match(/tool\s*:\s*(\w+)/i);
    if (!toolMatch) return null;

    const toolName = toolMatch[1];

    // Extract the input object
    const inputMatch = content.match(/input\s*:\s*\{([\s\S]*)\}\s*\}?\s*$/i);
    if (!inputMatch) {
        // Maybe params are at top level, not nested in input
        const result: any = { tool: toolName };

        // Look for path/command directly
        const pathMatch = content.match(/path\s*:\s*([^,}\n]+)/i);
        const commandMatch = content.match(/command\s*:\s*([^,}\n]+)/i);

        if (pathMatch) result.path = pathMatch[1].trim().replace(/^["']|["']$/g, '');
        if (commandMatch) result.command = commandMatch[1].trim().replace(/^["']|["']$/g, '');

        // Look for content (everything after "content:" until the closing brace)
        const contentMatch = content.match(/content\s*:\s*([\s\S]*?)(?:\n\s*\}|$)/i);
        if (contentMatch) {
            let contentValue = contentMatch[1].trim();
            contentValue = contentValue.replace(/\}\s*\}?\s*$/, '').trim();
            contentValue = contentValue.replace(/^["']|["']$/g, '');
            result.content = contentValue;
        }

        if (Object.keys(result).length > 1) {
            console.log('[parseToolExManually] Extracted top-level params:', result);
            return result;
        }
        return null;
    }

    const inputContent = inputMatch[1];
    const input: any = {};

    // Parse path
    const pathMatch = inputContent.match(/path\s*:\s*([^,}\n]+)/i);
    if (pathMatch) {
        input.path = pathMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    // Parse command
    const commandMatch = inputContent.match(/command\s*:\s*([^,}\n]+)/i);
    if (commandMatch) {
        input.command = commandMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    // Parse content - find "content:" and take everything until the closing braces
    const contentIdx = inputContent.toLowerCase().indexOf('content');
    if (contentIdx !== -1) {
        const afterContent = inputContent.slice(contentIdx);
        const colonIdx = afterContent.indexOf(':');
        if (colonIdx !== -1) {
            let contentValue = afterContent.slice(colonIdx + 1).trim();
            contentValue = contentValue.replace(/\}\s*$/, '').trim();
            if ((contentValue.startsWith('"') && contentValue.endsWith('"')) ||
                (contentValue.startsWith("'") && contentValue.endsWith("'"))) {
                contentValue = contentValue.slice(1, -1);
            }
            input.content = contentValue;
        }
    }

    console.log('[parseToolExManually] Extracted:', { tool: toolName, input });
    return { tool: toolName, input };
}

/**
 * Sanitize a JSON string extracted from LLM output to handle common issues:
 * 1. Bad control characters (raw newlines/tabs inside string values)
 * 2. Invalid escape sequences (\a, \x, etc.)
 * 3. Structural issues (colon used as comma, missing id values, unquoted values)
 */
function sanitizeToolCallJson(jsonStr: string): string {
    // Phase 1: Fix control characters and escape sequences inside JSON string values
    // Walk through the string tracking whether we're inside a JSON string
    let result = '';
    let inStr = false;
    let i = 0;
    while (i < jsonStr.length) {
        const ch = jsonStr[i];

        if (ch === '\\' && inStr) {
            // Check next character for valid JSON escapes
            const next = jsonStr[i + 1];
            if (next && '"\\\/bfnrtu'.includes(next)) {
                // Valid JSON escape - keep as-is
                result += ch + next;
                i += 2;
                continue;
            } else if (next) {
                // Invalid escape like \a, \x, \' etc. - escape the backslash
                result += '\\\\' + next;
                i += 2;
                continue;
            }
        }

        if (ch === '"' && !inStr) {
            inStr = true;
            result += ch;
            i++;
            continue;
        }

        if (ch === '"' && inStr) {
            inStr = false;
            result += ch;
            i++;
            continue;
        }

        if (inStr) {
            // Replace raw control characters with their JSON escape sequences
            const code = ch.charCodeAt(0);
            if (code < 0x20) {
                if (ch === '\n') result += '\\n';
                else if (ch === '\r') result += '\\r';
                else if (ch === '\t') result += '\\t';
                else result += `\\u${code.toString(16).padStart(4, '0')}`;
                i++;
                continue;
            }
        }

        result += ch;
        i++;
    }

    // Phase 2: Fix structural issues using iterative JSON.parse with error-position repair
    result = repairJsonStructure(result);

    return result;
}

/**
 * Iteratively attempt JSON.parse, fixing structural issues at reported error positions.
 * Handles: colon-as-comma, missing id values, unquoted values, double-close braces.
 * Gives up after 8 repair attempts to avoid infinite loops.
 */
function repairJsonStructure(jsonStr: string): string {
    let current = jsonStr;
    const MAX_REPAIRS = 8;

    for (let attempt = 0; attempt < MAX_REPAIRS; attempt++) {
        try {
            JSON.parse(current);
            return current; // It parses! Return the fixed version
        } catch (e) {
            const msg = (e as Error).message;
            // Extract error position from "... at position NNN"
            const posMatch = msg.match(/at position (\d+)/);
            if (!posMatch) return current; // Can't determine position, give up

            const errPos = parseInt(posMatch[1], 10);
            if (errPos >= current.length) return current;

            const charAtErr = current[errPos];
            const before = current.slice(0, errPos);
            const after = current.slice(errPos);

            if (msg.includes("Expected ',' or '}'")) {
                // A : was used where , or } was expected (colon-as-separator)
                if (charAtErr === ':') {
                    const afterColon = after.slice(1); // skip the :

                    // Pattern 1: "id":"value":"ToolName" — : separates id value from tool name
                    const valueAfter = afterColon.match(/^\s*"([^"]+)"\s*[,}:]/);
                    if (valueAfter) {
                        const candidateVal = valueAfter[1];
                        if (candidateVal.length < 50 && !candidateVal.includes(' ') && !candidateVal.includes('/')) {
                            // Likely a tool name — insert "name": key
                            current = before + ',"name":' + afterColon;
                            continue;
                        }
                    }

                    // Pattern 2: "id":"value":{...} — model skipped "name" and "input" keys,
                    // went directly to the input object after the id
                    if (afterColon.trimStart().startsWith('{')) {
                        current = before + ',"input":' + afterColon;
                        continue;
                    }

                    // Default: just replace : with ,
                    current = before + ',' + after.slice(1);
                    continue;
                }
                // Fallback: find the nearest : before errPos
                const lastColon = before.lastIndexOf(':');
                if (lastColon > 0) {
                    current = current.slice(0, lastColon) + ',' + current.slice(lastColon + 1);
                    continue;
                }
            }

            if (msg.includes("Expected ':'")) {
                // Missing colon — likely a broken key. Skip this key by removing it.
                // Find the problematic "key" before errPos and remove it
                const keyMatch = before.match(/"[^"]*"\s*$/);
                if (keyMatch) {
                    const keyStart = before.length - keyMatch[0].length;
                    // Check if there's a comma before the key to remove
                    const preKey = current.slice(0, keyStart).trimEnd();
                    if (preKey.endsWith(',')) {
                        current = preKey.slice(0, -1) + current.slice(errPos);
                    } else {
                        current = preKey + current.slice(errPos);
                    }
                    continue;
                }
            }

            if (msg.includes('Unexpected token') && charAtErr === ',') {
                // Unexpected comma — often "id","name" where id has no value
                // Look back for the key and remove "key",
                const keyPattern = before.match(/,?\s*"[^"]*"\s*$/);
                if (keyPattern) {
                    current = current.slice(0, before.length - keyPattern[0].length) + after.slice(1);
                    continue;
                }
            }

            if (msg.includes('Unexpected token') && charAtErr === '}') {
                // Double closing brace — remove the extra one
                current = before + after.slice(1);
                continue;
            }

            // Unquoted values — find "key": and the unquoted value
            if (msg.includes('Unexpected token') && /[a-zA-Z]/.test(charAtErr)) {
                // Try to find the unquoted value span and quote it
                const valMatch = after.match(/^([a-zA-Z][\w\s.*/-]*?)(?=[,}\]])/);
                if (valMatch) {
                    current = before + '"' + valMatch[1].trim() + '"' + after.slice(valMatch[0].length);
                    continue;
                }
            }

            // If we couldn't fix this specific error, give up
            return current;
        }
    }

    return current;
}

/**
 * Last-resort regex extraction of tool call fields from badly malformed JSON.
 * Handles cases where JSON structure is too broken to repair, e.g.:
 * - "input/path/..." (merged key+value)
 * - Missing "input":{} wrapper
 * Returns a synthetic parsed object or null.
 */
function regexExtractToolCall(jsonStr: string): any | null {
    // Must contain "tool_use" to be a tool call
    if (!jsonStr.includes('tool_use')) return null;

    // Extract tool name - look for "name":"ToolName" or "name": "ToolName"
    const nameMatch = jsonStr.match(/"name"\s*:\s*"([^"]+)"/);
    let name = nameMatch ? nameMatch[1] : '';

    // Clean non-word characters from name (handles "Bash{" → "Bash", "Read_path" → "Read")
    if (name) {
        // Strip trailing non-alphanumeric chars (braces, punctuation merged from broken JSON)
        name = name.replace(/[^a-zA-Z0-9_]+$/, '');
        // Also strip common suffixes
        name = name.replace(/[_\s]+(path|command|tool|call|input|file|use)$/i, '');
    }

    // If name is missing, try to infer from input field signatures
    if (!name) {
        if (jsonStr.includes('"file_path"')) name = 'Read';
        else if (jsonStr.includes('"command"')) name = 'Bash';
        else if (jsonStr.includes('"script"')) name = 'Bash';
        else if (jsonStr.includes('"pattern"')) name = 'Glob';
        else if (jsonStr.includes('"query"')) name = 'WebSearch';
        else if (jsonStr.includes('"url"')) name = 'WebFetch';
        else if (jsonStr.includes('"old_string"')) name = 'Edit';
        else if (jsonStr.includes('"content"') && jsonStr.includes('"file_path"')) name = 'Write';
        else return null; // Can't determine tool name
        console.log(`[parseToolCalls] Inferred tool name "${name}" from input field signatures`);
    }

    // Extract id if present
    const idMatch = jsonStr.match(/"id"\s*:\s*"([^"]+)"/);
    const id = idMatch ? idMatch[1] : undefined;

    // Try to extract the input object
    let input: Record<string, unknown> = {};

    // Strategy 1: Find "input":{...} and parse the inner object
    const inputObjMatch = jsonStr.match(/"input"\s*:\s*(\{[\s\S]*\})\s*\}?\s*$/);
    if (inputObjMatch) {
        try {
            const sanitized = sanitizeToolCallJson(`{${inputObjMatch[1].replace(/\}\s*\}\s*$/, '}')}`)
                .replace(/^\{\{/, '{'); // remove double opening brace if introduced
            // Try to parse just the input part
            const innerStr = inputObjMatch[1].replace(/\}\s*$/, '');
            try {
                input = JSON.parse('{' + innerStr + '}');
            } catch {
                try {
                    input = JSON.parse(sanitized);
                } catch {
                    // Fall through to other strategies
                }
            }
        } catch {
            // Fall through
        }
    }

    // Strategy 2: Extract known field patterns for common tools
    if (Object.keys(input).length === 0) {
        // command field (Bash tool)
        const cmdMatch = jsonStr.match(/"command"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (cmdMatch) {
            input.command = cmdMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // script field (bash tool variant)
        const scriptMatch = jsonStr.match(/"script"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (scriptMatch) {
            input.script = scriptMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // description field
        const descMatch = jsonStr.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (descMatch) {
            input.description = descMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // path field (file operations)
        const pathMatch = jsonStr.match(/"path"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (pathMatch) {
            input.path = pathMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // file_path field
        const filePathMatch = jsonStr.match(/"file_path"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (filePathMatch) {
            input.file_path = filePathMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // content field
        const contentMatch = jsonStr.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (contentMatch) {
            input.content = contentMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // message field
        const msgMatch = jsonStr.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (msgMatch) {
            input.message = msgMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // Handle "input/path..." merged pattern — reconstruct as command
        if (Object.keys(input).length === 0) {
            const mergedInput = jsonStr.match(/"input([^"]*)"/)
            if (mergedInput && mergedInput[1].startsWith('/')) {
                // "input/some/path..." -> command is the path part
                const cmdVal = mergedInput[1];
                // Try to find the end of this value (next "," or "}")
                input.command = cmdVal;
            }
        }
    }

    return {
        type: 'tool_use',
        id: id,
        name: name,
        input: input,
    };
}

/**
 * Try to parse content as JSON, with fallback to JS-style object notation
 */
function parseJsonOrJsObject(content: string): any | null {
    // First try direct JSON parse
    try {
        return JSON.parse(content);
    } catch {
        // Try converting JS-style to JSON
    }

    // Try to fix common JS object notation issues
    let fixed = content;

    // 1. Add quotes to unquoted keys: `{tool:` -> `{"tool":`
    fixed = fixed.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    // 2. Remove trailing commas before } or ]
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    try {
        return JSON.parse(fixed);
    } catch {
        // Still failing - try more aggressive approach
    }

    // 3. Try to handle unquoted string values
    fixed = fixed.replace(/:\s*([a-zA-Z][\w.-]*\.\w+)/g, ': "$1"'); // Handle file paths
    fixed = fixed.replace(/:\s*([a-zA-Z][\w.-]*)(?=[,}\s])/g, (match, val) => {
        if (['true', 'false', 'null'].includes(val)) return match;
        return `: "${val}"`;
    });

    try {
        return JSON.parse(fixed);
    } catch {
        // Still failing
    }

    // 4. Handle multiline content values (like HTML) - manual extraction
    const manualParsed = parseToolExManually(content);
    if (manualParsed) {
        return manualParsed;
    }

    console.log('[parseJsonOrJsObject] Failed to parse, Content:', content.slice(0, 200));
    return null;
}

/**
 * Extract a complete JSON object from a string starting at the given index
 * Handles nested objects/arrays by counting braces/brackets
 */
function extractJsonObject(content: string, startIdx: number): string | null {
    if (content[startIdx] !== '{') return null;

    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIdx; i < content.length; i++) {
        const char = content[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\' && inString) {
            escaped = true;
            continue;
        }

        if (char === '"' && !escaped) {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;

        if (braceCount === 0 && bracketCount === 0) {
            return content.slice(startIdx, i + 1);
        }
    }

    return null;
}

/**
 * Parse alternative tool call formats like:
 * - [Tool Call: ToolName({"key":"value"})]
 * - [Tool Use: ToolName] {"key":"value"}
 * - [Previous Tool Call: ToolName(...)]
 * - <function_calls><invoke name="ToolName"><parameter name="key">value</parameter></invoke></function_calls>
 * Returns array of {name, input} or empty array
 */
function parseAlternativeToolFormats(content: string): Array<{ name: string; input: Record<string, unknown> }> {
    const tools: Array<{ name: string; input: Record<string, unknown> }> = [];

    // Pattern 1: [Tool Call: ToolName({"json":"here"})]
    const toolCallPattern = /\[(?:Previous\s+)?Tool\s+Call:\s*(\w+)\s*\(\s*(\{[\s\S]*?\})\s*\)\]/gi;
    let match;
    while ((match = toolCallPattern.exec(content)) !== null) {
        try {
            const parsed = JSON.parse(match[2]);
            tools.push({ name: match[1], input: parsed });
            console.log(`[parseToolCalls] Parsed alternative format [Tool Call: ${match[1]}]`);
        } catch (e) {
            console.log(`[parseToolCalls] Failed to parse Tool Call input:`, e);
        }
    }

    // Pattern 2: [Tool Use: ToolName] {"json":"here"} or [Tool Use: ToolName]\n{"json":"here"}
    const toolUsePattern = /\[Tool\s+Use:\s*(\w+)\]\s*(\{[\s\S]*?\})(?=\s*\[|$|\n\n)/gi;
    while ((match = toolUsePattern.exec(content)) !== null) {
        try {
            const parsed = JSON.parse(match[2]);
            tools.push({ name: match[1], input: parsed });
            console.log(`[parseToolCalls] Parsed alternative format [Tool Use: ${match[1]}]`);
        } catch (e) {
            console.log(`[parseToolCalls] Failed to parse Tool Use input:`, e);
        }
    }

    // Pattern 3: [TOOL_EX] or TOOL_EX format used by BOOTLOADER
    // Format: [TOOL_EX]\n{"tool": "...", "input": {...}} (with or without code blocks)
    // Also handles: TOOL_EX without brackets, and JS-style unquoted keys
    // Uses extractJsonObject to properly handle nested braces

    // Find all [TOOL_EX] or TOOL_EX markers and extract JSON using brace counting
    const toolExMarker = /(?:\[TOOL_EX\]|\bTOOL_EX\b)\s*(?:```(?:json)?\s*)?/gi;
    while ((match = toolExMarker.exec(content)) !== null) {
        // Find the start of the JSON object after the marker
        const afterMarker = content.slice(match.index + match[0].length);
        const jsonStart = afterMarker.search(/\{/);
        if (jsonStart === -1) continue;

        // Extract complete JSON object using brace counting
        const jsonStr = extractJsonObject(afterMarker, jsonStart);
        if (!jsonStr) {
            console.log('[parseToolCalls] [TOOL_EX] found but could not extract complete JSON');
            continue;
        }

        try {
            const parsed = parseJsonOrJsObject(jsonStr);
            if (!parsed) {
                console.log('[parseToolCalls] [TOOL_EX] parseJsonOrJsObject returned null');
                continue;
            }
            const toolName = parsed.tool;

            // Params are directly on the object, not in .input
            // Map BOOTLOADER tool names to Claude Code tool names
            let claudeToolName = toolName;
            let claudeInput: Record<string, unknown> = {};

            if (toolName === 'bash') {
                claudeToolName = 'Bash';
                // Handle both flat and nested input structures
                const inputObj = typeof parsed.input === 'object' ? parsed.input : {};
                const cmd = parsed.command || inputObj.command || '';
                claudeInput = { command: cmd, description: `Execute: ${(cmd || '').slice(0, 50) || 'command'}` };
            } else if (toolName === 'read_file') {
                claudeToolName = 'Read';
                const inputObj = typeof parsed.input === 'object' ? parsed.input : {};
                const path = parsed.path || inputObj.path || '';
                // Use both filePath (OpenAI/OpenCode) and file_path (Anthropic) for compatibility
                claudeInput = { filePath: path, file_path: path };
            } else if (toolName === 'write_file') {
                claudeToolName = 'Write';
                const inputObj = typeof parsed.input === 'object' ? parsed.input : {};
                const path = parsed.path || inputObj.path || '';
                const content = parsed.content || inputObj.content || '';
                // Use both filePath (OpenAI/OpenCode) and file_path (Anthropic) for compatibility
                claudeInput = { filePath: path, file_path: path, content: content };
            } else if (toolName === 'list_dir') {
                claudeToolName = 'Bash';
                const inputObj = typeof parsed.input === 'object' ? parsed.input : {};
                const dirPath = parsed.path || inputObj.path || '.';
                claudeInput = { command: `ls -la ${dirPath}`, description: `List directory: ${dirPath}` };
            } else if (toolName === 'search') {
                claudeToolName = 'Grep';
                const inputObj = typeof parsed.input === 'object' ? parsed.input : {};
                claudeInput = { pattern: parsed.query || inputObj.query || '', path: parsed.path || inputObj.path || '.' };
            }

            tools.push({ name: claudeToolName, input: claudeInput });
            console.log(`[parseToolCalls] Parsed [TOOL_EX] format: ${toolName} -> ${claudeToolName}`, claudeInput);
        } catch (e) {
            console.log(`[parseToolCalls] Failed to parse [TOOL_EX] block:`, e, 'JSON:', jsonStr.slice(0, 200));
        }
    }

    // Pattern 4: tldraw native format: {"tool": "name", "params": {...}}
    // Also handle markdown code blocks: ```tool_call\n{...}\n```
    let tldrawContent = content;
    // Remove ```tool_call ... ``` wrapping
    tldrawContent = tldrawContent.replace(/```tool_call\s*\n?([\s\S]*?)\n?```/gi, '$1');

    const tldrawPattern = /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"params"\s*:\s*(\{[\s\S]*?\})\s*\}/gi;
    while ((match = tldrawPattern.exec(tldrawContent)) !== null) {
        try {
            const tldrawToolName = match[1];
            const params = JSON.parse(match[2]);

            // Map tldraw tool names to Claude Code tool names
            let claudeToolName = tldrawToolName;
            let input = params;

            if (tldrawToolName === 'filesystem_read') {
                if (params.operation === 'list_directory') {
                    claudeToolName = 'Bash';
                    const dirPath = params.path || '/';
                    input = { command: `ls -la ${dirPath}`, description: `List directory: ${dirPath}` };
                } else {
                    claudeToolName = 'Read';
                    // Use both filePath and file_path for compatibility
                    input = { filePath: params.path || '/', file_path: params.path || '/' };
                }
            } else if (tldrawToolName === 'filesystem_write') {
                claudeToolName = 'Write';
                // Use both filePath and file_path for compatibility
                input = { filePath: params.path, file_path: params.path, content: params.content };
            } else if (tldrawToolName === 'bash' || tldrawToolName === 'execute_command') {
                claudeToolName = 'Bash';
                input = { command: params.command, description: `Execute: ${(params.command || '').slice(0, 50) || 'command'}` };
            }

            tools.push({ name: claudeToolName, input });
            console.log(`[parseToolCalls] Parsed tldraw format: ${tldrawToolName} -> ${claudeToolName}`);
        } catch (e) {
            console.log(`[parseToolCalls] Failed to parse tldraw tool input:`, e);
        }
    }

    // Pattern 5: <tool_use id="..." name="ToolName">JSON_INPUT</tool_use>
    // Also handles UNCLOSED <tool_use ...> tags (model often omits closing tag for large content)
    // Attributes can appear in ANY order: id before name, name before id, or id missing entirely.

    // Helper: repair truncated/malformed key names and key-value merging in tool input JSON
    function repairInputKeys(jsonStr: string): string {
        let result = jsonStr;

        // Fix truncated key names: "_path" → "file_path", "_string" → "old_string", etc.
        const keyFixes: Record<string, string> = {
            '"_path"': '"file_path"',
            '"path"': '"file_path"',    // common shortening
            '"_file_path"': '"file_path"',
            '"_string"': '"old_string"',
            '"_content"': '"content"',
            '"_command"': '"command"',
            '"cmd"': '"command"',
            '"desc"': '"description"',
        };
        for (const [bad, good] of Object.entries(keyFixes)) {
            // Only replace if it looks like a key (followed by :)
            const keyPattern = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:', 'g');
            result = result.replace(keyPattern, good + ':');
        }

        // Fix key-contains-space: "command -r 'foo' /bar","description":"..."
        // The key has the value merged into it. Split on first space.
        // Pattern: {"key_with_spaces...","next_key":  → {"key":"value_part","next_key":
        result = result.replace(/"(\w+)\s+([^"]+)"\s*(?:,|}\s*$)/g, (match, key, rest) => {
            // "command grep -r foo","description": → "command":"grep -r foo","description":
            const trailingComma = match.endsWith(',');
            return `"${key}":"${rest}"${trailingComma ? ',' : '}'}`;
        });

        // Fix key starting with space/path: {" /home/... -type d","desc":"..."}
        // The model dropped the key name ("command") and put the value as the key.
        // Detect: key starts with space or / → wrap as "command":"<value>"
        result = result.replace(/\{\s*"(\s*\/[^"]+)"\s*(?:,|}\s*$)/g, (match, pathKey) => {
            const trailingComma = match.trimEnd().endsWith(',');
            return `{"command":"${pathKey.trim()}"${trailingComma ? ',' : '}'}`;
        });

        // Also handle key starting with common command prefixes: "grep ...", "cat ...", "ls ...", etc.
        result = result.replace(/\{\s*"((?:grep|find|cat|ls|echo|cd|mkdir|rm|cp|mv|head|tail|wc|sed|awk|curl|git|npm|node|python|bash|sh)\s+[^"]+)"\s*(?:,|}\s*$)/gi, (match, cmdKey) => {
            const trailingComma = match.trimEnd().endsWith(',');
            return `{"command":"${cmdKey}"${trailingComma ? ',' : '}'}`;
        });

        return result;
    }

    // Helper to extract input from <tool_use> inner content
    function extractToolUseInput(innerContent: string): Record<string, unknown> {
        let input: Record<string, unknown> = {};
        const trimmed = innerContent.trim();
        if (!trimmed) return input;

        // Try to parse as JSON directly
        try {
            input = JSON.parse(trimmed);
            return normalizeInputKeys(input);
        } catch {
            // Fall through
        }

        // Try key repair + sanitizing (fixes truncated keys, control chars, escape sequences)
        try {
            const repaired = repairInputKeys(trimmed);
            const sanitized = sanitizeToolCallJson(repaired);
            input = JSON.parse(sanitized);
            return normalizeInputKeys(input);
        } catch {
            // Fall through
        }

        // Try brace extraction (handles content with trailing text after JSON)
        const jsonStart = trimmed.indexOf('{');
        if (jsonStart !== -1) {
            const jsonStr = extractJsonObject(trimmed, jsonStart);
            if (jsonStr) {
                try {
                    input = JSON.parse(jsonStr);
                    return normalizeInputKeys(input);
                } catch {
                    // Try key repair + sanitizing the extracted JSON
                    try {
                        const repaired = repairInputKeys(jsonStr);
                        const sanitized = sanitizeToolCallJson(repaired);
                        input = JSON.parse(sanitized);
                        return normalizeInputKeys(input);
                    } catch {
                        const parsed = parseJsonOrJsObject(jsonStr);
                        if (parsed) return normalizeInputKeys(parsed);
                    }
                }
            }
        }

        // Last resort: regex extraction of individual fields
        // Handles cases where embedded JSON/heredoc in content breaks the outer JSON parse
        const regexInput: Record<string, unknown> = {};
        // Extract file_path
        const fpMatch = trimmed.match(/"file_path"\s*:\s*"([^"]+)"/);
        if (fpMatch) regexInput.file_path = fpMatch[1];
        // Extract command
        const cmdMatch = trimmed.match(/"command"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (cmdMatch) regexInput.command = cmdMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        // Extract content: grab everything between "content":"  and the last "} or "\n}
        if (!regexInput.command && trimmed.includes('"content"')) {
            const contentStart = trimmed.indexOf('"content"');
            const colonAfter = trimmed.indexOf(':', contentStart + 9);
            if (colonAfter !== -1) {
                // Find the opening quote of the content value
                const quoteStart = trimmed.indexOf('"', colonAfter + 1);
                if (quoteStart !== -1) {
                    // Content value goes until the last closing pattern "}  or "\n}
                    // Take everything between the quotes, handling the fact that the content is mangled
                    const afterQuote = trimmed.slice(quoteStart + 1);
                    // Find the last "} which closes the outer JSON
                    const lastClose = afterQuote.lastIndexOf('"}');
                    if (lastClose !== -1) {
                        const raw = afterQuote.slice(0, lastClose);
                        regexInput.content = raw.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                    }
                }
            }
        }
        // Extract script (MUX tool field, similar to command)
        if (!regexInput.command) {
            const scriptMatch = trimmed.match(/"script"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (scriptMatch) regexInput.script = scriptMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        }
        // Extract timeout_secs
        const timeoutMatch = trimmed.match(/"timeout_secs"\s*:\s*(\d+)/);
        if (timeoutMatch) regexInput.timeout_secs = parseInt(timeoutMatch[1], 10);
        // Extract run_in_background
        const bgMatch = trimmed.match(/"run_in_background"\s*:\s*(true|false)/);
        if (bgMatch) regexInput.run_in_background = bgMatch[1] === 'true';
        // Extract display_name
        const dnMatch = trimmed.match(/"display_name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (dnMatch) regexInput.display_name = dnMatch[1];
        // Extract pattern, old_string, new_string
        const patMatch = trimmed.match(/"pattern"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (patMatch) regexInput.pattern = patMatch[1];
        const oldMatch = trimmed.match(/"old_string"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (oldMatch) regexInput.old_string = oldMatch[1];
        // Extract new_string
        const newMatch = trimmed.match(/"new_string"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (newMatch) regexInput.new_string = newMatch[1];
        // Extract todos (array field — try to grab the full array)
        if (trimmed.includes('"todos"')) {
            const todosStart = trimmed.indexOf('"todos"');
            const bracketStart = trimmed.indexOf('[', todosStart);
            if (bracketStart !== -1) {
                // Find matching closing bracket
                let depth = 0;
                let bracketEnd = -1;
                for (let i = bracketStart; i < trimmed.length; i++) {
                    if (trimmed[i] === '[') depth++;
                    else if (trimmed[i] === ']') { depth--; if (depth === 0) { bracketEnd = i; break; } }
                }
                if (bracketEnd !== -1) {
                    try {
                        regexInput.todos = JSON.parse(trimmed.slice(bracketStart, bracketEnd + 1));
                    } catch {
                        // Can't parse todos array, skip
                    }
                }
            }
        }

        if (Object.keys(regexInput).length > 0) {
            return normalizeInputKeys(regexInput);
        }

        return input;
    }

    // Normalize parsed input keys (fix truncated key names in already-parsed objects)
    function normalizeInputKeys(input: Record<string, unknown>): Record<string, unknown> {
        const result = { ...input };

        // "_path" or "path" → "file_path" (if "file_path" doesn't already exist)
        if (!result.file_path) {
            if (result._path) { result.file_path = result._path; delete result._path; }
            else if (result.path && typeof result.path === 'string' && result.path.startsWith('/')) {
                result.file_path = result.path; delete result.path;
            }
        }

        // "_command" or "cmd" → "command"
        if (!result.command) {
            if (result._command) { result.command = result._command; delete result._command; }
            else if (result.cmd) { result.command = result.cmd; delete result.cmd; }
        }

        return result;
    }

    // Helper: infer tool name from input fields when name is empty or malformed
    function inferToolNameFromInput(input: Record<string, unknown>): string {
        if (input.file_path && !input.old_string && !input.content) return 'Read';
        if (input.command) return 'Bash';
        if (input.script) return 'Bash';
        if (input.pattern) return 'Glob';
        if (input.query) return 'WebSearch';
        if (input.url) return 'WebFetch';
        if (input.old_string) return 'Edit';
        if (input.content && input.file_path) return 'Write';
        return '';
    }

    // Helper: normalize tool name (strip trailing _path, _tool, etc.)
    function normalizeXmlToolName(name: string): string {
        // First: trim whitespace/newlines and strip anything from the first non-word char
        // e.g., "Write\n{" → "Write", "Bash{" → "Bash", "Read\n" → "Read"
        let cleaned = name.trim().split(/[^a-zA-Z0-9_]/)[0];
        // Strip common suffixes the model appends: Read_path -> Read, Bash_command -> Bash
        cleaned = cleaned.replace(/[_\s]+(path|command|tool|call|input|file|use)$/i, '');
        return cleaned;
    }

    // First try closed tags: <tool_use ...>...</tool_use>
    const toolUseXmlPattern = /<tool_use\s+([^>]*?)>([\s\S]*?)<\/tool_use>/gi;
    const closedTagPositions = new Set<number>();
    while ((match = toolUseXmlPattern.exec(content)) !== null) {
        closedTagPositions.add(match.index);
        const attrs = match[1];
        const innerContent = match[2].trim();
        const nameMatch = attrs.match(/name="([^"]*)"/);
        const idMatch = attrs.match(/id="([^"]*)"/);
        if (!nameMatch) continue;
        const toolId = idMatch ? idMatch[1] : '';
        let toolName = normalizeXmlToolName(nameMatch[1]);

        const input = extractToolUseInput(innerContent);

        // Infer name if empty
        if (!toolName) {
            toolName = inferToolNameFromInput(input);
            if (toolName) {
                console.log(`[parseToolCalls] Inferred XML tool name "${toolName}" from input fields`);
            } else {
                continue; // Can't determine tool name, skip
            }
        }

        tools.push({ name: toolName, input });
        console.log(`[parseToolCalls] Parsed <tool_use> XML (closed): ${toolName} (id: ${toolId})`);
    }

    // Then handle UNCLOSED tags: <tool_use ...>{JSON...} (no </tool_use>)
    // This catches cases where the model outputs a huge JSON body and never closes the tag
    const unclosedToolUsePattern = /<tool_use\s+([^>]*?)>/gi;
    while ((match = unclosedToolUsePattern.exec(content)) !== null) {
        // Skip if this position was already handled by the closed-tag pattern
        if (closedTagPositions.has(match.index)) continue;

        const attrs = match[1];
        const nameMatch = attrs.match(/name="([^"]*)"/);
        const idMatch = attrs.match(/id="([^"]*)"/);
        if (!nameMatch) continue;
        const toolId = idMatch ? idMatch[1] : '';
        let toolName = normalizeXmlToolName(nameMatch[1]);

        // Everything after the opening tag is the body
        const afterTag = content.slice(match.index + match[0].length);
        const input = extractToolUseInput(afterTag);

        // Infer name if empty
        if (!toolName) {
            toolName = inferToolNameFromInput(input);
            if (toolName) {
                console.log(`[parseToolCalls] Inferred XML tool name "${toolName}" from input fields`);
            }
        }

        if (toolName && Object.keys(input).length > 0) {
            tools.push({ name: toolName, input });
            console.log(`[parseToolCalls] Parsed <tool_use> XML (unclosed): ${toolName} (id: ${toolId})`);
        }
    }

    // Pattern 5b: Broken/truncated <tool_use> opening tags
    // e.g., <tool_use id="toolu_spec\n{"command":"ls ..."}\n</tool_use>
    // The opening tag is malformed (missing name attr, missing closing '>'), but
    // there's still JSON content and possibly a </tool_use> closing tag.
    const brokenToolUsePattern = /<tool_use\s+(?:id="[^"]*)?[\s\n]([\s\S]*?)(?:<\/tool_use>|(?=<tool_use|$))/gi;
    while ((match = brokenToolUsePattern.exec(content)) !== null) {
        // Skip positions already handled
        if (closedTagPositions.has(match.index)) continue;
        // Check if this position was already handled by unclosed pattern
        let alreadyHandled = false;
        for (const pos of closedTagPositions) {
            if (Math.abs(pos - match.index) < 5) { alreadyHandled = true; break; }
        }
        if (alreadyHandled) continue;

        const body = match[1].trim();
        if (!body || !body.includes('{')) continue;

        const input = extractToolUseInput(body);
        if (Object.keys(input).length === 0) continue;

        const toolName = inferToolNameFromInput(input);
        if (toolName) {
            // Check we haven't already added this exact tool call
            const isDuplicate = tools.some(t =>
                t.name === toolName && JSON.stringify(t.input) === JSON.stringify(input)
            );
            if (!isDuplicate) {
                tools.push({ name: toolName, input });
                console.log(`[parseToolCalls] Recovered broken <tool_use> tag: ${toolName}`);
            }
        }
    }

    // Pattern 6: XML-based <function_calls><invoke name="ToolName"><parameter name="key">value</parameter></invoke></function_calls>
    const xmlInvokePattern = /<invoke\s+name="(\w+)">([\s\S]*?)<\/invoke>/gi;
    while ((match = xmlInvokePattern.exec(content)) !== null) {
        const toolName = match[1];
        const paramsContent = match[2];
        const input: Record<string, unknown> = {};

        // Parse <parameter name="key">value</parameter> pairs
        const paramPattern = /<parameter\s+name="([^"]+)">([\s\S]*?)<\/parameter>/gi;
        let paramMatch;
        while ((paramMatch = paramPattern.exec(paramsContent)) !== null) {
            const paramName = paramMatch[1];
            let paramValue: unknown = paramMatch[2];

            // Try to parse as JSON if it looks like JSON
            if (typeof paramValue === 'string') {
                const trimmed = paramValue.trim();
                if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                    (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                    try {
                        paramValue = JSON.parse(trimmed);
                    } catch {
                        // Keep as string
                    }
                } else if (trimmed === 'true') {
                    paramValue = true;
                } else if (trimmed === 'false') {
                    paramValue = false;
                } else if (!isNaN(Number(trimmed)) && trimmed !== '') {
                    paramValue = Number(trimmed);
                }
            }

            input[paramName] = paramValue;
        }

        tools.push({ name: toolName, input });
        console.log(`[parseToolCalls] Parsed XML format <invoke name="${toolName}">`);
    }

    return tools;
}

/**
 * Parse tool calls from model output
 * Looks for: {"type":"tool_use","name":"...","input":{...}}
 * Also handles:
 * - Tool calls wrapped in markdown code blocks
 * - Tool calls with extra whitespace/newlines
 * - Tool calls on their own line
 * - Multiple tool calls in one response
 * - Alternative formats: [Tool Call: Name(...)], [Tool Use: Name] {...}
 */
/**
 * Match a tool name against the requested tools list.
 * Tries exact match first, then prefix match (for truncated names like "todo_" → "todo_write").
 * Returns the matched name or null.
 */
function matchToolName(name: string, requestedToolNames: string[], input?: Record<string, unknown>): string | null {
    const nameLower = name.toLowerCase();
    // Exact match (case-insensitive)
    const exact = requestedToolNames.find(n => n.toLowerCase() === nameLower);
    if (exact) return exact;

    // Prefix match: if the name is a prefix of exactly one requested tool, use it
    if (nameLower.length >= 3) {
        const prefixMatches = requestedToolNames.filter(n => n.toLowerCase().startsWith(nameLower));
        if (prefixMatches.length === 1) {
            return prefixMatches[0];
        }
        // Multiple prefix matches — disambiguate using input fields
        if (prefixMatches.length > 1 && input) {
            const inputKeys = Object.keys(input);
            // "write" tools typically have content/todos/items to write
            if (inputKeys.some(k => ['todos', 'content', 'items', 'data'].includes(k))) {
                const writeMatch = prefixMatches.find(n => /write|set|create/i.test(n));
                if (writeMatch) return writeMatch;
            }
            // Otherwise prefer "read"/"get" variant
            const readMatch = prefixMatches.find(n => /read|get|list/i.test(n));
            if (readMatch) return readMatch;
        }
        // Fallback: first match
        if (prefixMatches.length > 1) {
            return prefixMatches[0];
        }
    }

    return null;
}

export function parseToolCalls(content: string, requestedToolNames?: string[]): ParsedContent {
    const blocks: AnthropicContentBlock[] = [];
    let hasToolUse = false;

    // First, strip markdown code blocks that wrap tool calls
    let processedContent = content;

    // Remove ```json ... ``` wrapping around tool_use objects
    processedContent = processedContent.replace(
        /```(?:json)?\s*\n?(\{[\s\S]*?"type"\s*:\s*"tool_use"[\s\S]*?\})\s*\n?```/gi,
        '$1'
    );

    // Also handle ``` without json specifier
    processedContent = processedContent.replace(
        /```\s*\n?(\{[\s\S]*?"type"\s*:\s*"tool_use"[\s\S]*?\})\s*\n?```/gi,
        '$1'
    );


    console.log('[parseToolCalls] Processing content length:', processedContent.length);
    console.log('[parseToolCalls] First 500 chars:', processedContent.slice(0, 500));

    // Find all potential tool_use JSON objects with various spacing patterns
    const patterns = [
        '{"type":"tool_use"',
        '{ "type": "tool_use"',
        '{"type": "tool_use"',
        '{ "type":"tool_use"',
        '{\n"type":"tool_use"',
        '{\n  "type": "tool_use"',
        '{\n    "type": "tool_use"',
        '{\r\n"type":"tool_use"',
        '{\n"type": "tool_use"',
        '{\n  "type":"tool_use"'
    ];
    const toolCallPositions: number[] = [];

    for (const pattern of patterns) {
        let idx = 0;
        while ((idx = processedContent.indexOf(pattern, idx)) !== -1) {
            if (!toolCallPositions.includes(idx)) {
                toolCallPositions.push(idx);
                console.log(`[parseToolCalls] Found pattern "${pattern.slice(0, 20)}..." at index ${idx}`);
            }
            idx += 1;
        }
    }

    // Also look for tool calls with "name" field that might have different ordering
    // e.g., {"name":"tool_name","type":"tool_use",...}
    const altPatterns = [
        '{"name":"',
        '{ "name": "'
    ];

    for (const pattern of altPatterns) {
        let idx = 0;
        while ((idx = processedContent.indexOf(pattern, idx)) !== -1) {
            // Check if this object contains "type":"tool_use"
            const jsonStr = extractJsonObject(processedContent, idx);
            if (jsonStr && jsonStr.includes('"tool_use"')) {
                if (!toolCallPositions.includes(idx)) {
                    toolCallPositions.push(idx);
                    console.log(`[parseToolCalls] Found alt pattern at index ${idx}`);
                }
            }
            idx += 1;
        }
    }

    toolCallPositions.sort((a, b) => a - b);
    console.log(`[parseToolCalls] Found ${toolCallPositions.length} potential tool call positions`);

    let lastIndex = 0;

    for (const startIdx of toolCallPositions) {
        if (startIdx < lastIndex) continue;

        const textBefore = processedContent.slice(lastIndex, startIdx).trim();
        if (textBefore) {
            // Clean up any remaining markdown artifacts
            const cleanText = textBefore
                .replace(/```(?:json)?\s*$/g, '')
                .replace(/^\s*```\s*/g, '')
                .trim();
            if (cleanText) {
                blocks.push({ type: 'text', text: cleanText });
            }
        }

        const jsonStr = extractJsonObject(processedContent, startIdx);

        if (jsonStr) {
            let parsed: any = null;
            try {
                parsed = JSON.parse(jsonStr);
            } catch (e) {
                // Try sanitizing the JSON before giving up
                try {
                    const sanitized = sanitizeToolCallJson(jsonStr);
                    parsed = JSON.parse(sanitized);
                    console.log(`[parseToolCalls] Recovered tool call at ${startIdx} after sanitization`);
                } catch (e2) {
                    // Last resort: regex extraction of tool call fields
                    parsed = regexExtractToolCall(jsonStr);
                    if (parsed) {
                        console.log(`[parseToolCalls] Recovered tool call at ${startIdx} via regex extraction`);
                    } else {
                        console.log(`[parseToolCalls] JSON parse failed at ${startIdx} (even after sanitization):`, (e as Error).message);
                    }
                }
            }

            // Normalize near-miss type values like "tool" or "tool_call" to "tool_use"
            if (parsed && !parsed.type && (parsed.name || parsed.input)) {
                parsed.type = 'tool_use';
            } else if (parsed && typeof parsed.type === 'string' &&
                       parsed.type !== 'tool_use' && /^tool/i.test(parsed.type)) {
                parsed.type = 'tool_use';
            }

            // Fix name containing a tool ID (e.g., "toolu_02DEF" as name instead of id)
            if (parsed && parsed.name && /^toolu_/i.test(parsed.name)) {
                // Move it to id if id is missing, and clear name so inference kicks in
                if (!parsed.id) {
                    parsed.id = parsed.name;
                }
                parsed.name = '';
                console.log(`[parseToolCalls] Fixed tool ID "${parsed.id}" found in name field`);
            }

            // Infer missing tool name from input field signatures
            if (parsed && parsed.type === 'tool_use' && !parsed.name && parsed.input) {
                const inp = parsed.input;
                if (inp.file_path && !inp.old_string && !inp.content) parsed.name = 'Read';
                else if (inp.command) parsed.name = 'Bash';
                else if (inp.script) parsed.name = 'Bash';
                else if (inp.pattern) parsed.name = 'Glob';
                else if (inp.query) parsed.name = 'WebSearch';
                else if (inp.url) parsed.name = 'WebFetch';
                else if (inp.old_string) parsed.name = 'Edit';
                else if (inp.content && inp.file_path) parsed.name = 'Write';
                if (parsed.name) {
                    console.log(`[parseToolCalls] Inferred missing tool name "${parsed.name}" from input fields`);
                }
            }

            if (parsed && parsed.type === 'tool_use' && parsed.name) {
                // Fix merged name+command: "Bash /home/..." -> name="Bash", input.command="/home/..."
                if (parsed.name.includes(' ') && requestedToolNames && requestedToolNames.length > 0) {
                    const spaceIdx = parsed.name.indexOf(' ');
                    const candidateName = parsed.name.slice(0, spaceIdx);
                    const candidateCmd = parsed.name.slice(spaceIdx + 1);
                    const nameMatch = requestedToolNames.find(n => n.toLowerCase() === candidateName.toLowerCase());
                    if (nameMatch) {
                        console.log(`[parseToolCalls] Fixed merged name+command: "${candidateName}" + command`);
                        parsed.name = nameMatch;
                        if (!parsed.input || Object.keys(parsed.input).length === 0) {
                            parsed.input = { command: candidateCmd };
                        }
                    } else {
                        // Check if the candidate is a shell command → map to Bash
                        const SHELL_COMMANDS = new Set([
                            'ls', 'cat', 'grep', 'find', 'echo', 'cd', 'mkdir', 'rm', 'cp', 'mv',
                            'head', 'tail', 'wc', 'sed', 'awk', 'curl', 'git', 'npm', 'node',
                            'python', 'python3', 'bash', 'sh', 'touch', 'chmod', 'chown', 'sort',
                            'uniq', 'tr', 'cut', 'diff', 'tar', 'zip', 'unzip', 'which', 'pwd',
                            'env', 'export', 'pip', 'yarn', 'pnpm', 'bun', 'cargo', 'go', 'make',
                            'cmake', 'docker', 'kubectl', 'ssh', 'scp', 'rsync', 'wget', 'apt',
                            'brew', 'dnf', 'yum', 'pacman', 'rg', 'fd', 'tree', 'du', 'df',
                        ]);
                        const bashTool = requestedToolNames.find(n => n.toLowerCase() === 'bash');
                        if (SHELL_COMMANDS.has(candidateName.toLowerCase()) && bashTool) {
                            const fullCommand = parsed.name; // original merged string is the full command
                            console.log(`[parseToolCalls] Mapped shell command "${candidateName}" to Bash tool`);
                            parsed.name = bashTool;
                            parsed.input = { command: fullCommand };
                        }
                    }
                }

                // Validate tool name against requested tools if provided (case-insensitive + prefix)
                if (requestedToolNames && requestedToolNames.length > 0) {
                    const match = matchToolName(parsed.name, requestedToolNames, parsed.input);
                    if (!match) {
                        console.log(`[parseToolCalls] Skipping unknown tool "${parsed.name}" (not in requested: ${requestedToolNames.join(', ')})`);
                        lastIndex = startIdx + 1;
                        continue;
                    }
                    if (match.toLowerCase() !== parsed.name.toLowerCase()) {
                        console.log(`[parseToolCalls] Prefix-matched "${parsed.name}" → "${match}"`);
                    }
                    // Normalize the name to match what the client sent
                    parsed.name = match;
                }
                hasToolUse = true;
                blocks.push({
                    type: 'tool_use',
                    id: parsed.id || `toolu_${uuidv4().replace(/-/g, '').slice(0, 24)}`,
                    name: parsed.name,
                    input: parsed.input || {},
                });
                lastIndex = startIdx + jsonStr.length;
                console.log(`[parseToolCalls] Successfully parsed tool: ${parsed.name}`);
                continue;
            }
        } else {
            // extractJsonObject returned null — braces don't balance (truncated JSON)
            // Try regex extraction on the substring from startIdx to the next tool call or end
            const nextToolIdx = toolCallPositions.find(p => p > startIdx);
            const endIdx = nextToolIdx ?? processedContent.length;
            const truncatedStr = processedContent.slice(startIdx, endIdx);

            if (truncatedStr.includes('"tool_use"') || truncatedStr.includes('tool_use')) {
                const parsed = regexExtractToolCall(truncatedStr);
                if (parsed) {
                    // Normalize type
                    if (!parsed.type) parsed.type = 'tool_use';

                    // Infer missing name
                    if (!parsed.name && parsed.input) {
                        const inp = parsed.input;
                        if (inp.file_path && !inp.old_string && !inp.content) parsed.name = 'Read';
                        else if (inp.command) parsed.name = 'Bash';
                        else if (inp.script) parsed.name = 'Bash';
                        else if (inp.pattern) parsed.name = 'Glob';
                    }

                    if (parsed.name) {
                        // Validate tool name
                        if (requestedToolNames && requestedToolNames.length > 0) {
                            const match = requestedToolNames.find(n => n.toLowerCase() === parsed.name.toLowerCase());
                            if (match) {
                                parsed.name = match;
                                hasToolUse = true;
                                blocks.push({
                                    type: 'tool_use',
                                    id: parsed.id || `toolu_${uuidv4().replace(/-/g, '').slice(0, 24)}`,
                                    name: parsed.name,
                                    input: parsed.input || {},
                                });
                                lastIndex = endIdx;
                                console.log(`[parseToolCalls] Recovered truncated tool call at ${startIdx} via regex: ${parsed.name}`);
                                continue;
                            }
                        } else {
                            hasToolUse = true;
                            blocks.push({
                                type: 'tool_use',
                                id: parsed.id || `toolu_${uuidv4().replace(/-/g, '').slice(0, 24)}`,
                                name: parsed.name,
                                input: parsed.input || {},
                            });
                            lastIndex = endIdx;
                            console.log(`[parseToolCalls] Recovered truncated tool call at ${startIdx} via regex: ${parsed.name}`);
                            continue;
                        }
                    }
                }
                console.log(`[parseToolCalls] Could not extract truncated tool call at ${startIdx}`);
            }
        }

        lastIndex = startIdx + 1;
    }

    const textAfter = processedContent.slice(lastIndex).trim();
    if (textAfter) {
        // Clean up any remaining markdown artifacts
        const cleanText = textAfter
            .replace(/^```\s*/g, '')
            .replace(/```\s*$/g, '')
            .trim();
        if (cleanText) {
            blocks.push({ type: 'text', text: cleanText });
        }
    }

    if (blocks.length === 0 && content.trim()) {
        blocks.push({ type: 'text', text: content.trim() });
    }

    // If no standard tool_use blocks found, try alternative formats
    if (!hasToolUse) {
        const altTools = parseAlternativeToolFormats(content);
        if (altTools.length > 0) {
            hasToolUse = true;

            // Remove existing text blocks and rebuild with proper tool blocks
            const textContent = blocks
                .filter(b => b.type === 'text')
                .map(b => (b as { type: 'text'; text: string }).text)
                .join('\n');

            blocks.length = 0; // Clear existing blocks

            // Add any text that isn't part of a tool call
            let cleanedText = textContent;
            // Remove all known tool call patterns from text
            cleanedText = cleanedText
                .replace(/\[(?:Previous\s+)?Tool\s+Call:\s*\w+\s*\(\s*\{[\s\S]*?\}\s*\)\]/gi, '')
                .replace(/\[Tool\s+Use:\s*\w+\]\s*\{[\s\S]*?\}(?=\s*\[|$|\n\n)/gi, '')
                .replace(/<tool_use\s+[^>]*>[\s\S]*?<\/tool_use>/gi, '')
                .replace(/<tool_use\s+[^>]*>[\s\S]*/gi, '') // unclosed <tool_use> tags
                .replace(/\[?TOOL_EX\]?\s*(?:```(?:json)?\s*)?[\s\S]*?(?:```\s*)?(?=\n\n|\[|<|$)/gi, '')
                .replace(/\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"params"\s*:\s*\{[\s\S]*?\}\s*\}/gi, '')
                .replace(/<invoke\s+name="[^"]+">[\s\S]*?<\/invoke>/gi, '')
                .trim();

            if (cleanedText) {
                blocks.push({ type: 'text', text: cleanedText });
            }

            // Add tool_use blocks (filter against requestedToolNames if provided)
            for (const tool of altTools) {
                if (requestedToolNames && requestedToolNames.length > 0) {
                    const match = matchToolName(tool.name, requestedToolNames, tool.input);
                    if (!match) {
                        console.log(`[parseToolCalls] Skipping alt tool "${tool.name}" (not in requested: ${requestedToolNames.join(', ')})`);
                        continue;
                    }
                    if (match.toLowerCase() !== tool.name.toLowerCase()) {
                        console.log(`[parseToolCalls] Prefix-matched alt tool "${tool.name}" → "${match}"`);
                    }
                    tool.name = match; // Normalize to client's casing
                }
                blocks.push({
                    type: 'tool_use',
                    id: `toolu_${uuidv4().replace(/-/g, '').slice(0, 24)}`,
                    name: tool.name,
                    input: tool.input,
                });
                console.log(`[parseToolCalls] Added alternative tool: ${tool.name}`);
            }
        }
    }

    // Last resort: detect bare tool input JSON without wrapper
    // The model sometimes outputs just {"key":"val",...} which is the tool's input
    // but missing {"type":"tool_use","name":"...","input":{...}} wrapper.
    // Heuristic: if no tool use found and the entire content is a single JSON object,
    // try to guess which tool it belongs to based on key signatures.
    if (!hasToolUse && requestedToolNames && requestedToolNames.length > 0) {
        const trimmed = content.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !parsed.type) {
                    const keys = Object.keys(parsed);
                    // Known tool input signatures (key sets that identify a tool)
                    const toolSignatures: Record<string, string[][]> = {
                        'Task': [['prompt'], ['description', 'prompt'], ['prompt', 'subagent_type']],
                        'Bash': [['command'], ['command', 'description']],
                        'Read': [['file_path'], ['filePath']],
                        'Write': [['file_path', 'content'], ['filePath', 'content']],
                        'Edit': [['file_path', 'old_string', 'new_string']],
                        'Grep': [['pattern']],
                        'Glob': [['pattern']],
                        'TodoWrite': [['todos']],
                        'LS': [['path']],
                    };

                    let matchedTool: string | null = null;
                    let bestScore = 0;

                    for (const [toolName, signatures] of Object.entries(toolSignatures)) {
                        // Check tool is in requestedToolNames (case-insensitive)
                        const requestedMatch = requestedToolNames.find(n => n.toLowerCase() === toolName.toLowerCase());
                        if (!requestedMatch) continue;

                        for (const sig of signatures) {
                            const matches = sig.filter(k => keys.includes(k)).length;
                            const score = matches / sig.length;
                            if (score >= 0.5 && matches > bestScore) {
                                bestScore = matches;
                                matchedTool = requestedMatch;
                            }
                        }
                    }

                    if (matchedTool) {
                        console.log(`[parseToolCalls] Detected bare tool input for "${matchedTool}" (keys: ${keys.join(', ')})`);
                        hasToolUse = true;
                        blocks.length = 0;
                        blocks.push({
                            type: 'tool_use',
                            id: `toolu_${uuidv4().replace(/-/g, '').slice(0, 24)}`,
                            name: matchedTool,
                            input: parsed,
                        });
                    }
                }
            } catch {
                // Not valid JSON, skip
            }
        }
    }

    console.log(`[parseToolCalls] Result: hasToolUse=${hasToolUse}, blocks=${blocks.length}`);
    return { blocks, hasToolUse };
}

/**
 * Parse thinking blocks and function_calls from content
 * Handles:
 * - <thinking>...</thinking> blocks
 * - <function_calls><invoke>...</invoke></function_calls> blocks
 */
export function parseThinkingBlocks(content: string): AnthropicContentBlock[] {
    const blocks: AnthropicContentBlock[] = [];

    // First, process <thinking> blocks
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi;
    let lastIndex = 0;
    let match;
    let processedContent = content;

    while ((match = thinkingRegex.exec(content)) !== null) {
        const textBefore = content.slice(lastIndex, match.index).trim();
        if (textBefore) {
            // Clean any function_calls from this text
            const cleanText = textBefore
                .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
                .trim();
            if (cleanText) {
                blocks.push({ type: 'text', text: cleanText });
            }
        }

        const thinkingContent = match[1].trim();
        if (thinkingContent) {
            blocks.push({
                type: 'thinking',
                thinking: thinkingContent,
                signature: `thinking_${uuidv4().slice(0, 8)}`
            });
        }

        lastIndex = match.index + match[0].length;
    }

    const textAfter = content.slice(lastIndex).trim();
    if (textAfter) {
        // Check for tool calls in the remaining text
        const toolResult = parseToolCalls(textAfter);

        if (toolResult.hasToolUse) {
            // Add tool use blocks, filtering out text that's just function_calls XML
            for (const block of toolResult.blocks) {
                if (block.type === 'text' && block.text) {
                    // Clean function_calls XML from text
                    const cleanText = block.text
                        .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
                        .trim();
                    if (cleanText) {
                        blocks.push({ type: 'text', text: cleanText });
                    }
                } else {
                    blocks.push(block);
                }
            }
        } else {
            // No tool use found, clean and add text
            const cleanText = textAfter
                .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
                .trim();
            if (cleanText) {
                blocks.push({ type: 'text', text: cleanText });
            }
        }
    }

    if (blocks.length === 0 && content.trim()) {
        // Last resort - clean everything and add as text
        const cleanText = content
            .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
            .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
            .trim();
        if (cleanText) {
            blocks.push({ type: 'text', text: cleanText });
        }
    }

    return blocks;
}

/**
 * Create message_start SSE event
 */
export function createMessageStartEvent(model: string): MessageStartEvent {
    return {
        type: 'message_start',
        message: {
            id: `msg_${uuidv4().replace(/-/g, '')}`,
            type: 'message',
            role: 'assistant',
            content: [],
            model,
            stop_reason: null,
            stop_sequence: null,
            usage: {
                input_tokens: 0,
                output_tokens: 0,
            },
        },
    };
}

/**
 * Create content_block_start SSE event
 */
export function createContentBlockStartEvent(
    index: number = 0,
    blockType: 'text' | 'thinking' | 'tool_use' = 'text',
    toolInfo?: { id: string; name: string }
): ContentBlockStartEvent {
    if (blockType === 'thinking') {
        return {
            type: 'content_block_start',
            index,
            content_block: {
                type: 'thinking',
                thinking: '',
            },
        };
    }

    if (blockType === 'tool_use' && toolInfo) {
        return {
            type: 'content_block_start',
            index,
            content_block: {
                type: 'tool_use',
                id: toolInfo.id,
                name: toolInfo.name,
                input: {},
            },
        };
    }

    return {
        type: 'content_block_start',
        index,
        content_block: {
            type: 'text',
            text: '',
        },
    };
}

/**
 * Create content_block_delta SSE event
 */
export function createContentBlockDeltaEvent(
    content: string,
    index: number = 0,
    deltaType: 'text_delta' | 'thinking_delta' | 'input_json_delta' = 'text_delta'
): ContentBlockDeltaEvent {
    if (deltaType === 'thinking_delta') {
        return {
            type: 'content_block_delta',
            index,
            delta: {
                type: 'thinking_delta',
                thinking: content,
            },
        };
    }

    if (deltaType === 'input_json_delta') {
        return {
            type: 'content_block_delta',
            index,
            delta: {
                type: 'input_json_delta',
                partial_json: content,
            },
        };
    }

    return {
        type: 'content_block_delta',
        index,
        delta: {
            type: 'text_delta',
            text: content,
        },
    };
}

/**
 * Create content_block_stop SSE event
 */
export function createContentBlockStopEvent(index: number = 0): ContentBlockStopEvent {
    return {
        type: 'content_block_stop',
        index,
    };
}

/**
 * Create message_delta SSE event
 */
export function createMessageDeltaEvent(
    outputTokens: number = 0,
    stopReason: 'end_turn' | 'tool_use' = 'end_turn'
): MessageDeltaEvent {
    return {
        type: 'message_delta',
        delta: {
            stop_reason: stopReason,
            stop_sequence: null,
        },
        usage: {
            output_tokens: outputTokens,
        },
    };
}

/**
 * Create message_stop SSE event
 */
export function createMessageStopEvent(): MessageStopEvent {
    return {
        type: 'message_stop',
    };
}

/**
 * Extract text content from Supabase SSE chunk
 */
export function extractChunkContent(chunk: SupabaseSSEChunk): string | null {
    return chunk.content ?? chunk.chunk ?? chunk.text ?? chunk.response ?? chunk.delta?.content ?? null;
}

/**
 * Format SSE event for transmission
 */
export function formatSSEEvent(eventType: string, data: unknown): string {
    return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create a non-streaming response
 */
export function createNonStreamingResponse(
    content: string,
    model: string,
    thinkingEnabled: boolean = false,
    requestedToolNames?: string[]
): AnthropicMessagesResponse {
    let blocks: AnthropicContentBlock[];
    let stopReason: 'end_turn' | 'tool_use' = 'end_turn';

    const toolResult = parseToolCalls(content, requestedToolNames);
    if (toolResult.hasToolUse) {
        blocks = toolResult.blocks;
        stopReason = 'tool_use';
    } else if (thinkingEnabled) {
        blocks = parseThinkingBlocks(content);
    } else {
        blocks = [{ type: 'text', text: content }];
    }

    return {
        id: `msg_${uuidv4().replace(/-/g, '')}`,
        type: 'message',
        role: 'assistant',
        content: blocks,
        model,
        stop_reason: stopReason,
        stop_sequence: null,
        usage: {
            input_tokens: 0,
            output_tokens: Math.ceil(content.length / 4),
        },
    };
}

/**
 * OpenAI-format tool call returned by parseToolCallsFromText
 */
export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

/**
 * Normalize tool call inputs to match expected schemas.
 * Models frequently output wrong field names (e.g. {text, state} instead of {id, content, status, priority}).
 * This fixes common mismatches so the client tool runner doesn't reject the call.
 */
function normalizeToolInput(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
    const name = toolName.toLowerCase();

    // Question tool: model often outputs {questions: [{text, options: [{label}]}} instead of {questions: [{question, header, options: [{description}]}}
    if (name === 'question' && Array.isArray(input.questions)) {
        input.questions = (input.questions as Record<string, unknown>[]).map((q) => {
            const normalized: Record<string, unknown> = {};
            // question: prefer question, fall back to text
            normalized.question = q.question ?? q.text ?? q.title ?? '';
            // header: use header or default to empty string
            normalized.header = q.header ?? '';
            // options: normalize options array
            if (Array.isArray(q.options)) {
                normalized.options = (q.options as Record<string, unknown>[]).map((opt) => {
                    const optNormalized: Record<string, unknown> = {};
                    // description: prefer description, fall back to label
                    optNormalized.description = opt.description ?? opt.label ?? opt.text ?? '';
                    // label: use label if present
                    optNormalized.label = opt.label ?? opt.text ?? '';
                    return optNormalized;
                });
            } else {
                normalized.options = [];
            }
            return normalized;
        });
    }

    // TodoWrite: model often outputs {todos: [{text, state}]} instead of {todos: [{id, content, status, priority}]}
    if (name === 'todowrite' && Array.isArray(input.todos)) {
        const stateToStatus: Record<string, string> = {
            'in_progress': 'in_progress',
            'in-progress': 'in_progress',
            'pending': 'pending',
            'done': 'completed',
            'complete': 'completed',
            'completed': 'completed',
        };
        input.todos = (input.todos as Record<string, unknown>[]).map((todo, i) => {
            const normalized: Record<string, unknown> = {};
            // id: use existing or generate
            normalized.id = todo.id ?? todo.Id ?? String(i + 1);
            // content: prefer content, fall back to text/title/description
            normalized.content = todo.content ?? todo.text ?? todo.title ?? todo.description ?? '';
            // status: normalize various state/status field names and values
            const rawStatus = String(todo.status ?? todo.state ?? 'pending').toLowerCase();
            normalized.status = stateToStatus[rawStatus] ?? 'pending';
            // priority: default to medium
            normalized.priority = todo.priority ?? 'medium';
            return normalized;
        });
    }

    return input;
}

/**
 * Parse tool calls from raw text and return OpenAI-compatible format.
 * Wraps the Anthropic-format parseToolCalls() for use by the OpenAI chat completions endpoint.
 * Returns cleaned text (without tool JSON) and structured tool calls.
 */
export function parseToolCallsFromText(content: string, requestedToolNames?: string[]): { text: string; toolCalls: OpenAIToolCall[] } {
    const result = parseToolCalls(content, requestedToolNames);

    if (!result.hasToolUse) {
        return { text: content, toolCalls: [] };
    }

    const textParts: string[] = [];
    const toolCalls: OpenAIToolCall[] = [];

    for (const block of result.blocks) {
        if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          } else if (block.type === 'tool_use' && block.name) {
                // Always use call_ prefix for OpenAI-compatible tool call IDs
                const callId = `call_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
                // Normalize tool inputs — models often output wrong field names
                const normalizedInput = normalizeToolInput(block.name, block.input || {});
                toolCalls.push({
                    id: callId,
                    type: 'function',
                    function: {
                        name: block.name,
                        arguments: JSON.stringify(normalizedInput),
                    },
                });
        }
    }

    return {
        text: textParts.join('\n').trim(),
        toolCalls,
    };
}

/**
 * Parse Supabase SSE line and extract data
 */
export function parseSupabaseSSELine(line: string): SupabaseSSEChunk | null {
    const trimmed = line.trim();

    if (!trimmed || !trimmed.startsWith('data: ')) {
        return null;
    }

    const jsonStr = trimmed.slice(6);

    if (jsonStr === '[DONE]') {
        return null;
    }

    try {
        return JSON.parse(jsonStr);
    } catch {
        if (jsonStr && !jsonStr.startsWith('{')) {
            return { content: jsonStr };
        }
        return null;
    }
}

