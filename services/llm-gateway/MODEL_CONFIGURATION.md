# OCR Arena Model Configuration 🎯

## Overview

All OCR Arena models have been configured and optimized for code-related tasks. Models are organized by provider and quality, with automatic fallback to the best model (claude-opus-4-6).

---

## Model List (Ordered by Coding Quality)

### 🏆 Tier 1: Anthropic Models (Best for Code)

| Model ID | Display Name | Reasoning | Verbosity | Best For |
|----------|--------------|-----------|-----------|----------|
| `claude-opus-4-6` | Claude Opus 4.6 | high | high | **Best overall for code** |
| `claude-opus-4-5` | Claude Opus 4.5 | high | high | Excellent all-around |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 | high | high | Fast & capable |

**Configuration:**
```typescript
{
  reasoning: 'high',
  verbosity: 'high',
  // Optimized for detailed code analysis and generation
}
```

---

### 🥈 Tier 2: Gemini Models

| Model ID | Display Name | Reasoning | Image Detail | Verbosity |
|----------|--------------|-----------|--------------|-----------|
| `gemini-3-pro-preview` | Gemini 3 Pro Preview | high | auto | high |
| `gemini-2.5-pro` | Gemini 2.5 Pro | high | auto | high |
| `gemini-2.5-flash` | Gemini 2.5 Flash | medium | auto | medium |
| `gemini-3-flash` | Gemini 3 Flash | medium | auto | medium |

**Configuration:**
```typescript
{
  reasoning: 'high' | 'medium',
  imageDetail: 'auto',
  verbosity: 'high' | 'medium',
}
```

---

### 🥉 Tier 3: GPT Models

| Model ID | Display Name | Reasoning | Verbosity |
|----------|--------------|-----------|-----------|
| `gpt-5.2` | GPT-5.2 (Medium) | medium | high |
| `gpt-5.1` | GPT-5.1 | medium | high |
| `gpt-5` | GPT-5 | medium | high |

**Configuration:**
```typescript
{
  reasoning: 'medium',
  verbosity: 'high',
  // Note: gpt-5.2 can also use 'none' reasoning, but we default to 'medium'
}
```

---

### 📊 Tier 4: Specialized Models (OCR-focused)

These models are optimized for OCR and vision tasks but less ideal for pure coding:

| Model ID | Display Name | Use Case |
|----------|--------------|----------|
| `qwen3-vl-235b` | Qwen3-VL-235B | Vision + OCR (large) |
| `qwen3-vl-8b` | Qwen3-VL-8B | Vision + OCR (small) |
| `deepseek-ocr` | DeepSeek OCR | Document OCR |
| `glm-ocr` | GLM-OCR | Chinese OCR |
| `iris` | Iris | General OCR |
| `mistral-ocr-v3` | Mistral OCR v3 | Document parsing |
| `olmocr-2` | olmOCR 2 | Open source OCR |
| `dots-ocr` | dots.ocr | Specialized OCR |
| `nanonets2-3b` | Nanonets2-3B | Small OCR model |
| `nemotron-parse` | Nemotron Parse | Document parsing |

**Configuration:**
```typescript
{
  reasoning: 'medium',
  imageDetail: 'auto', // For vision models
}
```

---

## Model ID Mapping

Internal UUIDs are automatically mapped from friendly names:

```typescript
// User specifies in .env:
MODEL_OVERRIDE=claude-opus-4-6

// Proxy automatically maps to:
modelId: '4fa4c408-bc59-4474-8d7d-9477197e2464'
```

**Complete Mapping:**
```typescript
{
  'claude-opus-4-6': '4fa4c408-bc59-4474-8d7d-9477197e2464',
  'claude-opus-4-5': '8fe3fe3d-4383-464e-a34d-ce203bce2cc1',
  'claude-sonnet-4-5': 'b9b87dc3-f71b-4fb1-a3d7-d964bee84426',
  'gemini-3-pro-preview': 'b4aa4e4c-47fa-4bf8-8401-7b09135c73ff',
  'gemini-2.5-pro': 'de4f0d30-5958-40a9-a8b5-554e8fa60851',
  'gemini-2.5-flash': 'e9d2c517-39cb-4745-8b49-442c9fc0436f',
  'gemini-3-flash': '40c6c841-f041-49fc-b77b-635d361d8e68',
  'gpt-5.2': 'c7bd3454-975a-4054-aeb3-dd8c7b2cc6a4',
  'gpt-5.1': '1dab83e3-add6-41c8-aab9-1cbfa9b16312',
  'gpt-5': '5b3d5828-fc03-4e82-a10c-28c4416f1dbd',
  'qwen3-vl-235b': '171afc89-53ff-43cf-a928-b77c9bbe3f3f',
  'qwen3-vl-8b': '63c2acdf-5d77-48af-a8db-d57d0c6c5b2a',
  'deepseek-ocr': '0f4262e8-6b45-4393-ad2a-d5885fd02282',
  'glm-ocr': '0ff94598-c725-40eb-a88c-7917eaf3a4d9',
  'iris': '6146d953-354a-4430-84a4-1f667ecfa5a8',
  'mistral-ocr-v3': '15c23e32-256f-405d-b801-21a6ecb9d5b5',
  'olmocr-2': '2c6269cc-c1ff-48c0-9f2b-861d72aabd71',
  'dots-ocr': '783714e7-2989-4a22-ad58-ac90d6c7c42c',
  'nanonets2-3b': '2721cd0e-fa9a-4418-84c9-a0ad0043f24c',
  'nemotron-parse': 'c8d4e5f6-7890-4abc-8ef1-234567890abc',
}
```

---

## Configuration Examples

### 1. Best for General Coding

```bash
PROVIDER=ocrarena
MODEL_OVERRIDE=claude-opus-4-6
```

**Why:** Highest quality code generation, best reasoning, detailed explanations.

---

### 2. Fast Coding (Good Balance)

```bash
PROVIDER=ocrarena
MODEL_OVERRIDE=claude-sonnet-4-5
```

**Why:** Fast responses while maintaining high quality.

---

### 3. Cost-Effective Coding

```bash
PROVIDER=ocrarena
MODEL_OVERRIDE=gemini-2.5-flash
```

**Why:** Good quality at faster speed/lower cost.

---

### 4. Vision + OCR Tasks

```bash
PROVIDER=ocrarena
MODEL_OVERRIDE=qwen3-vl-235b
```

**Why:** Specialized for image and document processing.

---

### 5. Auto Model Selection

```bash
PROVIDER=ocrarena
MODEL_OVERRIDE=
```

**Why:** Let Claude Code choose the model (will default to claude-opus-4-6 if unknown).

---

## Smart Model Fallback

The proxy includes intelligent model matching:

```typescript
// Exact match
'claude-opus-4-6' → claude-opus-4-6

// Case-insensitive
'CLAUDE-OPUS-4-6' → claude-opus-4-6

// Partial match - Opus
'claude-opus-4.6' → claude-opus-4-6
'opus-4.6' → claude-opus-4-6
'opus' → claude-opus-4-5

// Partial match - Sonnet
'sonnet' → claude-sonnet-4-5
'claude-sonnet' → claude-sonnet-4-5

// Partial match - Gemini
'gemini-pro' → gemini-2.5-pro
'gemini-flash' → gemini-2.5-flash

// Partial match - GPT
'gpt-5.2' → gpt-5.2
'gpt-5' → gpt-5

// Unknown model
'unknown-model' → claude-opus-4-6 (best default)
```

---

## Settings Optimization

All models are configured with optimal settings for coding:

### High-Quality Models (Anthropic, Gemini Pro)
```typescript
{
  reasoning: 'high',      // Maximum reasoning depth
  verbosity: 'high',      // Detailed explanations
  temperature: 0.1,       // Consistent output
}
```

### Balanced Models (Gemini Flash, GPT)
```typescript
{
  reasoning: 'medium',    // Good reasoning
  verbosity: 'high',      // Still detailed
  temperature: 0.1,       // Consistent
}
```

### OCR Models
```typescript
{
  reasoning: 'medium',    // OCR-focused
  imageDetail: 'auto',    // Automatic image processing
  temperature: 0.1,       // Consistent
}
```

---

## Usage in Code

### Environment Variable
```bash
# In .env
MODEL_OVERRIDE=claude-opus-4-6
```

### Logging
```
[OCR Arena] Using model: claude-opus-4-6 → 4fa4c408-bc59-4474-8d7d-9477197e2464 
(reasoning: high, verbosity: high)
```

### API Request
```typescript
{
  imageUrls: ['data:image/png;base64,...'],
  modelId: '4fa4c408-bc59-4474-8d7d-9477197e2464',
  settings: {
    reasoning: 'high',
    temperature: 0.1,
    prompt: '...',
    verbosity: 'high'
  }
}
```

---

## Available via `/v1/models` Endpoint

All models are listed when querying:

```bash
curl http://localhost:11436/v1/models
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "claude-opus-4-6",
      "object": "model",
      "created": 1738368000,
      "owned_by": "anthropic"
    },
    {
      "id": "claude-opus-4-5",
      "object": "model",
      "created": 1730419200,
      "owned_by": "anthropic"
    },
    // ... all 20 models
  ]
}
```

---

## Model Selection Matrix

| Task Type | Recommended Model | Alternative |
|-----------|-------------------|-------------|
| Complex code generation | `claude-opus-4-6` | `claude-opus-4-5` |
| Fast code edits | `claude-sonnet-4-5` | `gemini-2.5-flash` |
| Code review | `claude-opus-4-6` | `gemini-3-pro-preview` |
| Simple scripts | `gemini-2.5-flash` | `gpt-5.2` |
| Documentation parsing | `claude-opus-4-6` | `qwen3-vl-235b` |
| Image → Code | `qwen3-vl-235b` | `gemini-3-pro-preview` |
| OCR documents | `qwen3-vl-235b` | `deepseek-ocr` |

---

## Performance Characteristics

### Response Time (Approximate)

| Tier | Model Example | Typical Response |
|------|---------------|------------------|
| 1 | claude-opus-4-6 | 5-10 seconds |
| 1 | claude-sonnet-4-5 | 2-5 seconds |
| 2 | gemini-2.5-flash | 1-3 seconds |
| 3 | gpt-5.2 | 3-7 seconds |
| 4 | qwen3-vl-235b | 10-30 seconds |

*Times vary based on prompt complexity and server load*

---

## Migration Guide

### From Old Configuration

**Before:**
```bash
PROVIDER=ocrarena
OCRARENA_MODEL_ID=4fa4c408-bc59-4474-8d7d-9477197e2464
```

**After:**
```bash
PROVIDER=ocrarena
MODEL_OVERRIDE=claude-opus-4-6
```

**Benefits:**
- ✅ Human-readable model names
- ✅ No need to remember UUIDs
- ✅ Automatic configuration optimization
- ✅ Smart fallback handling

---

## Testing Models

### Quick Test Script

```bash
#!/bin/bash

# Test each model
for model in claude-opus-4-6 gemini-2.5-flash gpt-5.2; do
  echo "Testing $model..."
  MODEL_OVERRIDE=$model npm start &
  sleep 5
  curl -X POST http://localhost:11436/v1/messages \
    -H "Content-Type: application/json" \
    -d '{"model":"'$model'","messages":[{"role":"user","content":"Hello"}],"max_tokens":100}'
  pkill -f "npm start"
  echo ""
done
```

---

## Troubleshooting

### Model Not Found

**Issue:**
```
[OCR Arena] Unknown model "my-model", defaulting to claude-opus-4-6
```

**Solution:**
Check the model name against the available models list. Use exact model IDs.

### Wrong Settings Applied

**Issue:** Model using `medium` reasoning instead of `high`.

**Solution:** Check the model tier - only Tier 1 (Anthropic) and Tier 2 Pro models use `high` reasoning.

### UUID in Logs

**Expected Behavior:**
```
[OCR Arena] Using model: claude-opus-4-6 → 4fa4c408-bc59-4474-8d7d-9477197e2464
```

This is normal - the UUID is the actual model identifier sent to OCR Arena API.

---

## Summary

✅ **20 models configured** - All OCR Arena models available  
✅ **Smart ordering** - Best for code listed first  
✅ **Optimized settings** - High reasoning/verbosity for quality  
✅ **Automatic mapping** - Friendly names → UUIDs  
✅ **Fallback logic** - Always defaults to best model  
✅ **Comprehensive docs** - .env.example with full guide  

**Default Recommendation:** `claude-opus-4-6` for best coding results! 🚀

---

**Last Updated:** February 13, 2026  
**Configuration Version:** 2.0
