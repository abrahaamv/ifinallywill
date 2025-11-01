/**
 * Phase 12 Week 3: Citation Formatting
 * Structured citation formats for source attribution
 */

import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('CitationFormatting');

export type CitationStyle = 'inline' | 'footnote' | 'academic' | 'conversational';

export interface Source {
  id: string;
  type: 'document' | 'website' | 'conversation' | 'knowledge-base';
  title?: string;
  url?: string;
  author?: string;
  date?: Date | string;
  excerpt?: string;
  relevance?: number;
}

export interface Citation {
  sourceId: string;
  text: string;
  position: number; // Character position in response
  citationNumber: number;
}

export interface FormattedResponse {
  text: string; // Response with inline citations
  sources: Source[]; // Full source list
  citations: Citation[]; // All citations used
}

/**
 * Citation Formatter
 *
 * Formats citations in various styles:
 * - Inline: [1], [2], [3] within text
 * - Footnote: [1] with footnotes at bottom
 * - Academic: (Author, Year) style
 * - Conversational: "According to X..." natural language
 */
export class CitationFormatter {
  /**
   * Format response with citations in specified style
   */
  format(response: string, sources: Source[], style: CitationStyle = 'inline'): FormattedResponse {
    const citations: Citation[] = [];

    switch (style) {
      case 'inline':
        return this.formatInline(response, sources, citations);
      case 'footnote':
        return this.formatFootnote(response, sources, citations);
      case 'academic':
        return this.formatAcademic(response, sources, citations);
      case 'conversational':
        return this.formatConversational(response, sources, citations);
      default:
        return this.formatInline(response, sources, citations);
    }
  }

  /**
   * Inline citation format: [1], [2], [3]
   *
   * Example:
   * "The platform uses RAG for knowledge retrieval [1]. It achieves 85% cost reduction [2]."
   *
   * Sources:
   * [1] Architecture Documentation - RAG Implementation
   * [2] Cost Analysis Report - Phase 12 Optimization
   */
  private formatInline(
    response: string,
    sources: Source[],
    citations: Citation[]
  ): FormattedResponse {
    // Extract existing citations
    const citationRegex = /\[(\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(response)) !== null) {
      const citationNum = Number.parseInt(match[1] ?? '0', 10);
      const sourceId = sources[citationNum - 1]?.id || '';

      citations.push({
        sourceId,
        text: match[0] || '',
        position: match.index || 0,
        citationNumber: citationNum,
      });
    }

    // Build source list
    let formattedText = response;
    if (sources.length > 0) {
      formattedText += '\n\n**Sources:**\n';
      sources.forEach((source, i) => {
        formattedText += `[${i + 1}] ${this.formatSourceReference(source)}\n`;
      });
    }

    logger.debug('Formatted inline citations', {
      citationCount: citations.length,
      sourceCount: sources.length,
    });

    return {
      text: formattedText,
      sources,
      citations,
    };
  }

  /**
   * Footnote citation format
   *
   * Example:
   * "The platform uses RAG for knowledge retrieval¹. It achieves 85% cost reduction²."
   *
   * ¹ Architecture Documentation - RAG Implementation (https://...)
   * ² Cost Analysis Report - Phase 12 Optimization
   */
  private formatFootnote(
    response: string,
    sources: Source[],
    citations: Citation[]
  ): FormattedResponse {
    // Convert [1] to ¹ superscript format
    const superscriptNumbers = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

    let formattedText = response;
    const citationRegex = /\[(\d+)\]/g;
    let match;

    // Replace [1] with superscript
    while ((match = citationRegex.exec(response)) !== null) {
      const citationNum = Number.parseInt(match[1] ?? '0', 10);
      const sourceId = sources[citationNum - 1]?.id || '';

      // Convert to superscript (handles multi-digit numbers)
      const superscript = citationNum
        .toString()
        .split('')
        .map((d) => superscriptNumbers[Number.parseInt(d, 10)] || d)
        .join('');

      formattedText = formattedText.replace(match[0] || '', superscript);

      citations.push({
        sourceId,
        text: superscript,
        position: match.index || 0,
        citationNumber: citationNum,
      });
    }

    // Add footnotes
    if (sources.length > 0) {
      formattedText += '\n\n';
      sources.forEach((source, i) => {
        const citationNum = i + 1;
        const superscript = citationNum
          .toString()
          .split('')
          .map((d) => superscriptNumbers[Number.parseInt(d, 10)] || d)
          .join('');

        formattedText += `${superscript} ${this.formatSourceReference(source, true)}\n`;
      });
    }

    return {
      text: formattedText,
      sources,
      citations,
    };
  }

  /**
   * Academic citation format: (Author, Year)
   *
   * Example:
   * "The platform uses RAG for knowledge retrieval (Smith, 2024). It achieves 85% cost reduction (Jones & Lee, 2024)."
   *
   * References:
   * Smith, J. (2024). Architecture Documentation - RAG Implementation.
   * Jones, A., & Lee, B. (2024). Cost Analysis Report - Phase 12 Optimization.
   */
  private formatAcademic(
    response: string,
    sources: Source[],
    citations: Citation[]
  ): FormattedResponse {
    let formattedText = response;
    const citationRegex = /\[(\d+)\]/g;
    let match;

    // Replace [1] with (Author, Year) format
    while ((match = citationRegex.exec(response)) !== null) {
      const citationNum = Number.parseInt(match[1] ?? '0', 10);
      const source = sources[citationNum - 1];

      if (source) {
        const author = source.author || 'Unknown';
        const year = source.date
          ? new Date(source.date).getFullYear()
          : new Date().getFullYear();

        const academicCitation = `(${author}, ${year})`;
        formattedText = formattedText.replace(match[0] || '', academicCitation);

        citations.push({
          sourceId: source.id,
          text: academicCitation,
          position: match.index || 0,
          citationNumber: citationNum,
        });
      }
    }

    // Add references section
    if (sources.length > 0) {
      formattedText += '\n\n**References:**\n\n';
      sources.forEach((source) => {
        const author = source.author || 'Unknown';
        const year = source.date
          ? new Date(source.date).getFullYear()
          : new Date().getFullYear();
        const title = source.title || 'Untitled';
        const url = source.url ? ` Available at: ${source.url}` : '';

        formattedText += `${author} (${year}). ${title}.${url}\n\n`;
      });
    }

    return {
      text: formattedText,
      sources,
      citations,
    };
  }

  /**
   * Conversational citation format
   *
   * Example:
   * "According to the Architecture Documentation, the platform uses RAG for knowledge retrieval.
   *  The Cost Analysis Report shows it achieves 85% cost reduction."
   */
  private formatConversational(
    response: string,
    sources: Source[],
    citations: Citation[]
  ): FormattedResponse {
    let formattedText = response;
    const citationRegex = /\[(\d+)\]/g;
    let match;

    // Replace [1] with "According to X..." format
    while ((match = citationRegex.exec(response)) !== null) {
      const citationNum = Number.parseInt(match[1] ?? '0', 10);
      const source = sources[citationNum - 1];

      if (source) {
        const sourceRef = source.title || source.type;
        const naturalCitation = `according to ${sourceRef}`;

        // Find the sentence containing the citation
        const beforeCitation = formattedText.substring(0, match.index);
        const lastSentenceStart = beforeCitation.lastIndexOf('. ') + 2;

        // Insert "According to X, " at start of sentence
        formattedText =
          formattedText.substring(0, lastSentenceStart) +
          `According to ${sourceRef}, ` +
          formattedText.substring(lastSentenceStart).replace(match[0] || '', '');

        citations.push({
          sourceId: source.id,
          text: naturalCitation,
          position: lastSentenceStart,
          citationNumber: citationNum,
        });
      }
    }

    // Optionally add source list
    if (sources.length > 0) {
      formattedText += '\n\n**Referenced Sources:**\n';
      sources.forEach((source) => {
        formattedText += `- ${this.formatSourceReference(source)}\n`;
      });
    }

    return {
      text: formattedText,
      sources,
      citations,
    };
  }

  /**
   * Format a single source reference
   */
  private formatSourceReference(source: Source, includeUrl = false): string {
    let ref = '';

    if (source.title) {
      ref += source.title;
    } else {
      ref += `${source.type} source`;
    }

    if (source.author) {
      ref += ` by ${source.author}`;
    }

    if (source.date) {
      const date = new Date(source.date);
      ref += ` (${date.toLocaleDateString()})`;
    }

    if (includeUrl && source.url) {
      ref += ` - ${source.url}`;
    }

    if (source.relevance) {
      ref += ` [Relevance: ${(source.relevance * 100).toFixed(0)}%]`;
    }

    return ref;
  }

  /**
   * Extract citations from response text
   */
  extractCitations(text: string): number[] {
    const citationRegex = /\[(\d+)\]/g;
    const citations: number[] = [];
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const citationNum = Number.parseInt(match[1] ?? '0', 10);
      citations.push(citationNum);
    }

    return citations;
  }

  /**
   * Validate citations in response
   */
  validateCitations(
    text: string,
    sources: Source[]
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const citationNumbers = this.extractCitations(text);

    // Check for invalid citation numbers
    for (const num of citationNumbers) {
      if (num < 1 || num > sources.length) {
        errors.push(`Invalid citation [${num}] - only ${sources.length} sources provided`);
      }
    }

    // Check for duplicate citations
    const uniqueCitations = new Set(citationNumbers);
    if (uniqueCitations.size !== citationNumbers.length) {
      errors.push('Duplicate citations found');
    }

    // Check for missing citations
    for (let i = 1; i <= sources.length; i++) {
      if (!citationNumbers.includes(i)) {
        logger.warn(`Source [${i}] not cited in response`);
      }
    }

    logger.debug('Citation validation complete', {
      valid: errors.length === 0,
      errorCount: errors.length,
      citationCount: citationNumbers.length,
      sourceCount: sources.length,
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate citation prompt instructions
   */
  generateCitationInstructions(style: CitationStyle): string {
    switch (style) {
      case 'inline':
        return `Use inline citations [1], [2], [3] for all factual claims. List all sources at the end with [1] Source Title, [2] Source Title, etc.`;

      case 'footnote':
        return `Use superscript footnotes¹, ², ³ for all factual claims. Provide full footnotes at the bottom with complete source information.`;

      case 'academic':
        return `Use academic citation format (Author, Year) for all references. Include a References section at the end with full bibliographic information.`;

      case 'conversational':
        return `Cite sources naturally in the text using phrases like "According to [source name]..." or "The [source name] shows...". Include a list of referenced sources at the end.`;

      default:
        return `Cite all sources used in your response.`;
    }
  }
}

/**
 * Create a citation formatter instance
 */
export function createCitationFormatter(): CitationFormatter {
  return new CitationFormatter();
}
