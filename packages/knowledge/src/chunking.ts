/**
 * Document Chunking Utilities (Phase 5 - Priority 2)
 * Text splitting with overlap for better RAG retrieval
 */

export interface ChunkOptions {
  chunkSize?: number; // Characters per chunk
  overlapSize?: number; // Character overlap between chunks
  preserveSentences?: boolean; // Try to break on sentence boundaries
}

export interface TextChunk {
  content: string;
  position: number;
  metadata: {
    chunkSize: number;
    overlapSize: number;
    startIndex: number;
    endIndex: number;
  };
}

/**
 * Default chunking configuration
 * Optimized for Voyage Multimodal-3 embeddings
 */
const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  chunkSize: 800, // ~200 tokens (Voyage recommends 200-300 tokens per chunk)
  overlapSize: 100, // ~25 tokens overlap
  preserveSentences: true,
};

/**
 * Chunk text document for RAG indexing
 *
 * Strategy:
 * 1. Split on paragraph boundaries first
 * 2. Further split large paragraphs on sentence boundaries
 * 3. Add overlap between chunks for context preservation
 *
 * @param text - Document content to chunk
 * @param options - Chunking configuration
 * @returns Array of text chunks with metadata
 */
export function chunkDocument(text: string, options: ChunkOptions = {}): TextChunk[] {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const chunks: TextChunk[] = [];

  // Clean and normalize text
  const normalized = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim();

  if (!normalized) {
    return chunks;
  }

  // Split on paragraphs first
  const paragraphs = normalized.split(/\n\n+/).filter((p) => p.trim());

  let currentChunk = '';
  let chunkStart = 0;
  let position = 0;

  for (const paragraph of paragraphs) {
    const paragraphTrimmed = paragraph.trim();

    // If adding this paragraph would exceed chunk size, save current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + paragraphTrimmed.length > config.chunkSize
    ) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        position,
        metadata: {
          chunkSize: currentChunk.length,
          overlapSize: config.overlapSize,
          startIndex: chunkStart,
          endIndex: chunkStart + currentChunk.length,
        },
      });
      position++;

      // Start new chunk with overlap from previous
      if (config.overlapSize > 0 && currentChunk.length > config.overlapSize) {
        const overlapText = currentChunk.slice(-config.overlapSize);
        currentChunk = overlapText + '\n\n' + paragraphTrimmed;
        chunkStart = chunkStart + currentChunk.length - config.overlapSize;
      } else {
        currentChunk = paragraphTrimmed;
        chunkStart = chunkStart + currentChunk.length;
      }
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraphTrimmed;
      } else {
        currentChunk = paragraphTrimmed;
      }
    }

    // If paragraph itself is too large, split on sentences
    if (paragraphTrimmed.length > config.chunkSize && config.preserveSentences) {
      const sentences = splitSentences(paragraphTrimmed);
      currentChunk = '';

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > config.chunkSize) {
          if (currentChunk.length > 0) {
            chunks.push({
              content: currentChunk.trim(),
              position,
              metadata: {
                chunkSize: currentChunk.length,
                overlapSize: config.overlapSize,
                startIndex: chunkStart,
                endIndex: chunkStart + currentChunk.length,
              },
            });
            position++;

            // Add overlap
            if (config.overlapSize > 0 && currentChunk.length > config.overlapSize) {
              const overlapText = currentChunk.slice(-config.overlapSize);
              currentChunk = overlapText + ' ' + sentence;
              chunkStart = chunkStart + currentChunk.length - config.overlapSize;
            } else {
              currentChunk = sentence;
              chunkStart = chunkStart + currentChunk.length;
            }
          } else {
            currentChunk = sentence;
          }
        } else {
          currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
        }
      }
    }
  }

  // Save final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      position,
      metadata: {
        chunkSize: currentChunk.length,
        overlapSize: config.overlapSize,
        startIndex: chunkStart,
        endIndex: chunkStart + currentChunk.length,
      },
    });
  }

  return chunks;
}

/**
 * Split text on sentence boundaries
 * Uses simple regex for sentence detection
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  // Handles: . ! ? followed by space or newline
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences;
}

/**
 * Estimate token count for text
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Validate chunk size configuration
 */
export function validateChunkOptions(options: ChunkOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.chunkSize !== undefined) {
    if (options.chunkSize < 100) {
      errors.push('chunkSize must be at least 100 characters');
    }
    if (options.chunkSize > 2000) {
      errors.push('chunkSize should not exceed 2000 characters (~500 tokens)');
    }
  }

  if (options.overlapSize !== undefined) {
    if (options.overlapSize < 0) {
      errors.push('overlapSize cannot be negative');
    }
    if (options.chunkSize && options.overlapSize >= options.chunkSize) {
      errors.push('overlapSize must be less than chunkSize');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
