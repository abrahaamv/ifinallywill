# Priority 3: AI Chat with RAG - Testing Guide

## Overview

This guide covers testing the AI chat feature with cost-optimized routing and RAG (Retrieval Augmented Generation) integration.

## Prerequisites

1. **Complete Priority 2**: Upload at least one document to the knowledge base
2. **API Keys Configured** in `.env`:
   - `OPENAI_API_KEY` - OpenAI API key (required)
   - `ANTHROPIC_API_KEY` - Anthropic API key (fallback)
   - `GOOGLE_API_KEY` - Google AI key (fallback)
   - `VOYAGE_API_KEY` - Voyage AI embeddings (required for RAG)
3. **Dev servers running**: `pnpm dev` (all services)
4. **Test document uploaded**: Use the test document from Priority 2

## Test Steps

### Step 1: Access Chat Page

Navigate to: **http://localhost:5174/chat**

### Step 2: Start Conversation

**Sample Questions** (based on test document):
- "What is the Enterprise AI Assistant Platform?"
- "Tell me about the technology stack"
- "What are the performance optimizations?"
- "What security features does it have?"

**Expected Behavior**:
1. Session automatically created on page load
2. Type message and click Send
3. AI processes message with RAG retrieval:
   - Searches knowledge base for relevant chunks
   - Builds enhanced prompt with context
   - Routes to cost-optimized AI provider (gpt-4o-mini or claude-3-5-sonnet)
   - Returns response with metadata
4. Assistant response appears with:
   - AI-generated answer based on your knowledge base
   - Model used
   - Tokens used and cost
   - Response latency
   - RAG metadata (chunks, processing time, relevance)

### Step 3: Verify RAG Integration

Look for RAG indicators in response metadata:
- **📚 RAG: X chunks** - Number of knowledge chunks retrieved
- **⚡ Xms** - RAG processing time
- **🎯 high/medium/low relevance** - Top chunk relevance score

**Example Output**:
```
User: What is the Enterprise AI Assistant Platform?