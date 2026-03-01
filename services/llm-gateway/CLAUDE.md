# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LLM Gateway** is a multi-provider LLM gateway that exposes both **Anthropic Messages API** (`/v1/messages`) and **OpenAI Chat Completions API** (`/v1/chat/completions`), backed by pluggable providers (Aura/Supabase, tldraw, OCR Arena).

Any model works on any endpoint:
- `/v1/messages` emits proper Anthropic `tool_use` blocks even for GPT/Gemini models
- `/v1/chat/completions` emits proper OpenAI `function` tool calls even for Claude models

Designed for use with Claude Code, Auto Claude, MUX, OpenCode, and custom CLI tools.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (auto-reload with tsx)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Note:** There is currently no test suite (`npm test` will fail).

## Environment Configuration

Key environment variables in `.env`:

- `PROVIDER`: Selects the backend provider. Options: `aura` (Supabase), `tldraw`, `ocrarena`.
- `PORT`: Server port (default: 8080).
- `MODEL_OVERRIDE`: Force a specific model ID for all requests, ignoring client selection.

**Provider Requirements:**
- **aura**: Requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `USER_TOKEN`.
- **tldraw**: Uses `TLDRAW_AGENT_URL` (default provided).
- **ocrarena**: Uses `OCRARENA_API_URL` (default provided).

## Architecture

### Core Flow

```
Client Request (Anthropic or OpenAI format)
           ↓
   Route Handler (/v1/messages or /v1/chat/completions)
           ↓
   [OpenAI → Anthropic conversion if /completions]
           ↓
   Provider.fetchCompletion(request) → raw text
           ↓
   Tool parsing + retry logic (shared)
           ↓
   Response Emitter (Anthropic SSE/JSON or OpenAI SSE/JSON)
           ↓
   Client Response
```

### Key Directories

- **`src/providers/`** — Provider interface and implementations
  - `base.ts` — `LLMProvider` interface
  - `aura.ts` — Supabase Edge Functions (tool calling, parallel execution, auth retry)
  - `tldraw.ts` — tldraw agent endpoint (text-only mode, fsociety kernel prompt)
  - `ocrarena.ts` — OCR Arena (vision models, 20+ model support)
  - `index.ts` — Provider registry (factory based on `PROVIDER` env var)

- **`src/formats/`** — Response emitters and format converters
  - `anthropic.ts` — Anthropic SSE/JSON emitters (tool_use blocks, thinking blocks)
  - `openai.ts` — OpenAI SSE/JSON emitters (function tool calls)
  - `converters.ts` — OpenAI ↔ Anthropic request conversion

- **`src/routes/`** — Thin HTTP handlers
  - `messages.ts` — `/v1/messages` (Anthropic Messages API)
  - `chat-completions.ts` — `/v1/chat/completions` (OpenAI Chat Completions API)
  - `health.ts`, `models.ts` — Health check & model listing

- **`src/transform/`** — Provider-specific request/response transforms
  - `anthropic-to-supabase.ts` — Request transform + model mapping for Aura
  - `supabase-to-anthropic.ts` — Tool call parser (7+ formats) + SSE event creators
  - `anthropic-to-ocrarena.ts` — Request transform for OCR Arena
  - `ocrarena-parser.ts` / `ocrarena-collector.ts` — OCR Arena SSE parsing
  - `tldraw-parser.ts` — tldraw action parsing
  - `compact-messages.ts` — Two-phase context compaction: (1) truncate oversized `tool_result` (2) drop middle messages keeping first 2 + most recent. Called automatically by all providers.

- **`src/services/`** — Auth & provider config
- **`src/types/`** — TypeScript type definitions

### Provider Details

1. **Aura (Supabase)** — Primary provider with full tool calling + parallel execution + auto-retry for non-Claude models that narrate instead of calling tools.

2. **tldraw** — Text-only LLM mode via tldraw's agent endpoint. Uses fsociety kernel prompt for tool compliance.

3. **OCR Arena** — Vision/OCR specialist. 20+ models with UUID-based IDs.

## Implementation Notes

- **Tool IDs**: Tool calls get unique IDs (`toolu_[5-char]`) if missing.
- **Parallel Tools**: Aura supports multiple independent tools per turn.
- **Non-Claude Retry**: GPT/Gemini models get up to 2 correction retries when they narrate instead of emitting tool call JSON.
- **Model Mapping**: Friendly names → internal IDs per provider. Aura upgrades legacy Claude 3.x names to latest equivalents.
- **Error Handling**: Errors are emitted in the stream (SSE) so clients don't hang.
- **Context Compaction**: `compactMessages()` runs automatically inside each provider's `fetchCompletion`. Aura's budget is 160K tokens (leaving headroom in its 200K limit); tldraw and OCR Arena use 100K.
- **Token Counting**: `POST /v1/messages/count_tokens` estimates tokens as `ceil(chars / 4)` — used by Claude Code before submitting requests.
- **Tool Prompt Injection**: For Aura, tool schemas and few-shot JSON examples are injected into the `instruction` field (system prompt equivalent). The `prompt` field carries history as `Human:`/`Assistant:` turns.

## Style & Conventions

- **Language**: TypeScript (ES2022).
- **Imports**: Use `.js` extension for local imports (ESM requirement).
- **Streaming**: All major endpoints support Server-Sent Events (SSE).
- **Providers**: All provider logic lives in `src/providers/`. Route handlers are thin.
- **Formats**: All response formatting lives in `src/formats/`. No SSE logic in routes.
