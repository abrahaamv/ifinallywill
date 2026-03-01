/**
 * Supabase Edge Function Types
 * Based on Claura's generate-html endpoint
 */

export interface SupabaseGenerateRequest {
    model: string;
    prompt: string;
    instruction: string;
    streaming: boolean;
    user: {
        id: string;
        tier: string;
        quota: number;
    };
    images?: string[];
    previousHtml?: string;
}

export interface SupabaseGenerateResponse {
    response?: string;
    html?: string;
    content?: string;
    text?: string;
}

export interface SupabaseSSEChunk {
    content?: string;
    chunk?: string;
    text?: string;
    response?: string;
    delta?: {
        content?: string;
    };
}
