# AI Assistant Platform - Project Overview

## 🎯 Executive Summary

**White-label AI guidance platform** providing intelligent assistance through two deployment modes:
1. **Embedded Widget** - Chatbot on customer websites with optional screen sharing
2. **Standalone Meeting Platform** - Google Meet-style interface for training/onboarding

**Generic Code Name**: `platform` (branding to be determined later)

---

## 🏗️ Core Value Proposition

### What We're Building

An AI-powered guidance system that helps users navigate complex interfaces through:
- **Text-based chat** for quick questions and guidance
- **Voice interaction** for hands-free assistance
- **Full desktop screen analysis** for visual context
- **Real-time guidance** with highlighting and step-by-step instructions
- **Multi-participant meetings** for team onboarding

### Key Innovation

**Cost-optimized architecture** that uses lightweight SSE for text chat and only activates LiveKit when screen sharing is needed, resulting in **90% cost savings** versus always-on video conferencing solutions.

---

## 🎨 Two Deployment Modes

### Mode 1: Embedded Widget

**Use Case**: Customer websites want AI assistance for their users

**User Flow**:
```
1. User sees chatbot button on website
2. Clicks → Opens chat panel
3. Types/speaks questions → AI responds via text (SSE)
4. [Optional] Clicks "Share Screen" → Upgrades to LiveKit
5. Full desktop sharing + voice guidance
6. User stops sharing → Returns to cost-effective text chat
```

**Embedding Options**:
- **Script mode** (recommended): Full DOM access, can click buttons/fill inputs
- **iframe mode** (security-conscious): Sandboxed, limited capabilities

**Example Integration**:
```html
<script src="https://cdn.platform.com/v1/widget.js"></script>
<script>
  PlatformWidget.init({
    apiKey: 'pk_live_...',
    mode: 'script',
    position: 'bottom-right'
  });
</script>
```

### Mode 2: Standalone Meeting Platform

**Use Case**: Organizations conducting training, onboarding, or support sessions

**User Flow**:
```
1. Organizer creates meeting → Gets link: meet.platform.com/room/abc123
2. Participants join → LiveKit room with AI agent
3. Anyone can share full desktop
4. AI provides real-time voice + visual guidance
5. Multi-participant collaboration
```

**Example Use Cases**:
- Employee onboarding on complex enterprise software
- Healthcare EHR system training for new doctors
- Financial trading platform guidance for new traders
- Customer support sessions with visual troubleshooting

---

## 💰 Cost Architecture

### Text Chat Mode (SSE)
- **Cost**: $0.05-0.10 per hour
- **Use When**: Simple Q&A, basic guidance
- **Technology**: Server-Sent Events + Redis pub/sub

### Meeting Mode (LiveKit)
- **Cost**: $1.20-2.20 per hour
- **Use When**: Screen sharing needed, visual guidance required
- **Technology**: LiveKit WebRTC + AI agents

### Cost Savings
**90% cheaper** than always-on LiveKit by starting with SSE and upgrading on-demand.

---

## 🎯 Target Markets

### Primary Markets (Months 1-6)
1. **Customer Support** - Deflect tickets with AI guidance ($0.80-3.00 saved per ticket)
2. **Digital Accessibility** - ADA compliance, assist users with disabilities

### Secondary Markets (Months 7-12)
3. **Enterprise Onboarding** - SaaS platforms (Salesforce, SAP, Workday)
4. **Healthcare EHR** - Physician training, reduce burnout

### Tertiary Markets (Months 13-18)
5. **Financial Services** - Trading platforms, wealth management
6. **Government Services** - Public sector accessibility

### Market Size
- **Digital Adoption Platforms**: $2-3B (growing 17-23% CAGR)
- **Accessibility Software**: $700M-1.3B (growing 6-15% CAGR)
- **Total Addressable Market**: $5-10B+

---

## 🏆 Competitive Advantages

### vs WalkMe/Whatfix (Digital Adoption Platforms)
- **10x cheaper**: $99-999/month vs $37K-200K/year
- **Real-time AI guidance**: vs pre-programmed walkthroughs
- **Voice + vision**: vs text-only overlays
- **Self-service deployment**: vs 6-month enterprise sales

### vs Microsoft Copilot Vision
- **Embeddable**: vs desktop-only application
- **Multi-platform**: vs Windows-only
- **White-label**: vs Microsoft branding
- **Full desktop access**: vs limited scope

### vs Traditional Chatbots
- **Screen understanding**: Can see what user sees
- **Voice interaction**: Natural conversation
- **DOM automation**: Can click/fill forms for users
- **Visual guidance**: Highlights and overlays

---

## 🔧 Technical Architecture Highlights

### Frontend
- **Vite 6** + **React 18** + **TypeScript 5.7**
- **TailwindCSS 4.0** (pure, no component libraries)
- **Turborepo** monorepo (3-10x faster builds)

### Backend
- **Fastify 5** (3x faster than Express)
- **tRPC v11** (end-to-end type safety)
- **PostgreSQL 16** + **pgvector** (vector search)
- **Drizzle ORM** (100x faster than Prisma)
- **Redis 7** (SSE pub/sub, caching)

### Real-Time
- **Server-Sent Events** (text chat, cost-effective)
- **LiveKit** (voice + screen sharing on-demand)
- **Full desktop capture** capability

### AI Stack
- **Vision**: Gemini Flash (routine) + Claude Sonnet (complex)
- **Voice**: Deepgram STT + GPT-4o + ElevenLabs TTS
- **RAG**: Voyage Multimodal-3 + pgvector hybrid search
- **Optimization**: Smart frame selection (95% cost reduction)

---

## 📊 Business Model

### Pricing Tiers

**Starter**: $99/month
- 1,000 AI-guided sessions
- Embedded widget
- Basic analytics

**Growth**: $299/month
- 5,000 sessions
- Custom branding
- Advanced analytics
- API access

**Business**: $999/month
- 25,000 sessions
- White-label
- Dedicated support
- Custom integrations

**Enterprise**: Custom
- Unlimited sessions
- SLA guarantees
- On-premise deployment
- Custom AI training

### Unit Economics

**Target Margins**: 200-500%
- **Cost per session**: $0.15-0.25 (at scale)
- **Charge per session**: $0.50-2.00
- **Gross margin**: 60-80%

---

## 🚀 Development Roadmap

### Phase 1: Foundation (Weeks 1-4)
- Monorepo setup (Turborepo + pnpm)
- Core infrastructure (Fastify API + PostgreSQL)
- Embedded widget skeleton
- SSE chat implementation

### Phase 2: AI Integration (Weeks 5-8)
- Vision analysis (Gemini + Claude)
- Voice pipeline (Deepgram + ElevenLabs)
- RAG system (Voyage + pgvector)
- LiveKit integration

### Phase 3: Production (Weeks 9-12)
- Meeting platform interface
- Multi-tenancy + billing
- Security + compliance
- Beta launch

### Phase 4: Scale (Months 4-6)
- Performance optimization
- Enterprise features
- SOC 2 certification
- Go-to-market execution

---

## ✅ Success Metrics

### Technical KPIs
- Widget bundle size: <50KB gzipped
- Voice latency: <800ms end-to-end
- Screen analysis cost: <$0.10/hour
- API response time: <200ms p95
- Uptime SLA: 99.9%

### Business KPIs
- Beta customers: 10 (Month 3)
- MRR: $10K (Month 6)
- Gross margin: >60%
- Churn rate: <5%/month
- NPS score: >50

---

## 🎯 Next Steps

1. Review complete technical architecture (see other docs)
2. Set up development environment
3. Initialize monorepo structure
4. Begin Phase 1 implementation

---

**Project Status**: Planning Complete ✅
**Next Action**: Begin implementation in new repository
**Expected Launch**: 12 weeks from start
