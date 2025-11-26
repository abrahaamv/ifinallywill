/**
 * Document Chunking Tests
 *
 * Tests text chunking, sentence splitting, and overlap handling.
 */

import { describe, expect, it } from 'vitest';
import {
  type ChunkOptions,
  chunkDocument,
  estimateTokens,
  validateChunkOptions,
} from '../chunking';

describe('chunkDocument()', () => {
  describe('Basic Chunking', () => {
    it('should chunk simple text into multiple parts', () => {
      const text = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000);

      const chunks = chunkDocument(text, { chunkSize: 800 });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]?.content).toContain('A');
      expect(chunks[1]?.content).toContain('B');
    });

    it('should preserve paragraph boundaries', () => {
      const text = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';

      const chunks = chunkDocument(text, { chunkSize: 50 });

      expect(chunks.length).toBeGreaterThan(0);
      // Each chunk should contain complete paragraphs
      for (const chunk of chunks) {
        expect(chunk.content).not.toMatch(/\n\n\n/); // No triple newlines
      }
    });

    it('should handle single paragraph', () => {
      const text = 'This is a single paragraph without any breaks.';

      const chunks = chunkDocument(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.content).toBe(text);
    });

    it('should handle empty text', () => {
      const chunks = chunkDocument('');

      expect(chunks).toEqual([]);
    });

    it('should handle whitespace-only text', () => {
      const chunks = chunkDocument('   \n\n   \n   ');

      expect(chunks).toEqual([]);
    });

    it('should normalize line endings', () => {
      const text = 'Line 1\r\nLine 2\r\nLine 3';

      const chunks = chunkDocument(text);

      expect(chunks[0]?.content).not.toContain('\r');
      expect(chunks[0]?.content).toContain('\n');
    });

    it('should collapse multiple newlines', () => {
      const text = 'Paragraph 1\n\n\n\n\nParagraph 2';

      const chunks = chunkDocument(text);

      expect(chunks[0]?.content).not.toMatch(/\n{3,}/);
    });
  });

  describe('Chunk Overlap', () => {
    it('should add overlap between chunks', () => {
      const text = 'A'.repeat(1000) + ' OVERLAP ' + 'B'.repeat(1000);

      const chunks = chunkDocument(text, { chunkSize: 800, overlapSize: 100 });

      // Second chunk should contain overlap from first
      if (chunks.length > 1) {
        expect(chunks[1]?.content).toContain('A'); // Overlap from first chunk
        expect(chunks[1]?.content).toContain('B'); // New content
      }
    });

    it('should respect overlapSize configuration', () => {
      const text = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000);

      const chunks = chunkDocument(text, { chunkSize: 500, overlapSize: 50 });

      for (const chunk of chunks) {
        expect(chunk.metadata.overlapSize).toBe(50);
      }
    });

    it('should handle zero overlap', () => {
      const text = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000);

      const chunks = chunkDocument(text, { chunkSize: 500, overlapSize: 0 });

      // No overlap means clean split
      expect(chunks[0]?.content).not.toContain('B');
      if (chunks.length > 1) {
        expect(chunks[1]?.content).not.toContain('A');
      }
    });
  });

  describe('Sentence Preservation', () => {
    it('should split on sentence boundaries when enabled', () => {
      const text =
        'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. ' +
        'Sixth sentence. Seventh sentence.';

      const chunks = chunkDocument(text, { chunkSize: 50, preserveSentences: true });

      // Each chunk should end with sentence-ending punctuation
      for (const chunk of chunks) {
        expect(chunk.content).toMatch(/[.!?]$/);
      }
    });

    it('should handle exclamation marks', () => {
      const text = 'Wow! Amazing! Incredible! Fantastic! Wonderful!';

      const chunks = chunkDocument(text, { chunkSize: 20, preserveSentences: true });

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.content).toMatch(/!/);
      }
    });

    it('should handle question marks', () => {
      const text = 'What? Why? How? When? Where?';

      const chunks = chunkDocument(text, { chunkSize: 15, preserveSentences: true });

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.content).toMatch(/\?/);
      }
    });

    it('should allow disabling sentence preservation', () => {
      const text = 'Sentence one. Sentence two. Sentence three.';

      const chunks = chunkDocument(text, { chunkSize: 20, preserveSentences: false });

      // May split mid-sentence
      expect(chunks).toBeDefined();
    });
  });

  describe('Chunk Metadata', () => {
    it('should include position index', () => {
      const text = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000);

      const chunks = chunkDocument(text, { chunkSize: 500 });

      expect(chunks[0]?.position).toBe(0);
      if (chunks.length > 1) {
        expect(chunks[1]?.position).toBe(1);
      }
      if (chunks.length > 2) {
        expect(chunks[2]?.position).toBe(2);
      }
    });

    it('should include chunk size', () => {
      const text = 'Test document content';

      const chunks = chunkDocument(text);

      expect(chunks[0]?.metadata.chunkSize).toBe(text.length);
    });

    it('should include start and end indices', () => {
      const text = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000);

      const chunks = chunkDocument(text, { chunkSize: 500 });

      expect(chunks[0]?.metadata.startIndex).toBe(0);
      expect(chunks[0]?.metadata.endIndex).toBeGreaterThan(0);

      if (chunks.length > 1) {
        expect(chunks[1]?.metadata.startIndex).toBeGreaterThan(0);
        expect(chunks[1]?.metadata.endIndex).toBeGreaterThan(chunks[1].metadata.startIndex);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long paragraphs', () => {
      // 5000 character paragraph with sentences (so it can be split)
      const longSentence = 'This is a sentence. '.repeat(250); // ~5000 chars with sentence boundaries

      const chunks = chunkDocument(longSentence, { chunkSize: 800 });

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.content.length).toBeLessThanOrEqual(1000); // Allow some margin for overlap
      }
    });

    it('should handle very short text', () => {
      const text = 'Hi';

      const chunks = chunkDocument(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.content).toBe('Hi');
    });

    it('should handle mixed content', () => {
      const text = `# Heading

Paragraph with multiple sentences. Here's another one. And one more.

- List item 1
- List item 2

Final paragraph.`;

      const chunks = chunkDocument(text, { chunkSize: 100 });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.map((c) => c.content).join('\n\n')).toContain('Heading');
      expect(chunks.map((c) => c.content).join('\n\n')).toContain('List item');
    });

    it('should handle unicode characters', () => {
      const text = '你好世界\n\nこんにちは世界\n\nПривет мир';

      const chunks = chunkDocument(text);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]?.content).toContain('你好');
    });
  });

  describe('Default Configuration', () => {
    it('should use default chunkSize of 1400', () => {
      const text = 'This is a long sentence. '.repeat(80); // ~2000 chars with sentence boundaries

      const chunks = chunkDocument(text);

      // Should split because text exceeds default 1400
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should use default overlapSize of 250', () => {
      const text = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000);

      const chunks = chunkDocument(text);

      expect(chunks[0]?.metadata.overlapSize).toBe(250);
    });

    it('should preserve sentences by default', () => {
      const text = 'Sentence one. Sentence two. '.repeat(50);

      const chunks = chunkDocument(text, { chunkSize: 100 });

      // Should split on sentence boundaries
      for (const chunk of chunks) {
        expect(chunk.content).toMatch(/[.!?]$/);
      }
    });
  });
});

describe('estimateTokens()', () => {
  it('should estimate tokens for text', () => {
    // 400 characters ≈ 100 tokens (1:4 ratio)
    expect(estimateTokens('A'.repeat(400))).toBe(100);
  });

  it('should handle empty text', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should round up partial tokens', () => {
    // 401 characters should round up to 101 tokens
    expect(estimateTokens('A'.repeat(401))).toBe(101);
  });
});

describe('validateChunkOptions()', () => {
  it('should accept valid options', () => {
    const result = validateChunkOptions({
      chunkSize: 800,
      overlapSize: 100,
      preserveSentences: true,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject chunkSize too small', () => {
    const result = validateChunkOptions({ chunkSize: 50 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('chunkSize must be at least 100 characters');
  });

  it('should reject chunkSize too large', () => {
    const result = validateChunkOptions({ chunkSize: 3000 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('chunkSize should not exceed 2400 characters (~600 tokens)');
  });

  it('should reject negative overlapSize', () => {
    const result = validateChunkOptions({ overlapSize: -10 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('overlapSize cannot be negative');
  });

  it('should reject overlapSize >= chunkSize', () => {
    const result = validateChunkOptions({
      chunkSize: 500,
      overlapSize: 500,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('overlapSize must be less than chunkSize');
  });

  it('should return multiple errors', () => {
    const result = validateChunkOptions({
      chunkSize: 50, // Too small
      overlapSize: -10, // Negative
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it('should accept empty options', () => {
    const result = validateChunkOptions({});

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
