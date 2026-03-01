/**
 * LLM Gateway — Multi-Provider LLM Gateway
 *
 * Exposes both Anthropic Messages API (/v1/messages) and OpenAI Chat Completions API
 * (/v1/chat/completions), backed by pluggable providers (Aura/Supabase, tldraw, OCR Arena).
 *
 * Any model works on any endpoint:
 *  - /v1/messages handles proper Anthropic tool_use blocks even for GPT/Gemini models
 *  - /v1/chat/completions handles proper OpenAI function calls even for Claude models
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { healthRouter, modelsRouter, messagesRouter, chatCompletionsRouter } from './routes/index.js';
import { createOrchidsWSHandler } from './ws-server.js';
import { createOrchidsPassthrough } from './ws-passthrough.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Routes
app.use(healthRouter);
app.use(modelsRouter);
app.use(messagesRouter);
app.use(chatCompletionsRouter);

// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        name: 'LLM Gateway',
        version: '2.0.0',
        description: 'Multi-provider LLM gateway with Anthropic + OpenAI API compatibility',
        endpoints: {
            health: '/health',
            models: '/v1/models',
            messages: '/v1/messages (Anthropic Messages API)',
            chat_completions: '/v1/chat/completions (OpenAI Chat Completions API)',
        },
        providers: ['aura (Supabase)', 'tldraw', 'ocrarena'],
    });
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        type: 'error',
        error: { type: 'not_found', message: 'Endpoint not found' },
    });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Gateway] Unhandled error:', err);
    res.status(500).json({
        type: 'error',
        error: { type: 'api_error', message: err.message || 'Internal server error' },
    });
});

// Start server
const server = app.listen(PORT, () => {
    const provider = process.env.PROVIDER || 'aura';

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  LLM Gateway v2.0.0                             ║');
    console.log('║       Multi-Provider Gateway (Anthropic + OpenAI)             ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Server: http://localhost:${PORT}                                ║`);
    console.log(`║  Provider: ${provider.padEnd(49)}║`);
    console.log('║                                                                ║');
    console.log('║  Endpoints:                                                    ║');
    console.log('║    POST /v1/messages         → Anthropic Messages API          ║');
    console.log('║    POST /v1/chat/completions → OpenAI Chat Completions API     ║');
    console.log('║    GET  /v1/models           → List available models           ║');
    console.log('║    GET  /health              → Health check                    ║');
    console.log('║                                                                ║');
    console.log('║  Usage:                                                        ║');
    console.log(`║    ANTHROPIC_BASE_URL=http://localhost:${PORT}                    ║`);
    console.log(`║    OPENAI_BASE_URL=http://localhost:${PORT}/v1                    ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    if (provider === 'aura') {
        if (!process.env.SUPABASE_ANON_KEY) {
            console.warn('  ⚠ SUPABASE_ANON_KEY not set. Aura API calls will fail.');
        }
        if (!process.env.USER_TOKEN) {
            console.warn('  ⚠ USER_TOKEN not set. Aura auth may fail.');
        }
    } else if (provider === 'tldraw') {
        console.log(`  tldraw URL: ${process.env.TLDRAW_AGENT_URL || 'https://agent.templates.tldraw.dev/stream'}`);
    } else if (provider === 'ocrarena') {
        console.log(`  OCR Arena URL: ${process.env.OCRARENA_API_URL || 'https://www.ocrarena.ai/api/ocr/stream'}`);
    }

    if (process.env.MODEL_OVERRIDE) {
        console.log(`  MODEL_OVERRIDE: ALL requests forced to → ${process.env.MODEL_OVERRIDE}`);
    }
});

// WebSocket server for Orchids protocol
const wss = new WebSocketServer({ server, path: '/agent/ws' });

const usePassthrough = process.env.ORCHIDS_PASSTHROUGH === 'true';

if (usePassthrough) {
    wss.on('connection', createOrchidsPassthrough);
    console.log('\n  WebSocket PASSTHROUGH mode enabled');
    console.log('  Forwarding to: wss://orchids-server.calmstone-6964e08a.westeurope.azurecontainerapps.io');
} else {
    wss.on('connection', createOrchidsWSHandler);
    console.log('\n  WebSocket server listening on /agent/ws (local mode)');
}
console.log('  Orchids CLI can connect at: ws://localhost:' + PORT + '/agent/ws\n');
