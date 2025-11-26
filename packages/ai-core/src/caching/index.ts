/**
 * Prompt Caching Module
 * Week 1, Days 1-2: Phase 12 Implementation
 *
 * Provides 90% cost reduction through intelligent prompt caching
 */

export { GeminiProviderWithCaching } from './gemini-prompt-cache';
export { ClaudeProviderWithCaching } from './claude-prompt-cache';

/**
 * Factory function to create cached provider instances
 */
import type { ProviderConfig } from '../types';
import { GeminiProviderWithCaching } from './gemini-prompt-cache';
import { ClaudeProviderWithCaching } from './claude-prompt-cache';

export function createCachedProvider(
  provider: 'google' | 'anthropic',
  config: ProviderConfig
) {
  switch (provider) {
    case 'google':
      return new GeminiProviderWithCaching(config);
    case 'anthropic':
      return new ClaudeProviderWithCaching(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Caching best practices:
 *
 * 1. Gemini (Google):
 *    - Cache system prompts and knowledge base context
 *    - 24-hour TTL
 *    - 90% cost reduction on cached tokens
 *    - Best for: High-volume queries with stable prompts
 *
 * 2. Claude (Anthropic):
 *    - Up to 4 cache breakpoints
 *    - 5-minute cache lifetime (auto-refreshed with usage)
 *    - 90% discount on cache reads ($3.00 → $0.30/1M for Sonnet)
 *    - 25% surcharge on cache writes ($3.00 → $3.75/1M)
 *    - Best for: Complex prompts with multiple sections
 *
 * Usage Example:
 *
 * ```typescript
 * import { createCachedProvider } from '@platform/ai-core/caching';
 *
 * const provider = createCachedProvider('google', {
 *   apiKey: process.env.GOOGLE_API_KEY!
 * });
 *
 * const response = await provider.complete({
 *   messages: [
 *     { role: 'system', content: 'Your comprehensive system prompt...' },
 *     { role: 'user', content: 'User question' }
 *   ],
 *   enableCaching: true,
 *   tenantId: 'tenant-123'
 * });
 *
 * console.log('Cache savings:', response.metadata.cacheSavings);
 * console.log('Cache hit rate:', response.usage.cacheHitRate);
 * ```
 */
