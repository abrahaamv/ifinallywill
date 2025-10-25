/**
 * Features Page - Production Ready
 * Detailed feature descriptions and use cases with icons
 */

import { Card, CardDescription, CardHeader, CardTitle } from '@platform/ui';
import {
  Book,
  Brain,
  Code,
  Database,
  Eye,
  FileSearch,
  FileText,
  Globe,
  Key,
  Lock,
  MessageSquare,
  Share2,
  Shield,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';

export function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          Features Built for Scale
        </h1>
        <p className="text-lg text-muted-foreground">
          Everything you need for enterprise-grade AI assistance
        </p>
      </div>

      <div className="space-y-16">
        {/* Multi-Modal Interaction */}
        <div>
          <h2 className="mb-8 text-3xl font-bold">Multi-Modal Interaction</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <MessageSquare className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Voice Conversations</CardTitle>
                <CardDescription>
                  Natural voice interactions with real-time transcription powered by Deepgram.
                  Supports multiple languages and accents with high accuracy.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Eye className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Vision Analysis</CardTitle>
                <CardDescription>
                  Screen sharing and image analysis with optimized 1 FPS capture. 96% cost reduction
                  compared to standard 30 FPS processing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Text Chat</CardTitle>
                <CardDescription>
                  Real-time text conversations with context awareness and message history.
                  WebSocket-based for instant responses.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Share2 className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>File Sharing</CardTitle>
                <CardDescription>
                  Share documents, images, and files during conversations. AI analyzes and
                  incorporates content into responses.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* AI Intelligence */}
        <div>
          <h2 className="mb-8 text-3xl font-bold">AI Intelligence</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <TrendingDown className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Cost-Optimized Routing</CardTitle>
                <CardDescription>
                  Intelligent provider selection: Gemini Flash 2.5 for 85% of routine tasks, Claude
                  3.5 Sonnet for 15% complex reasoning. Achieves $0.50/1M tokens.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Database className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Knowledge Enhancement (RAG)</CardTitle>
                <CardDescription>
                  Upload documents and images for context-aware responses. Hybrid retrieval with
                  semantic search, keyword matching, and reranking.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Context Awareness</CardTitle>
                <CardDescription>
                  AI maintains conversation history and references previous messages. Understands
                  multi-turn dialogues and complex instructions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Multi-Language Support</CardTitle>
                <CardDescription>
                  Supports 100+ languages for text and 30+ for voice transcription. Automatic
                  language detection and translation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Enterprise Features */}
        <div>
          <h2 className="mb-8 text-3xl font-bold">Enterprise Security</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Shield className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Multi-Tenant Isolation</CardTitle>
                <CardDescription>
                  Complete data separation with PostgreSQL Row-Level Security (RLS). Tenant context
                  enforced at database level.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Key className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>OAuth Authentication</CardTitle>
                <CardDescription>
                  Secure authentication with Auth.js supporting Google, Microsoft, and custom
                  providers. Session-based with PKCE flow for security hardening.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Lock className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Data Encryption</CardTitle>
                <CardDescription>
                  End-to-end encryption for data in transit (TLS 1.3) and at rest (AES-256). Secure
                  key management with rotation policies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileSearch className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Audit Logging</CardTitle>
                <CardDescription>
                  Comprehensive audit trails for compliance and security monitoring. Tracks all user
                  actions and system events.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Developer Features */}
        <div>
          <h2 className="mb-8 text-3xl font-bold">Developer Experience</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Code className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>REST + tRPC APIs</CardTitle>
                <CardDescription>
                  Type-safe APIs with tRPC for TypeScript projects. REST endpoints for broad
                  compatibility.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>WebSocket Real-time</CardTitle>
                <CardDescription>
                  Low-latency real-time communication with Redis Streams for multi-instance scaling.
                  Sticky sessions for WebSocket persistence.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Embeddable Widget</CardTitle>
                <CardDescription>
                  NPM package and CDN-hosted widget for embedding AI assistant in your apps. Shadow
                  DOM isolation and customizable theming.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Book className="mb-3 h-8 w-8 text-primary" />
                <CardTitle>Comprehensive Docs</CardTitle>
                <CardDescription>
                  Detailed API documentation, code examples, and integration guides. Interactive
                  playground for testing.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
