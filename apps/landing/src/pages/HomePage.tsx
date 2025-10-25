/**
 * Home Page - Production Ready
 * Landing page with hero, features, testimonials, trust badges, CTA
 */

import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '@platform/ui';
import { Database, Eye, MessageSquare, Quote, Shield, Star, TrendingDown } from 'lucide-react';

export function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <Badge className="mb-4 animate-fade-in">New: Real-time AI Collaboration</Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Enterprise AI Assistant
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Powered by Multi-Modal Intelligence
              </span>
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Real-time voice, vision, and text AI interactions with cost-optimized routing. 75-85%
              cost reduction without compromising quality.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <a href="http://localhost:5174/login">Get Started Free</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="http://localhost:5175">Try Live Demo</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="group transition-transform hover:scale-105">
                <div className="text-3xl font-bold text-primary">75-85%</div>
                <div className="text-sm text-muted-foreground">Cost Reduction</div>
              </div>
              <div className="group transition-transform hover:scale-105">
                <div className="text-3xl font-bold text-primary">&lt;200ms</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </div>
              <div className="group transition-transform hover:scale-105">
                <div className="text-3xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime SLA</div>
              </div>
              <div className="group transition-transform hover:scale-105">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Trusted by forward-thinking teams worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
            <div className="text-2xl font-bold text-muted-foreground">Acme Corp</div>
            <div className="text-2xl font-bold text-muted-foreground">TechStart</div>
            <div className="text-2xl font-bold text-muted-foreground">InnovateLab</div>
            <div className="text-2xl font-bold text-muted-foreground">CloudScale</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Powerful Features for Modern Teams
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need for enterprise-grade AI assistance
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="group transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle>Voice Interaction</CardTitle>
                <CardDescription>
                  Natural voice conversations with real-time transcription and AI responses
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Eye className="h-6 w-6" />
                </div>
                <CardTitle>Vision Analysis</CardTitle>
                <CardDescription>
                  Screen sharing and image analysis with 1 FPS capture for 96% cost savings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle>Smart Chat</CardTitle>
                <CardDescription>
                  Context-aware conversations with RAG-enhanced knowledge retrieval
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Shield className="h-6 w-6" />
                </div>
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Multi-tenant isolation, RLS policies, and SOC 2 compliance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <CardTitle>Cost Optimization</CardTitle>
                <CardDescription>
                  Intelligent provider routing for 75-85% cost reduction vs. standard pricing
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Database className="h-6 w-6" />
                </div>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>
                  Upload documents and images for RAG-enhanced AI responses
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-t border-border bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Loved by Teams Worldwide
            </h2>
            <p className="text-lg text-muted-foreground">See what our customers have to say</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-border">
              <CardHeader>
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <Quote className="h-8 w-8 text-muted-foreground/30" />
                <CardDescription className="text-base">
                  "The cost savings alone paid for itself in the first month. The AI quality is
                  incredible and the multi-modal support is game-changing."
                </CardDescription>
                <div className="mt-4">
                  <p className="font-semibold text-foreground">Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">CTO, TechStart</p>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <Quote className="h-8 w-8 text-muted-foreground/30" />
                <CardDescription className="text-base">
                  "Setup was a breeze and the real-time voice + vision capabilities exceeded our
                  expectations. Best AI platform we've used."
                </CardDescription>
                <div className="mt-4">
                  <p className="font-semibold text-foreground">Michael Rodriguez</p>
                  <p className="text-sm text-muted-foreground">VP Engineering, CloudScale</p>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <Quote className="h-8 w-8 text-muted-foreground/30" />
                <CardDescription className="text-base">
                  "Enterprise security features give us peace of mind while the cost optimization
                  keeps our CFO happy. Win-win!"
                </CardDescription>
                <div className="mt-4">
                  <p className="font-semibold text-foreground">Emily Watson</p>
                  <p className="text-sm text-muted-foreground">Head of Product, InnovateLab</p>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="flex flex-col items-center text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Transform Your Workflow?
          </h2>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
            Start with our free tier. No credit card required.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <a href="http://localhost:5174/login">Start Free Trial</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/contact">Contact Sales</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
