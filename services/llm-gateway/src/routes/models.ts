/**
 * Models endpoint - returns available models in Anthropic format
 */

import { Router, Request, Response } from 'express';

const router = Router();

const AVAILABLE_MODELS = [
    {
        id: 'claude-opus-4-6',
        display_name: 'Claude Opus 4.6',
        created_at: '2026-02-01T00:00:00Z',
        type: 'model',
    },
    {
        id: 'claude-opus-4-5-20251101',
        display_name: 'Claude 4.5 Opus',
        created_at: '2025-11-01T00:00:00Z',
        type: 'model',
    },
    {
        id: 'claude-sonnet-4-5-20250929',
        display_name: 'Claude 4.5 Sonnet',
        created_at: '2025-09-29T00:00:00Z',
        type: 'model',
    },
    {
        id: 'claude-haiku-4-5-20251001',
        display_name: 'Claude 4.5 Haiku',
        created_at: '2025-10-01T00:00:00Z',
        type: 'model',
    },
    {
        id: 'claude-3-5-sonnet-20241022',
        display_name: 'Claude 3.5 Sonnet',
        created_at: '2024-10-22T00:00:00Z',
        type: 'model',
    },
    {
        id: 'claude-3-haiku-20240307',
        display_name: 'Claude 3 Haiku',
        created_at: '2024-03-07T00:00:00Z',
        type: 'model',
    },
    {
        id: 'claude-opus-4-5-thinking',
        display_name: 'Claude 4.5 Opus (Thinking)',
        created_at: '2025-11-01T00:00:00Z',
        type: 'model',
    },
    {
        id: 'claude-sonnet-4-5-thinking',
        display_name: 'Claude 4.5 Sonnet (Thinking)',
        created_at: '2025-09-29T00:00:00Z',
        type: 'model',
    },
    {
        id: 'gemini-3-pro-preview',
        display_name: 'Gemini 3 Pro',
        created_at: '2025-12-01T00:00:00Z',
        type: 'model',
    },
    {
        id: 'gemini-2.5-pro',
        display_name: 'Gemini 2.5 Pro',
        created_at: '2025-12-01T00:00:00Z',
        type: 'model',
    },
    {
        id: 'gpt-5.2-2025-12-11',
        display_name: 'GPT-5.2',
        created_at: '2025-12-11T00:00:00Z',
        type: 'model',
    },
    {
        id: 'gpt-5.1-2025-11-13',
        display_name: 'GPT-5.1',
        created_at: '2025-11-13T00:00:00Z',
        type: 'model',
    },
];

router.get('/v1/models', (_req: Request, res: Response) => {
    res.json({
        object: 'list',
        data: AVAILABLE_MODELS,
    });
});

export default router;
