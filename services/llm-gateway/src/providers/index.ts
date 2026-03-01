/**
 * Provider Registry
 *
 * Returns the active LLM provider based on the PROVIDER env var.
 */

import { LLMProvider } from './base.js';
import { AuraProvider } from './aura.js';
import { TldrawProvider } from './tldraw.js';
import { OcrArenaProvider } from './ocrarena.js';

export type { LLMProvider } from './base.js';

const providers: Record<string, () => LLMProvider> = {
    aura: () => new AuraProvider(),
    tldraw: () => new TldrawProvider(),
    ocrarena: () => new OcrArenaProvider(),
};

let cached: LLMProvider | null = null;
let cachedName: string | null = null;

/**
 * Get the active provider instance (cached singleton).
 */
export function getProvider(): LLMProvider {
    const name = process.env.PROVIDER || 'aura';
    if (cached && cachedName === name) return cached;

    const factory = providers[name];
    if (!factory) {
        throw new Error(`Unknown provider "${name}". Available: ${Object.keys(providers).join(', ')}`);
    }

    cached = factory();
    cachedName = name;
    return cached;
}
