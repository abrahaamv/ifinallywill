# AI Services Integration - Complete Implementation Guide

## 🎯 AI Architecture Philosophy

**Principles**:
1. **Cost-optimized intelligence** - Route to cheapest capable model
2. **Latency-first** - Sub-800ms voice round-trip target
3. **Graceful degradation** - Fallback chains for every service
4. **Provider abstraction** - Swap providers without code changes
5. **Observable by default** - Track every token and dollar spent

**Cost Optimization Strategy**:
- **Vision**: 85% Gemini Flash ($0.10/1M tokens) → 15% Claude Sonnet ($3/1M tokens)
- **Voice LLM**: 70% GPT-4o-mini ($0.15/1M tokens) → 30% GPT-4o ($2.50/1M tokens)
- **Embeddings**: Voyage Multimodal-3 ($0.10/1M tokens) - unified text+image
- **Frame Selection**: 95% frames skipped via motion detection (edge, 0 cost)

---

## 🏗️ Provider Abstraction Layer

### Base Provider Interface

```typescript
// packages/ai-core/src/providers/base.ts
export interface AIProvider {
  name: string;
  vision: VisionProvider;
  llm: LLMProvider;
  embeddings: EmbeddingsProvider;
}

export interface VisionProvider {
  analyzeImage(params: {
    image: Buffer | string; // Buffer or base64
    prompt: string;
    maxTokens?: number;
  }): Promise<VisionResponse>;
}

export interface LLMProvider {
  generateText(params: {
    messages: Message[];
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<LLMResponse | AsyncIterable<LLMChunk>>;
}

export interface EmbeddingsProvider {
  createEmbedding(params: {
    input: string | string[];
    dimensions?: number;
  }): Promise<EmbeddingResponse>;
}

export interface VisionResponse {
  content: string;
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
  confidence?: number;
}

export interface LLMResponse {
  content: string;
  tokensUsed: { prompt: number; completion: number };
  costUsd: number;
  latencyMs: number;
}

export interface LLMChunk {
  content: string;
  done: boolean;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  tokensUsed: number;
  costUsd: number;
  dimensions: number;
}

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
```

### OpenAI Provider Implementation

```typescript
// packages/ai-core/src/providers/openai.ts
import OpenAI from 'openai';
import type { AIProvider, VisionProvider, LLMProvider } from './base';

export class OpenAIProvider implements Partial<AIProvider> {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  llm: LLMProvider = {
    generateText: async (params) => {
      const start = performance.now();

      if (params.stream) {
        return this.streamText(params);
      }

      const response = await this.client.chat.completions.create({
        model: params.model || 'gpt-4o-mini',
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature ?? 0.7,
      });

      const latencyMs = performance.now() - start;

      return {
        content: response.choices[0].message.content!,
        tokensUsed: {
          prompt: response.usage!.prompt_tokens,
          completion: response.usage!.completion_tokens,
        },
        costUsd: this.calculateCost(
          params.model || 'gpt-4o-mini',
          response.usage!.prompt_tokens,
          response.usage!.completion_tokens
        ),
        latencyMs,
      };
    },
  };

  private async *streamText(params: any): AsyncIterable<LLMChunk> {
    const stream = await this.client.chat.completions.create({
      model: params.model || 'gpt-4o-mini',
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason !== null;

      yield { content, done };
    }
  }

  vision: VisionProvider = {
    analyzeImage: async (params) => {
      const start = performance.now();

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: params.prompt },
              {
                type: 'image_url',
                image_url: {
                  url:
                    typeof params.image === 'string'
                      ? params.image
                      : `data:image/jpeg;base64,${params.image.toString('base64')}`,
                },
              },
            ],
          },
        ],
        max_tokens: params.maxTokens || 500,
      });

      const latencyMs = performance.now() - start;

      return {
        content: response.choices[0].message.content!,
        tokensUsed: response.usage!.total_tokens,
        costUsd: this.calculateVisionCost(response.usage!.total_tokens),
        latencyMs,
      };
    },
  };

  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4o': { prompt: 2.5, completion: 10 },
      'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
    };

    const rate = pricing[model] || pricing['gpt-4o-mini'];

    return (
      (promptTokens * rate.prompt + completionTokens * rate.completion) /
      1_000_000
    );
  }

  private calculateVisionCost(tokens: number): number {
    return (tokens * 2.5) / 1_000_000;
  }
}
```

### Anthropic Provider Implementation

```typescript
// packages/ai-core/src/providers/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, VisionProvider, LLMProvider } from './base';

export class AnthropicProvider implements Partial<AIProvider> {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  vision: VisionProvider = {
    analyzeImage: async (params) => {
      const start = performance.now();

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: params.maxTokens || 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data:
                    typeof params.image === 'string'
                      ? params.image
                      : params.image.toString('base64'),
                },
              },
              {
                type: 'text',
                text: params.prompt,
              },
            ],
          },
        ],
      });

      const latencyMs = performance.now() - start;

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        costUsd: this.calculateCost(
          response.usage.input_tokens,
          response.usage.output_tokens
        ),
        latencyMs,
        confidence: 0.95, // Claude is used for complex cases
      };
    },
  };

  llm: LLMProvider = {
    generateText: async (params) => {
      const start = performance.now();

      if (params.stream) {
        return this.streamText(params);
      }

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature ?? 0.7,
        messages: params.messages.map((msg) => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content,
        })),
      });

      const latencyMs = performance.now() - start;

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        tokensUsed: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
        },
        costUsd: this.calculateCost(
          response.usage.input_tokens,
          response.usage.output_tokens
        ),
        latencyMs,
      };
    },
  };

  private async *streamText(params: any): AsyncIterable<any> {
    const stream = await this.client.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: params.maxTokens || 1000,
      temperature: params.temperature ?? 0.7,
      messages: params.messages.map((msg: any) => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield {
          content: event.delta.text,
          done: false,
        };
      }

      if (event.type === 'message_stop') {
        yield {
          content: '',
          done: true,
        };
      }
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude 3.5 Sonnet: $3 per 1M input, $15 per 1M output
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
}
```

### Gemini Provider Implementation

```typescript
// packages/ai-core/src/providers/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VisionProvider } from './base';

export class GeminiProvider implements Partial<AIProvider> {
  name = 'gemini';
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  vision: VisionProvider = {
    analyzeImage: async (params) => {
      const start = performance.now();

      const model = this.client.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
      });

      const response = await model.generateContent([
        params.prompt,
        {
          inlineData: {
            data:
              typeof params.image === 'string'
                ? params.image
                : params.image.toString('base64'),
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const latencyMs = performance.now() - start;

      // Gemini token counting is approximate
      const estimatedTokens = Math.ceil(params.prompt.length / 4) + 500;

      return {
        content: response.response.text(),
        tokensUsed: estimatedTokens,
        costUsd: (estimatedTokens * 0.1) / 1_000_000,
        latencyMs,
        confidence: 0.85, // Good for routine tasks
      };
    },
  };
}
```

---

## 🧠 Smart Vision Analysis

### Frame Selection Algorithm

```typescript
// packages/vision/src/frame-selector.ts
export class FrameSelector {
  private lastFrame: Buffer | null = null;
  private lastFrameHash: string | null = null;
  private framesSinceAnalysis = 0;

  shouldAnalyzeFrame(frame: Buffer): boolean {
    // Always analyze first frame
    if (!this.lastFrame) {
      this.lastFrame = frame;
      this.lastFrameHash = this.hashFrame(frame);
      return true;
    }

    // Force analysis every 10 seconds (10 FPS = 100 frames)
    this.framesSinceAnalysis++;
    if (this.framesSinceAnalysis > 100) {
      this.framesSinceAnalysis = 0;
      this.lastFrame = frame;
      this.lastFrameHash = this.hashFrame(frame);
      return true;
    }

    // Check for significant change
    const currentHash = this.hashFrame(frame);
    const similarity = this.comparehashes(this.lastFrameHash!, currentHash);

    // If <95% similar, analyze
    if (similarity < 0.95) {
      this.lastFrame = frame;
      this.lastFrameHash = currentHash;
      this.framesSinceAnalysis = 0;
      return true;
    }

    return false;
  }

  private hashFrame(frame: Buffer): string {
    // Simple perceptual hash (use sharp or jimp in production)
    const crypto = require('crypto');
    return crypto.createHash('md5').update(frame).digest('hex');
  }

  private compareHashes(hash1: string, hash2: string): number {
    // Hamming distance for perceptual hashes
    let same = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) same++;
    }
    return same / hash1.length;
  }
}
```

### Vision Analysis Router

```typescript
// packages/vision/src/analyzer.ts
import type { VisionResponse } from '@platform/ai-core/providers/base';
import { GeminiProvider } from '@platform/ai-core/providers/gemini';
import { AnthropicProvider } from '@platform/ai-core/providers/anthropic';

export class VisionAnalyzer {
  private gemini: GeminiProvider;
  private claude: AnthropicProvider;
  private complexityThreshold = 0.7;

  constructor(config: { geminiKey: string; anthropicKey: string }) {
    this.gemini = new GeminiProvider(config.geminiKey);
    this.claude = new AnthropicProvider(config.anthropicKey);
  }

  async analyzeScreen(params: {
    frame: Buffer;
    userQuery: string;
    context?: string;
  }): Promise<VisionResponse> {
    const complexity = this.assessComplexity(params.userQuery);

    // Route to appropriate model
    if (complexity < this.complexityThreshold) {
      // Routine analysis: Gemini Flash (85% of cases)
      return this.gemini.vision.analyzeImage({
        image: params.frame,
        prompt: this.buildPrompt(params),
        maxTokens: 300,
      });
    } else {
      // Complex analysis: Claude Sonnet (15% of cases)
      return this.claude.vision.analyzeImage({
        image: params.frame,
        prompt: this.buildPrompt(params),
        maxTokens: 500,
      });
    }
  }

  private assessComplexity(query: string): number {
    let score = 0.5; // Base score

    // Multi-step indicators
    if (query.match(/then|after|next|following|step/i)) score += 0.2;

    // Comparison indicators
    if (query.match(/compare|versus|difference|better/i)) score += 0.15;

    // Troubleshooting indicators
    if (query.match(/why|how|explain|understand|debug/i)) score += 0.1;

    // Edge case indicators
    if (query.match(/error|issue|problem|not working|failed/i)) score += 0.15;

    return Math.min(score, 1.0);
  }

  private buildPrompt(params: {
    userQuery: string;
    context?: string;
  }): string {
    return `You are a helpful AI assistant analyzing a user's screen to provide guidance.

User's question: ${params.userQuery}

${params.context ? `Previous context: ${params.context}` : ''}

Analyze the screenshot and provide:
1. What you see on the screen (UI elements, current state)
2. Step-by-step guidance to answer the user's question
3. Specific button/field locations if relevant

Be concise, specific, and helpful.`;
  }
}
```

---

## 🎤 Voice Pipeline

### Speech-to-Text (Deepgram)

```typescript
// packages/voice/src/deepgram.ts
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export class DeepgramSTT {
  private client: any;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  async transcribeStream(
    audioStream: ReadableStream<Uint8Array>,
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const connection = this.client.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('[Deepgram] Connection opened');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel.alternatives[0].transcript;
      const isFinal = data.is_final;

      if (transcript && transcript.length > 0) {
        onTranscript(transcript, isFinal);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      onError(new Error(error.message));
    });

    // Pipe audio stream
    const reader = audioStream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        connection.send(value);
      }
    } finally {
      connection.finish();
    }
  }

  async transcribeFile(audioBuffer: Buffer): Promise<{
    transcript: string;
    confidence: number;
    duration: number;
  }> {
    const { result } = await this.client.listen.prerecorded.transcribeFile(audioBuffer, {
      model: 'nova-2',
      smart_format: true,
    });

    const channel = result.results.channels[0];
    const alternative = channel.alternatives[0];

    return {
      transcript: alternative.transcript,
      confidence: alternative.confidence,
      duration: result.metadata.duration,
    };
  }
}
```

### Text-to-Speech (ElevenLabs)

```typescript
// packages/voice/src/elevenlabs.ts
import { ElevenLabsClient } from 'elevenlabs';

export class ElevenLabsTTS {
  private client: ElevenLabsClient;
  private voiceId: string;

  constructor(config: { apiKey: string; voiceId?: string }) {
    this.client = new ElevenLabsClient({ apiKey: config.apiKey });
    this.voiceId = config.voiceId || 'ErXwobaYiN019PkySvjV'; // Default voice
  }

  async synthesize(text: string): Promise<Buffer> {
    const audio = await this.client.generate({
      voice: this.voiceId,
      text,
      model_id: 'eleven_turbo_v2_5',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async *synthesizeStream(text: string): AsyncIterable<Buffer> {
    const audio = await this.client.generate({
      voice: this.voiceId,
      text,
      model_id: 'eleven_turbo_v2_5',
      stream: true,
    });

    for await (const chunk of audio) {
      yield Buffer.from(chunk);
    }
  }
}
```

### Voice Pipeline Orchestrator

```typescript
// packages/voice/src/pipeline.ts
import { DeepgramSTT } from './deepgram';
import { ElevenLabsTTS } from './elevenlabs';
import { OpenAIProvider } from '@platform/ai-core/providers/openai';

export class VoicePipeline {
  private stt: DeepgramSTT;
  private tts: ElevenLabsTTS;
  private llm: OpenAIProvider;

  constructor(config: {
    deepgramKey: string;
    elevenlabsKey: string;
    openaiKey: string;
  }) {
    this.stt = new DeepgramSTT(config.deepgramKey);
    this.tts = new ElevenLabsTTS({ apiKey: config.elevenlabsKey });
    this.llm = new OpenAIProvider(config.openaiKey);
  }

  async processVoiceQuery(params: {
    audioStream: ReadableStream<Uint8Array>;
    conversationHistory: Message[];
    context?: string;
  }): Promise<{
    transcript: string;
    response: string;
    audioResponse: Buffer;
    latency: { stt: number; llm: number; tts: number; total: number };
  }> {
    const startTime = performance.now();

    // Step 1: Speech-to-Text
    const sttStart = performance.now();
    let transcript = '';

    await this.stt.transcribeStream(
      params.audioStream,
      (text, isFinal) => {
        if (isFinal) {
          transcript = text;
        }
      },
      (error) => {
        throw error;
      }
    );

    const sttLatency = performance.now() - sttStart;

    // Step 2: LLM Processing
    const llmStart = performance.now();

    const messages = [
      ...params.conversationHistory,
      { role: 'user' as const, content: transcript },
    ];

    if (params.context) {
      messages.unshift({
        role: 'system' as const,
        content: `Context: ${params.context}`,
      });
    }

    const llmResponse = await this.llm.llm.generateText({
      messages,
      maxTokens: 150,
      temperature: 0.7,
    });

    const llmLatency = performance.now() - llmStart;

    // Step 3: Text-to-Speech
    const ttsStart = performance.now();

    const audioResponse = await this.tts.synthesize(llmResponse.content);

    const ttsLatency = performance.now() - ttsStart;

    const totalLatency = performance.now() - startTime;

    return {
      transcript,
      response: llmResponse.content,
      audioResponse,
      latency: {
        stt: sttLatency,
        llm: llmLatency,
        tts: ttsLatency,
        total: totalLatency,
      },
    };
  }
}
```

---

## 📚 RAG System Implementation

### Embeddings Generation

```typescript
// packages/rag/src/embeddings.ts
import { VoyageAIClient } from 'voyageai';

export class EmbeddingsService {
  private client: VoyageAIClient;

  constructor(apiKey: string) {
    this.client = new VoyageAIClient({ apiKey });
  }

  async embed(input: string | string[]): Promise<number[][]> {
    const response = await this.client.embed({
      input: Array.isArray(input) ? input : [input],
      model: 'voyage-multimodal-3',
    });

    return response.data.map((item) => item.embedding);
  }

  async embedDocument(content: string): Promise<number[]> {
    const [embedding] = await this.embed(content);
    return embedding;
  }
}
```

### Semantic Chunking

```typescript
// packages/rag/src/chunking.ts
export class SemanticChunker {
  private maxChunkSize = 500; // tokens
  private overlapSize = 50; // tokens

  chunkDocument(content: string): Array<{ content: string; position: number }> {
    // Split by natural boundaries
    const paragraphs = content.split(/\n\n+/);

    const chunks: Array<{ content: string; position: number }> = [];
    let currentChunk = '';
    let position = 0;

    for (const para of paragraphs) {
      const paraTokens = this.estimateTokens(para);

      if (
        this.estimateTokens(currentChunk) + paraTokens >
        this.maxChunkSize
      ) {
        // Current chunk is full, save it
        if (currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            position: position++,
          });

          // Add overlap from end of previous chunk
          const words = currentChunk.split(' ');
          currentChunk = words.slice(-this.overlapSize).join(' ') + '\n\n';
        }
      }

      currentChunk += para + '\n\n';
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        position: position++,
      });
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

### Advanced Semantic Chunking Algorithm

**Production-Grade Chunking with Metadata Preservation**

```typescript
// packages/rag/src/advanced-chunking.ts
export interface ChunkMetadata {
  documentId: string;
  position: number;
  totalChunks: number;
  headings: string[];
  documentType: 'text' | 'code' | 'markdown' | 'table' | 'list';
  startLine?: number;
  endLine?: number;
}

export interface DocumentChunk {
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export class AdvancedSemanticChunker {
  private readonly MAX_CHUNK_SIZE = 512; // tokens
  private readonly MIN_CHUNK_SIZE = 100; // tokens
  private readonly OVERLAP_SIZE = 50; // tokens
  private readonly HEADING_WEIGHT = 100; // bonus tokens for preserving headings

  /**
   * Main chunking entry point with document type detection
   */
  async chunkDocument(params: {
    content: string;
    documentId: string;
    documentType?: 'auto' | 'text' | 'code' | 'markdown' | 'table';
  }): Promise<DocumentChunk[]> {
    const detectedType = params.documentType === 'auto'
      ? this.detectDocumentType(params.content)
      : params.documentType || 'text';

    switch (detectedType) {
      case 'markdown':
        return this.chunkMarkdown(params.content, params.documentId);
      case 'code':
        return this.chunkCode(params.content, params.documentId);
      case 'table':
        return this.chunkTable(params.content, params.documentId);
      default:
        return this.chunkText(params.content, params.documentId);
    }
  }

  /**
   * Detect document type based on content patterns
   */
  private detectDocumentType(content: string): 'text' | 'code' | 'markdown' | 'table' {
    // Check for markdown headers
    if (/^#{1,6}\s+/m.test(content)) return 'markdown';

    // Check for code patterns (high ratio of special chars, indentation)
    const codeIndicators = (content.match(/[{}();[\]]/g) || []).length;
    const codeRatio = codeIndicators / content.length;
    if (codeRatio > 0.05) return 'code';

    // Check for table structures
    if (/\|.*\|.*\|/m.test(content) || /\t.*\t.*\t/m.test(content)) return 'table';

    return 'text';
  }

  /**
   * Markdown-aware chunking preserving heading hierarchy
   */
  private chunkMarkdown(content: string, documentId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = content.split('\n');

    let currentChunk = '';
    let currentHeadings: string[] = [];
    let position = 0;
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // Update heading hierarchy
        const level = headingMatch[1].length;
        const heading = headingMatch[2];
        currentHeadings = currentHeadings.slice(0, level - 1);
        currentHeadings.push(heading);

        // Check if we should start a new chunk (preserving heading context)
        const chunkTokens = this.estimateTokens(currentChunk);
        if (chunkTokens > this.MAX_CHUNK_SIZE - this.HEADING_WEIGHT) {
          if (currentChunk.trim()) {
            chunks.push(this.createChunk(
              currentChunk.trim(),
              documentId,
              position++,
              currentHeadings.slice(0, -1), // Previous headings
              'markdown',
              startLine,
              i - 1
            ));
          }
          currentChunk = '';
          startLine = i;
        }
      }

      currentChunk += line + '\n';

      // Also chunk on paragraph boundaries if getting large
      if (line === '' && this.estimateTokens(currentChunk) > this.MAX_CHUNK_SIZE) {
        chunks.push(this.createChunk(
          currentChunk.trim(),
          documentId,
          position++,
          currentHeadings,
          'markdown',
          startLine,
          i
        ));
        currentChunk = this.createOverlap(currentChunk);
        startLine = i;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        documentId,
        position++,
        currentHeadings,
        'markdown',
        startLine,
        lines.length - 1
      ));
    }

    return this.enrichChunksWithMetadata(chunks);
  }

  /**
   * Code-aware chunking preserving function/class boundaries
   */
  private chunkCode(content: string, documentId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = content.split('\n');

    let currentChunk = '';
    let position = 0;
    let startLine = 0;
    let braceDepth = 0;
    let currentFunction = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track brace depth for logical boundaries
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Detect function/class definitions
      const funcMatch = line.match(/(?:function|class|const|let|var)\s+(\w+)/);
      if (funcMatch) {
        currentFunction = funcMatch[1];
      }

      currentChunk += line + '\n';

      // Chunk at function boundaries when at depth 0 and chunk is large enough
      if (braceDepth === 0 &&
          this.estimateTokens(currentChunk) >= this.MIN_CHUNK_SIZE) {

        chunks.push(this.createChunk(
          currentChunk.trim(),
          documentId,
          position++,
          currentFunction ? [currentFunction] : [],
          'code',
          startLine,
          i
        ));

        currentChunk = '';
        startLine = i + 1;
        currentFunction = '';
      }

      // Force chunk if too large
      if (this.estimateTokens(currentChunk) > this.MAX_CHUNK_SIZE * 1.5) {
        chunks.push(this.createChunk(
          currentChunk.trim(),
          documentId,
          position++,
          currentFunction ? [currentFunction] : [],
          'code',
          startLine,
          i
        ));
        currentChunk = this.createOverlap(currentChunk);
        startLine = i;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        documentId,
        position++,
        currentFunction ? [currentFunction] : [],
        'code',
        startLine,
        lines.length - 1
      ));
    }

    return this.enrichChunksWithMetadata(chunks);
  }

  /**
   * Table-aware chunking preserving headers and structure
   */
  private chunkTable(content: string, documentId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    // Detect table type (markdown or CSV)
    const isMarkdown = /\|.*\|/.test(content);
    const lines = content.split('\n');

    let headerRows: string[] = [];
    let currentChunk = '';
    let position = 0;
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Capture table headers (first 1-2 rows)
      if (i < 2 && line.trim()) {
        headerRows.push(line);
        currentChunk += line + '\n';
        continue;
      }

      currentChunk += line + '\n';

      // Chunk when reaching size limit, but preserve header
      if (this.estimateTokens(currentChunk) > this.MAX_CHUNK_SIZE) {
        chunks.push(this.createChunk(
          currentChunk.trim(),
          documentId,
          position++,
          ['Table'],
          'table',
          startLine,
          i
        ));

        // Start new chunk with headers preserved
        currentChunk = headerRows.join('\n') + '\n';
        startLine = i;
      }
    }

    // Add final chunk
    if (currentChunk.trim() && currentChunk.trim() !== headerRows.join('\n').trim()) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        documentId,
        position++,
        ['Table'],
        'table',
        startLine,
        lines.length - 1
      ));
    }

    return this.enrichChunksWithMetadata(chunks);
  }

  /**
   * Text chunking with semantic boundary detection
   */
  private chunkText(content: string, documentId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    // Split on strong semantic boundaries (double newline, section markers)
    const sections = content.split(/\n\n+/);

    let currentChunk = '';
    let position = 0;

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section);
      const currentTokens = this.estimateTokens(currentChunk);

      // If adding this section exceeds max size, save current chunk
      if (currentTokens + sectionTokens > this.MAX_CHUNK_SIZE && currentChunk.trim()) {
        chunks.push(this.createChunk(
          currentChunk.trim(),
          documentId,
          position++,
          [],
          'text'
        ));

        currentChunk = this.createOverlap(currentChunk) + '\n\n';
      }

      // If single section is too large, split it further
      if (sectionTokens > this.MAX_CHUNK_SIZE) {
        const subChunks = this.splitLargeSection(section);
        for (const subChunk of subChunks) {
          chunks.push(this.createChunk(
            subChunk,
            documentId,
            position++,
            [],
            'text'
          ));
        }
      } else {
        currentChunk += section + '\n\n';
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        currentChunk.trim(),
        documentId,
        position++,
        [],
        'text'
      ));
    }

    return this.enrichChunksWithMetadata(chunks);
  }

  /**
   * Split large sections by sentence boundaries
   */
  private splitLargeSection(section: string): string[] {
    const sentences = section.match(/[^.!?]+[.!?]+/g) || [section];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (this.estimateTokens(currentChunk + sentence) > this.MAX_CHUNK_SIZE) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * Create smart overlap from end of previous chunk
   */
  private createOverlap(previousChunk: string): string {
    const sentences = previousChunk.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) return '';

    // Take last 1-2 sentences for context
    const overlapSentences = sentences.slice(-2);
    const overlap = overlapSentences.join('');

    // Ensure overlap doesn't exceed overlap size
    const words = overlap.split(/\s+/);
    return words.slice(-this.OVERLAP_SIZE).join(' ');
  }

  /**
   * Create chunk with metadata
   */
  private createChunk(
    content: string,
    documentId: string,
    position: number,
    headings: string[],
    documentType: 'text' | 'code' | 'markdown' | 'table' | 'list',
    startLine?: number,
    endLine?: number
  ): DocumentChunk {
    return {
      content,
      metadata: {
        documentId,
        position,
        totalChunks: 0, // Will be set in enrichment
        headings,
        documentType,
        startLine,
        endLine,
      },
    };
  }

  /**
   * Enrich chunks with total count and validate
   */
  private enrichChunksWithMetadata(chunks: DocumentChunk[]): DocumentChunk[] {
    const totalChunks = chunks.length;

    return chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        totalChunks,
      },
    }));
  }

  private estimateTokens(text: string): number {
    // More accurate token estimation
    // 1 token ≈ 0.75 words ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

**Usage Example:**

```typescript
// packages/rag/src/document-processor.ts
import { AdvancedSemanticChunker } from './advanced-chunking';
import { EmbeddingsService } from './embeddings';
import { db } from '@platform/database';
import * as schema from '@platform/database/schema';

export class DocumentProcessor {
  private chunker = new AdvancedSemanticChunker();
  private embeddings: EmbeddingsService;

  constructor(embeddingsApiKey: string) {
    this.embeddings = new EmbeddingsService(embeddingsApiKey);
  }

  async processDocument(params: {
    documentId: string;
    content: string;
    tenantId: string;
    title: string;
    category?: string;
  }): Promise<void> {
    // Chunk document with advanced algorithm
    const chunks = await this.chunker.chunkDocument({
      content: params.content,
      documentId: params.documentId,
      documentType: 'auto', // Auto-detect type
    });

    // Generate embeddings for all chunks in batch
    const contents = chunks.map((c) => c.content);
    const embeddings = await this.embeddings.embed(contents);

    // Store chunks with embeddings and metadata
    await db.transaction(async (tx) => {
      for (let i = 0; i < chunks.length; i++) {
        await tx.insert(schema.knowledgeChunks).values({
          documentId: params.documentId,
          content: chunks[i].content,
          embedding: embeddings[i],
          position: chunks[i].metadata.position,
          metadata: {
            headings: chunks[i].metadata.headings,
            documentType: chunks[i].metadata.documentType,
            startLine: chunks[i].metadata.startLine,
            endLine: chunks[i].metadata.endLine,
            totalChunks: chunks[i].metadata.totalChunks,
          },
        });
      }
    });
  }
}
```

### Hybrid Search Implementation

```typescript
// packages/rag/src/search.ts
import { db } from '@platform/database';
import { sql } from 'drizzle-orm';
import { EmbeddingsService } from './embeddings';

export class HybridSearch {
  private embeddings: EmbeddingsService;

  constructor(embeddingsApiKey: string) {
    this.embeddings = new EmbeddingsService(embeddingsApiKey);
  }

  async search(params: {
    query: string;
    tenantId: string;
    limit?: number;
    category?: string;
  }): Promise<
    Array<{
      id: string;
      title: string;
      content: string;
      score: number;
      category: string | null;
    }>
  > {
    const limit = params.limit || 10;

    // Generate query embedding
    const queryEmbedding = await this.embeddings.embedDocument(params.query);

    // Hybrid search with RRF (Reciprocal Rank Fusion)
    const results = await db.execute(sql`
      WITH vector_search AS (
        SELECT
          id,
          title,
          content,
          category,
          1 - (embedding <=> ${queryEmbedding}::vector) AS vector_score,
          ROW_NUMBER() OVER (ORDER BY embedding <=> ${queryEmbedding}::vector) AS vector_rank
        FROM knowledge_documents
        WHERE tenant_id = ${params.tenantId}
          ${params.category ? sql`AND category = ${params.category}` : sql``}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT 30
      ),
      keyword_search AS (
        SELECT
          id,
          title,
          content,
          category,
          ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${params.query})) AS keyword_score,
          ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${params.query})) DESC) AS keyword_rank
        FROM knowledge_documents
        WHERE tenant_id = ${params.tenantId}
          ${params.category ? sql`AND category = ${params.category}` : sql``}
          AND to_tsvector('english', content) @@ plainto_tsquery('english', ${params.query})
        ORDER BY keyword_score DESC
        LIMIT 30
      ),
      rrf_scores AS (
        SELECT
          COALESCE(v.id, k.id) AS id,
          COALESCE(v.title, k.title) AS title,
          COALESCE(v.content, k.content) AS content,
          COALESCE(v.category, k.category) AS category,
          (COALESCE(1.0 / (60 + v.vector_rank), 0.0) * 0.6 +
           COALESCE(1.0 / (60 + k.keyword_rank), 0.0) * 0.4) AS rrf_score
        FROM vector_search v
        FULL OUTER JOIN keyword_search k ON v.id = k.id
      )
      SELECT * FROM rrf_scores
      ORDER BY rrf_score DESC
      LIMIT ${limit}
    `);

    return results.rows as any;
  }
}
```

---

## 🔄 Cost Tracking & Optimization

### Usage Tracker

```typescript
// packages/ai-core/src/usage-tracker.ts
import { db } from '@platform/database';
import * as schema from '@platform/database/schema';

export class UsageTracker {
  async trackUsage(params: {
    tenantId: string;
    sessionId?: string;
    service: 'vision' | 'voice_stt' | 'voice_tts' | 'llm' | 'embedding' | 'livekit';
    provider: string;
    tokensUsed?: number;
    costUsd: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await db.insert(schema.costEvents).values({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      service: params.service,
      provider: params.provider,
      tokensUsed: params.tokensUsed,
      costUsd: params.costUsd.toString(),
      metadata: params.metadata,
    });
  }

  async getTenantCosts(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalCost: number;
    byService: Record<string, number>;
    byProvider: Record<string, number>;
  }> {
    const costs = await db.query.costEvents.findMany({
      where: (events, { eq, and, gte, lte }) =>
        and(
          eq(events.tenantId, params.tenantId),
          gte(events.timestamp, params.startDate),
          lte(events.timestamp, params.endDate)
        ),
    });

    const totalCost = costs.reduce(
      (sum, event) => sum + parseFloat(event.costUsd),
      0
    );

    const byService: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    for (const event of costs) {
      const cost = parseFloat(event.costUsd);

      byService[event.service] = (byService[event.service] || 0) + cost;
      byProvider[event.provider || 'unknown'] =
        (byProvider[event.provider || 'unknown'] || 0) + cost;
    }

    return { totalCost, byService, byProvider };
  }
}
```

---

## 🧪 Testing AI Services

### Mock Providers for Testing

```typescript
// packages/ai-core/src/providers/mock.ts
import type { AIProvider, VisionProvider, LLMProvider } from './base';

export class MockAIProvider implements Partial<AIProvider> {
  name = 'mock';

  vision: VisionProvider = {
    analyzeImage: async (params) => {
      // Simulate latency
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        content: `Mock vision analysis for: ${params.prompt}`,
        tokensUsed: 100,
        costUsd: 0.0001,
        latencyMs: 100,
        confidence: 0.9,
      };
    },
  };

  llm: LLMProvider = {
    generateText: async (params) => {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const lastMessage = params.messages[params.messages.length - 1];

      return {
        content: `Mock response to: ${lastMessage.content}`,
        tokensUsed: { prompt: 50, completion: 50 },
        costUsd: 0.0001,
        latencyMs: 200,
      };
    },
  };
}
```

---

## 📊 Prompt Engineering Best Practices

### System Prompts

```typescript
// packages/ai-core/src/prompts.ts
export const SYSTEM_PROMPTS = {
  visionAnalysis: `You are a helpful AI assistant analyzing a user's screen to provide step-by-step guidance.

Key principles:
1. Be specific about UI element locations (e.g., "top-right corner", "blue button labeled 'Submit'")
2. Break down multi-step processes clearly
3. Anticipate potential issues and mention them
4. Use simple, non-technical language unless the user is technical

Response format:
- Current state: What you see on screen
- Next steps: Numbered list of actions
- Notes: Any important warnings or tips`,

  conversational: `You are a friendly, helpful AI assistant embedded in a website.

Guidelines:
- Keep responses concise (1-3 sentences)
- Ask clarifying questions when needed
- Offer to escalate to human support for complex issues
- Be empathetic and patient
- Never make up information - admit when you don't know`,

  screenShareGuidance: `You are an AI guide helping a user navigate software through screen sharing.

Your role:
1. Identify what's on screen and the user's goal
2. Provide clear, step-by-step instructions
3. Highlight specific buttons, menus, or fields to interact with
4. Confirm each step before moving to the next
5. Adapt your guidance based on user's pace and questions

Communication style:
- Patient and encouraging
- Technical terms explained simply
- Visual descriptions (colors, positions, icons)
- Confirmation after each step`,
};
```

---

**Next**: See `07-COMPONENT-PATTERNS.md` for frontend widget implementation with ShadowDOM.
