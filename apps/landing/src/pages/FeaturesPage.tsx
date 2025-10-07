/**
 * Features Page
 * Detailed feature descriptions and use cases
 */

import { Card, CardHeader, CardTitle, CardDescription } from '@platform/ui';

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
                <CardTitle>Voice Conversations</CardTitle>
                <CardDescription>
                  Natural voice interactions with real-time transcription powered by Deepgram.
                  Supports multiple languages and accents with high accuracy.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vision Analysis</CardTitle>
                <CardDescription>
                  Screen sharing and image analysis with optimized 1 FPS capture.
                  96% cost reduction compared to standard 30 FPS processing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Text Chat</CardTitle>
                <CardDescription>
                  Real-time text conversations with context awareness and message history.
                  WebSocket-based for instant responses.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File Sharing</CardTitle>
                <CardDescription>
                  Share documents, images, and files during conversations.
                  AI analyzes and incorporates content into responses.
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
                <CardTitle>Cost-Optimized Routing</CardTitle>
                <CardDescription>
                  Intelligent provider selection: Gemini Flash 2.5 for 85% of routine tasks,
                  Claude 3.5 Sonnet for 15% complex reasoning. Achieves $0.50/1M tokens.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Knowledge Enhancement (RAG)</CardTitle>
                <CardDescription>
                  Upload documents and images for context-aware responses.
                  Hybrid retrieval with semantic search, keyword matching, and reranking.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Context Awareness</CardTitle>
                <CardDescription>
                  AI maintains conversation history and references previous messages.
                  Understands multi-turn dialogues and complex instructions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multi-Language Support</CardTitle>
                <CardDescription>
                  Supports 100+ languages for text and 30+ for voice transcription.
                  Automatic language detection and translation.
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
                <CardTitle>Multi-Tenant Isolation</CardTitle>
                <CardDescription>
                  Complete data separation with PostgreSQL Row-Level Security (RLS).
                  Tenant context enforced at database level.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>OAuth Authentication</CardTitle>
                <CardDescription>
                  Secure authentication with Auth.js supporting Google, Microsoft, and custom providers.
                  Session-based with PKCE flow for security hardening.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Encryption</CardTitle>
                <CardDescription>
                  End-to-end encryption for data in transit (TLS 1.3) and at rest (AES-256).
                  Secure key management with rotation policies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Logging</CardTitle>
                <CardDescription>
                  Comprehensive audit trails for compliance and security monitoring.
                  Tracks all user actions and system events.
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
                <CardTitle>REST + tRPC APIs</CardTitle>
                <CardDescription>
                  Type-safe APIs with tRPC for TypeScript projects.
                  REST endpoints for broad compatibility.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>WebSocket Real-time</CardTitle>
                <CardDescription>
                  Low-latency real-time communication with Redis Streams for multi-instance scaling.
                  Sticky sessions for WebSocket persistence.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embeddable Widget</CardTitle>
                <CardDescription>
                  NPM package and CDN-hosted widget for embedding AI assistant in your apps.
                  Shadow DOM isolation and customizable theming.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comprehensive Docs</CardTitle>
                <CardDescription>
                  Detailed API documentation, code examples, and integration guides.
                  Interactive playground for testing.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
