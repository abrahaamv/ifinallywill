/**
 * Provider Service
 * 
 * Manages AI provider selection and configuration.
 * Supports: aura (Supabase) and tldraw providers.
 */

export type ProviderType = 'aura' | 'tldraw' | 'ocrarena';

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  description: string;
  defaultModel: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
}

export const PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  aura: {
    type: 'aura',
    name: 'Aura (Supabase)',
    description: 'Supabase Edge Functions with full model suite',
    defaultModel: 'claude-opus-4-5-20251101',
    supportsStreaming: true,
    supportsTools: true,
  },
  tldraw: {
    type: 'tldraw',
    name: 'tldraw LLM',
    description: 'Pure LLM mode via tldraw backend (full tool support)',
    defaultModel: 'claude-opus-4-5',
    supportsStreaming: true,
    supportsTools: true,
  },
  ocrarena: {
    type: 'ocrarena',
    name: 'OCR Arena',
    description: 'OCR Arena vision models with streaming support',
    defaultModel: 'claude-opus-4-6',
    supportsStreaming: true,
    supportsTools: true,
  },
};

// Aura provider models
export const AURA_MODELS = [
  {
    id: 'gpt-4',
    display_name: 'GPT-4 (mapped to Claude 4.5 Sonnet)',
    created: Math.floor(new Date('2024-01-01').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'gpt-4-turbo',
    display_name: 'GPT-4 Turbo (mapped to Claude 4.5 Sonnet)',
    created: Math.floor(new Date('2024-01-01').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'gpt-4o',
    display_name: 'GPT-4o (mapped to Claude 4.5 Opus)',
    created: Math.floor(new Date('2024-01-01').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'gpt-3.5-turbo',
    display_name: 'GPT-3.5 Turbo (mapped to Claude 3.5 Sonnet)',
    created: Math.floor(new Date('2024-01-01').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'gpt-4o-mini',
    display_name: 'GPT-4o Mini (mapped to Claude Haiku)',
    created: Math.floor(new Date('2024-01-01').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'claude-opus-4-5-20251101',
    display_name: 'Claude 4.5 Opus',
    created: Math.floor(new Date('2025-11-01').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    display_name: 'Claude 4.5 Sonnet',
    created: Math.floor(new Date('2025-09-29').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    display_name: 'Claude 3.5 Sonnet',
    created: Math.floor(new Date('2024-10-22').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-3-haiku-20240307',
    display_name: 'Claude 3 Haiku',
    created: Math.floor(new Date('2024-03-07').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    display_name: 'Claude 4.5 Haiku',
    created: Math.floor(new Date('2025-10-01').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-opus-4-5-thinking',
    display_name: 'Claude 4.5 Opus (Thinking)',
    created: Math.floor(new Date('2025-11-01').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-sonnet-4-5-thinking',
    display_name: 'Claude 4.5 Sonnet (Thinking)',
    created: Math.floor(new Date('2025-09-29').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'gemini-3-pro-preview',
    display_name: 'Gemini 3 Pro',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'gemini-2.5-pro',
    display_name: 'Gemini 2.5 Pro',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'gemini-3-flash-preview',
    display_name: 'Gemini 3 Flash',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'claude-opus-4-6',
    display_name: 'Claude Opus 4.6',
    created: Math.floor(new Date('2025-11-01').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'gpt-5.2-2025-12-11',
    display_name: 'GPT-5.2',
    created: Math.floor(new Date('2025-12-11').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'gpt-5.1-2025-11-13',
    display_name: 'GPT-5.1',
    created: Math.floor(new Date('2025-11-13').getTime() / 1000),
    owned_by: 'openai',
  },
];

// tldraw provider models
export const TLDRAW_MODELS = [
  {
    id: 'claude-opus-4-5',
    display_name: 'Claude Opus 4.5 (tldraw)',
    created: Math.floor(new Date('2025-11-01').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-sonnet-4-5',
    display_name: 'Claude Sonnet 4.5 (tldraw)',
    created: Math.floor(new Date('2025-09-29').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'gemini-3-pro-preview',
    display_name: 'Gemini 3 Pro (tldraw)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'gemini-3-flash-preview',
    display_name: 'Gemini 3 Flash (tldraw)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'gpt-5.2-2025-12-11',
    display_name: 'GPT-5.2 (tldraw)',
    created: Math.floor(new Date('2025-12-11').getTime() / 1000),
    owned_by: 'openai',
  },
];

// OCR Arena provider models
// Ordered by quality for coding tasks: Anthropic > Gemini > GPT > Others
export const OCRARENA_MODELS = [
  // ═══════════════════════════════════════════════════════
  // Anthropic Models (Best for code)
  // ═══════════════════════════════════════════════════════
  {
    id: 'claude-opus-4-6',
    display_name: 'Claude Opus 4.6 (OCR Arena)',
    created: Math.floor(new Date('2026-02-01').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-opus-4-5',
    display_name: 'Claude Opus 4.5 (OCR Arena)',
    created: Math.floor(new Date('2025-11-01').getTime() / 1000),
    owned_by: 'anthropic',
  },
  {
    id: 'claude-sonnet-4-5',
    display_name: 'Claude Sonnet 4.5 (OCR Arena)',
    created: Math.floor(new Date('2025-09-29').getTime() / 1000),
    owned_by: 'anthropic',
  },

  // ═══════════════════════════════════════════════════════
  // Gemini Models
  // ═══════════════════════════════════════════════════════
  {
    id: 'gemini-3-pro-preview',
    display_name: 'Gemini 3 Pro Preview (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'gemini-2.5-pro',
    display_name: 'Gemini 2.5 Pro (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'gemini-2.5-flash',
    display_name: 'Gemini 2.5 Flash (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },
  {
    id: 'gemini-3-flash',
    display_name: 'Gemini 3 Flash (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'google',
  },

  // ═══════════════════════════════════════════════════════
  // GPT Models
  // ═══════════════════════════════════════════════════════
  {
    id: 'gpt-5.2',
    display_name: 'GPT-5.2 (OCR Arena)',
    created: Math.floor(new Date('2025-12-11').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'gpt-5.1',
    display_name: 'GPT-5.1 (OCR Arena)',
    created: Math.floor(new Date('2025-11-13').getTime() / 1000),
    owned_by: 'openai',
  },
  {
    id: 'gpt-5',
    display_name: 'GPT-5 (OCR Arena)',
    created: Math.floor(new Date('2025-11-01').getTime() / 1000),
    owned_by: 'openai',
  },

  // ═══════════════════════════════════════════════════════
  // Other Models (OCR-focused, less ideal for code)
  // ═══════════════════════════════════════════════════════
  {
    id: 'qwen3-vl-235b',
    display_name: 'Qwen3-VL-235B (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'qwen',
  },
  {
    id: 'qwen3-vl-8b',
    display_name: 'Qwen3-VL-8B (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'qwen',
  },
  {
    id: 'deepseek-ocr',
    display_name: 'DeepSeek OCR (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'deepseek',
  },
  {
    id: 'glm-ocr',
    display_name: 'GLM-OCR (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'zhipu',
  },
  {
    id: 'iris',
    display_name: 'Iris (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'iris',
  },
  {
    id: 'mistral-ocr-v3',
    display_name: 'Mistral OCR v3 (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'mistral',
  },
  {
    id: 'olmocr-2',
    display_name: 'olmOCR 2 (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'olm',
  },
  {
    id: 'dots-ocr',
    display_name: 'dots.ocr (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'dots',
  },
  {
    id: 'nanonets2-3b',
    display_name: 'Nanonets2-3B (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'nanonets',
  },
  {
    id: 'nemotron-parse',
    display_name: 'Nemotron Parse Playground (OCR Arena)',
    created: Math.floor(new Date('2025-12-01').getTime() / 1000),
    owned_by: 'nvidia',
  },
];

/**
 * Get the current provider from environment
 */
export function getCurrentProvider(): ProviderType {
  const provider = process.env.PROVIDER as ProviderType;
  if (provider === 'tldraw') {
    return 'tldraw';
  }
  if (provider === 'ocrarena') {
    return 'ocrarena';
  }
  return 'aura'; // Default to aura
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider?: ProviderType): ProviderConfig {
  const p = provider || getCurrentProvider();
  return PROVIDER_CONFIGS[p];
}

/**
 * Get available models for the current provider
 */
export function getProviderModels(provider?: ProviderType): typeof AURA_MODELS {
  const p = provider || getCurrentProvider();
  if (p === 'tldraw') return TLDRAW_MODELS;
  if (p === 'ocrarena') return OCRARENA_MODELS;
  return AURA_MODELS;
}

/**
 * Check if current provider is aura
 */
export function isAuraProvider(): boolean {
  return getCurrentProvider() === 'aura';
}

/**
 * Check if current provider is tldraw
 */
export function isTldrawProvider(): boolean {
  return getCurrentProvider() === 'tldraw';
}

/**
 * Check if current provider is ocrarena
 */
export function isOcrArenaProvider(): boolean {
  return getCurrentProvider() === 'ocrarena';
}

/**
 * Check if a model is valid for the given provider.
 * Returns null if valid, error string if not.
 */
export function validateModelForProvider(model: string, provider?: ProviderType): string | null {
  const p = provider || getCurrentProvider();
  let models = AURA_MODELS;
  if (p === 'tldraw') models = TLDRAW_MODELS;
  if (p === 'ocrarena') models = OCRARENA_MODELS;
  const found = models.some(m => m.id === model);
  if (!found) {
    const available = models.map(m => m.id).join(', ');
    return `Model "${model}" is not available for provider "${p}". Available: ${available}`;
  }
  return null;
}

/**
 * Validate provider configuration (credentials, env vars).
 * Returns { valid, error }.
 */
export function validateProviderConfig(): { valid: boolean; error?: string } {
  const provider = getCurrentProvider();

  if (provider === 'tldraw') {
    // tldraw only needs the agent URL (has default)
    return { valid: true };
  }

  if (provider === 'ocrarena') {
    // OCR Arena only needs the API URL (has default)
    return { valid: true };
  }

  // Aura requires Supabase configuration
  if (!process.env.SUPABASE_ANON_KEY) {
    return {
      valid: false,
      error: 'SUPABASE_ANON_KEY is required when PROVIDER=aura',
    };
  }

  return { valid: true };
}
