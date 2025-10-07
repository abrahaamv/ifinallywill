/**
 * About Page
 * Company information and team
 */

import { Card, CardHeader, CardTitle, CardDescription } from '@platform/ui';

export function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          About AI Assistant Platform
        </h1>
        <p className="text-lg text-muted-foreground">
          Building the future of enterprise AI interaction
        </p>
      </div>

      {/* Mission Section */}
      <section className="mb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold">Our Mission</h2>
          <p className="mb-4 text-lg text-muted-foreground">
            We believe AI should be accessible, affordable, and powerful for every organization.
            Our mission is to democratize enterprise-grade AI capabilities through cost-optimized
            multi-modal interactions.
          </p>
          <p className="text-lg text-muted-foreground">
            By achieving 75-85% cost reduction without compromising quality, we're making
            advanced AI assistance financially viable for businesses of all sizes.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="mb-24">
        <h2 className="mb-8 text-center text-3xl font-bold">Our Values</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Cost Efficiency</CardTitle>
              <CardDescription>
                We optimize every interaction to deliver maximum value at minimum cost.
                Our intelligent routing achieves industry-leading cost per token.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enterprise Quality</CardTitle>
              <CardDescription>
                No compromises on quality, security, or reliability. We build for
                mission-critical deployments with 99.9% uptime SLA.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Developer First</CardTitle>
              <CardDescription>
                Type-safe APIs, comprehensive docs, and embeddable widgets.
                We prioritize developer experience in every decision.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Technology Section */}
      <section>
        <h2 className="mb-8 text-center text-3xl font-bold">Our Technology</h2>
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Modal Architecture</CardTitle>
              <CardDescription>
                Real-time voice (Deepgram), vision (1 FPS capture), and text interactions
                powered by LiveKit WebRTC and WebSocket communication.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intelligent Provider Routing</CardTitle>
              <CardDescription>
                Cost-optimized AI routing: Gemini Flash 2.5 (85% routine) + Claude 3.5 Sonnet (15% complex).
                Achieves $0.50/1M tokens vs. $15/1M industry standard.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enterprise Infrastructure</CardTitle>
              <CardDescription>
                PostgreSQL 16+ with Row-Level Security, Redis Streams for real-time messaging,
                Auth.js authentication, and Drizzle ORM for type-safe database access.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modern Frontend Stack</CardTitle>
              <CardDescription>
                React 18 + Vite 6, Tailwind CSS v4, shadcn/ui components, and tRPC for
                type-safe client-server communication.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
