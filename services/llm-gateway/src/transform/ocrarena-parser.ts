/**
 * OCR Arena Response Parser
 *
 * Parses Server-Sent Events from OCR Arena API.
 * Response format:
 *   {"type":"init","modelName":"Opus 4.6"}
 *   {"type":"chunk","text":"..."}
 *   {"type":"complete","processingTime":2378,"pageCount":1}
 *   {"type":"done"}
 */

export interface OcrArenaInitEvent {
    _type: 'init';
    modelName: string;
}

export interface OcrArenaChunkEvent {
    _type: 'chunk';
    text: string;
}

export interface OcrArenaCompleteEvent {
    _type: 'complete';
    processingTime: number;
    pageCount: number;
}

export interface OcrArenaDoneEvent {
    _type: 'done';
}

export type OcrArenaEvent = OcrArenaInitEvent | OcrArenaChunkEvent | OcrArenaCompleteEvent | OcrArenaDoneEvent;

/**
 * Parse a single SSE line from OCR Arena
 */
export function parseOcrArenaSSELine(line: string): OcrArenaEvent | null {
    if (!line || !line.trim()) return null;

    // OCR Arena sends standard SSE format: "data: {"type":"chunk","text":"..."}"
    // Extract the JSON part after "data:"
    let jsonStr = line.trim();
    if (jsonStr.startsWith('data:')) {
        jsonStr = jsonStr.substring(5).trim();
    }

    if (!jsonStr) return null;

    // Skip SSE comments and other non-JSON lines
    if (jsonStr.startsWith(':')) return null;
    if (jsonStr === '[DONE]') return { _type: 'done' };

    try {
        const parsed = JSON.parse(jsonStr);

        if (parsed.type === 'init') {
            return {
                _type: 'init',
                modelName: parsed.modelName || 'unknown',
            };
        }

        if (parsed.type === 'chunk') {
            return {
                _type: 'chunk',
                text: parsed.text || '',
            };
        }

        if (parsed.type === 'complete') {
            return {
                _type: 'complete',
                processingTime: parsed.processingTime || 0,
                pageCount: parsed.pageCount || 0,
            };
        }

        if (parsed.type === 'done') {
            return {
                _type: 'done',
            };
        }

        // Unknown event type - log but don't error
        console.warn('[OcrArena/Parser] Unknown event type:', parsed.type);
        return null;
    } catch (err) {
        // Only log if it looks like it should be JSON
        if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
            console.error('[OcrArena/Parser] Failed to parse SSE line:', line.slice(0, 100), err);
        }
    }

    return null;
}

/**
 * Collect full text content from OCR Arena events
 */
export function collectOcrArenaTextContent(events: OcrArenaEvent[]): string {
    let content = '';
    for (const event of events) {
        if (event._type === 'chunk' && event.text) {
            content += event.text;
        }
    }
    return content;
}
