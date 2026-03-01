/**
 * OCR Arena Stream Content Collector
 *
 * Collects full text content from an OCR Arena streaming response,
 * similar to collectStreamContent for Supabase.
 */

import { parseOcrArenaSSELine } from './ocrarena-parser.js';

/**
 * Collect full text content from an OCR Arena streaming response
 * This mirrors the collectStreamContent function used for Supabase/Aura
 */
export async function collectOcrArenaStreamContent(response: globalThis.Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
        console.error('[OcrArena/Collector] No response body reader available');
        return '';
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let chunkCount = 0;
    let eventCount = 0;

    try {
        while (true) {
            let readResult;
            try {
                readResult = await reader.read();
            } catch (error) {
                console.error('[OcrArena/Collector] Stream read error:', error);
                break;
            }
            const { done, value } = readResult;
            if (done) {
                console.log(`[OcrArena/Collector] Stream complete - Chunks: ${chunkCount}, Events: ${eventCount}, Content length: ${fullContent.length}`);
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            chunkCount++;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;

                const event = parseOcrArenaSSELine(line);
                if (!event) continue;

                eventCount++;

                if (event._type === 'chunk' && event.text) {
                    fullContent += event.text;
                } else if (event._type === 'init') {
                    console.log(`[OcrArena/Collector] Initialized with model: ${event.modelName}`);
                } else if (event._type === 'complete') {
                    console.log(`[OcrArena/Collector] Processing complete - Time: ${event.processingTime}ms, Pages: ${event.pageCount}`);
                } else if (event._type === 'done') {
                    console.log(`[OcrArena/Collector] Stream done signal received`);
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            const event = parseOcrArenaSSELine(buffer);
            if (event) {
                eventCount++;
                if (event._type === 'chunk' && event.text) {
                    fullContent += event.text;
                }
            }
        }
    } catch (error) {
        console.error('[OcrArena/Collector] Fatal error during collection:', error);
    } finally {
        reader.releaseLock();
    }

    if (fullContent.length === 0) {
        console.warn('[OcrArena/Collector] No content collected from stream!');
    }

    return fullContent;
}
