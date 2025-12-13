# VisualKit Landing Page - Production Implementation Guide

## Context for Claude Code

You are implementing the production landing page for **VisualKit** - a revolutionary AI customer support platform. VisualKit's unique differentiator is that its AI can **see customer screens in real-time** - no competitor offers this capability.

**Tech Stack:**
- React 18 + TypeScript + Vite
- Tailwind CSS v4 with custom dark theme
- Lucide React icons
- shadcn/ui components
- Monorepo: `apps/landing/`

**Brand Identity:**
- Primary: `#6366f1` (Indigo)
- Accent: `#8b5cf6` (Purple)
- Background: `#08080a` (Near black)
- Text: White with opacity variants (100%, 70%, 50%, 40%, 30%)
- Border: `white/[0.06]` to `white/[0.12]`
- Radius: 12px-24px (generous, modern)
- Font: Inter (system fallback)

---

## CRITICAL: Hero Section Requirements

### Headline (MUST BE EXACTLY):
```
AI Support That Sees
What Your Customers See
```

### Subheadline (MUST INCLUDE ALL ELEMENTS):
```
Resolve support tickets 50% faster with AI agents that view customer screens in real-time. 
Enterprise-grade encryption. Customer-initiated. Nothing stored.
```

### CTAs (In Order):
1. **Primary:** "See It In Action" → Links to demo/meeting room
2. **Secondary:** "Start Free Trial" → Links to signup
3. Below: "No credit card required" (text, not button)

### Hero Visual (CRITICAL - Currently Missing):
Replace the placeholder split-screen with an **animated GIF or video** showing:
- Left side: "CUSTOMER SCREEN" - simulated screen share
- Right side: "AI AGENT" - AI analyzing and responding
- Must autoplay, loop, be muted
- Fallback to static image on slow connections

**Implementation Priority:** The hero visual is the most important conversion element. Without it, visitors don't understand the product.

---

## Trust Badges Section (Immediately After Hero)

Display these 4 badges in a horizontal row:
```typescript
const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'SOC 2 Type II' },
  { icon: Lock, label: '256-bit AES' },
  { icon: Globe, label: 'GDPR Compliant' },
  { icon: Zap, label: '99.9% Uptime' },
];
```

Style: Subtle pills with emerald icon color, `bg-white/[0.02]` background.

---

## Products Section (4-Tab Navigation)

### Tab Structure:
```typescript
const PRODUCT_TABS = [
  {
    id: 'widget',
    label: 'Free Widget',
    icon: MessageSquare,
    pricing: 'Free to start',
    headline: 'AI chat that sees customer screens',
    description: 'Deploy in 5 minutes with a single script tag. Free forever for small teams.',
    features: ['Visual AI assistance', 'Custom branding', 'Knowledge base integration'],
    cta: 'Get Widget Code',
    ctaHref: '/signup',
  },
  {
    id: 'sdk',
    label: 'SDK / API',
    icon: Code2,
    pricing: 'Pay as you go',
    headline: 'Visual AI via WebSocket + REST',
    description: 'Full programmatic control for custom integrations. Usage-based pricing.',
    features: ['Real-time WebSocket', 'REST API', 'React & JS SDKs'],
    cta: 'Get API Keys',
    ctaHref: '/signup',
  },
  {
    id: 'meetings',
    label: 'Meeting Rooms',
    icon: Video,
    pricing: 'Included in Pro',
    headline: 'AI-powered video with screen sharing',
    description: 'Schedule meetings, record sessions, and add AI agents to any call.',
    features: ['HD video & audio', 'AI transcription', 'Calendar sync'],
    cta: 'Create Your First Room',
    ctaHref: '/meet',
  },
  {
    id: 'platform',
    label: 'Platform Suite',
    icon: Server,
    pricing: 'Custom pricing',
    headline: 'Everything unified for enterprise',
    description: 'Widget + API + Meetings + Dashboard. SSO, audit logs, and dedicated support.',
    features: ['Single sign-on', 'Custom SLAs', 'Dedicated success manager'],
    cta: 'Contact Sales',
    ctaHref: '/contact',
  },
];
```

### Tab Content Layout:
- Left (50%): Pricing badge, headline, description, feature checklist, CTA button
- Right (50%): **Product preview image/animation** (CRITICAL - currently shows placeholder)

**Action Required:** Create or source actual product screenshots/mockups for each tab.

---

## Features Section (Benefit-Led Titles)

### Section Header:
- Label: "CAPABILITIES"
- Title: "Visual support that actually works"

### Feature Cards (3x2 Grid):
```typescript
const FEATURES = [
  {
    badge: 'Visual AI',
    icon: Eye,
    title: 'See What They See',
    description: 'AI views customer screens in real-time with their permission. No more "describe what you see"—understand issues instantly.',
  },
  {
    badge: 'Speed',
    icon: Zap,
    title: 'Resolve in Minutes, Not Hours',
    description: 'Visual context means faster diagnosis. Average resolution time drops 50% compared to text-only support.',
  },
  {
    badge: 'Zero Friction',
    icon: MousePointerClick,
    title: 'One-Click Connection',
    description: 'Customers connect instantly via browser. No plugins, no downloads, no friction.',
  },
  {
    badge: 'Multi-Modal',
    icon: Mic,
    title: 'Voice + Vision + Text',
    description: 'Unified AI that talks, sees, and chats—choose the interaction mode that fits each situation.',
  },
  {
    badge: 'Handoff',
    icon: Users,
    title: 'AI + Human, Seamlessly',
    description: 'When issues need human touch, seamless handoff ensures smooth transition with full context preserved.',
  },
  {
    badge: 'Knowledge',
    icon: BookOpen,
    title: 'AI That Learns Your Business',
    description: 'Upload docs, train your AI, and watch resolution rates climb. The more you teach, the smarter it gets.',
  },
];
```

---

## Comparison Section (Checklist Format)

### Section Header:
- Label: "ONLY VISUALKIT"
- Title: "Capabilities no one else offers"

### Checklist Items:
```typescript
const COMPARISON = [
  { feature: 'Visual AI (screen viewing)', unique: true },
  { feature: 'Voice + Text + Video unified', unique: true },
  { feature: 'Self-hosted option', unique: true },
  { feature: 'AI-powered meetings', unique: true },
  { feature: 'Text chat', unique: false },
  { feature: 'Knowledge base', unique: false },
  { feature: 'Human handoff', unique: false },
];
```

### Styling:
- Unique features: Indigo background highlight + "EXCLUSIVE" badge on right
- Standard features: Subtle background, emerald checkmark

---

## Testimonials Section

### Section Header:
- Label: "RESULTS"
- Title: "Trusted by support teams"

### Testimonial Cards:
```typescript
const TESTIMONIALS = [
  {
    metric: '60% fewer tickets',
    quote: 'VisualKit reduced our support tickets by 60%. The AI actually sees what customers see—game changer.',
    author: 'Sarah Chen',
    role: 'VP of Support',
    company: 'TechCorp',
  },
  {
    metric: '2 min resolution',
    quote: 'We went from 15-minute average resolution to under 2 minutes. Our team can finally focus on complex issues.',
    author: 'Marcus Rodriguez',
    role: 'CTO',
    company: 'StartupXYZ',
  },
  {
    metric: '40% CSAT increase',
    quote: 'The voice AI is indistinguishable from human agents. Our CSAT scores went up 40% in the first month.',
    author: 'Emily Watson',
    role: 'Head of CX',
    company: 'Enterprise Inc',
  },
];
```

### Card Layout:
- Metric badge at top (emerald background)
- Quote in italics
- Author info at bottom

---

## FAQ Section (Strategy-Aligned Questions)

```typescript
const FAQ_ITEMS = [
  {
    question: 'Is customer data used to train your AI?',
    answer: 'No. Your data is never used for model training. Sessions are encrypted end-to-end and processed in real-time only.',
  },
  {
    question: 'Is VisualKit GDPR/SOC 2 compliant?',
    answer: 'Yes. We are SOC 2 Type II attested and fully GDPR compliant. Your choice of US, EU, or self-hosted infrastructure.',
  },
  {
    question: 'Does my customer need to download anything?',
    answer: 'No. Screen sharing works instantly in any modern browser—Chrome, Firefox, Safari, Edge. No plugins required.',
  },
  {
    question: 'How long does setup take?',
    answer: '5 minutes for basic widget integration. Add our script tag, configure in the dashboard, and you\'re live.',
  },
  {
    question: 'Can agents take over from AI?',
    answer: 'Yes. Seamless handoff to human agents with full conversation context and AI-generated summary.',
  },
  {
    question: 'What happens if I exceed my plan limits?',
    answer: 'You\'ll receive email notifications. Service continues and overage is billed at standard rates. No surprise cutoffs.',
  },
];
```

---

## Final CTA Section

### Content:
- Title: "Ready to see it in action?"
- Subtitle: "Watch how support teams resolve issues 50% faster with Visual AI. Start free, upgrade when you need to."
- Primary CTA: "See It In Action" (with Play icon)
- Secondary CTA: "Start Free Trial"
- Below: "No credit card required"

---

## Pricing Page Requirements

### Current State Issues:
Looking at the screenshots, the pricing page is missing:
1. Actual price values (shows `/month` without numbers)
2. Plan names (Free, Pro, Business, Enterprise)
3. Feature labels for checkmarks

### Required Pricing Structure:

```typescript
const PRICING_PLANS = [
  {
    name: 'Free',
    price: 0,
    period: '/month',
    description: 'For individuals and small projects getting started',
    highlight: false,
    cta: 'Start Free',
    limits: {
      conversations: '100/mo',
      teamMembers: 1,
    },
    features: [
      'Visual AI assistance',
      'Text chat',
      'Basic knowledge base',
      'Community support',
      'Widget customization',
      'Email notifications',
    ],
    excluded: ['Meeting rooms', 'Recording', 'API access'],
  },
  {
    name: 'Pro',
    price: 49,
    period: '/month',
    annualPrice: 39, // Billed annually ($468/year)
    description: 'For growing teams with higher volume needs',
    highlight: true, // "Most Popular" badge
    cta: 'Start 14-Day Trial',
    limits: {
      conversations: '1,000/mo',
      teamMembers: 5,
    },
    features: [
      'Everything in Free',
      'Voice AI',
      'Screen sharing',
      'Advanced analytics',
      'Priority support',
      'Custom AI training',
      'Slack integration',
      'API access (limited)',
    ],
    excluded: ['Meeting rooms', 'Recording'],
  },
  {
    name: 'Business',
    price: 149,
    period: '/month',
    annualPrice: 119, // Billed annually ($1,428/year)
    description: 'For teams needing meetings and advanced features',
    highlight: false,
    cta: 'Start 14-Day Trial',
    limits: {
      conversations: '5,000/mo',
      teamMembers: 15,
    },
    features: [
      'Everything in Pro',
      'Meeting rooms',
      'Recording & transcription',
      'Full API access',
      'SSO (SAML)',
      'Audit logs',
      'Custom integrations',
      'Dedicated onboarding',
    ],
    excluded: [],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For organizations with custom requirements',
    highlight: false,
    cta: 'Contact Sales',
    limits: {
      conversations: 'Unlimited',
      teamMembers: 'Unlimited',
    },
    features: [
      'Everything in Business',
      'Self-hosted option',
      'Custom SLAs',
      'Dedicated success manager',
      'Priority roadmap input',
      'Custom AI models',
      'Volume discounts',
      'HIPAA compliance (add-on)',
    ],
    excluded: [],
  },
];
```

### Pricing Page Layout:
1. Header: "Simple, transparent pricing"
2. Subheader: "All plans include Visual AI - the only AI that can see your customers' screens. No hidden fees, no per-resolution charges."
3. Toggle: Monthly / Annual (with "Save 20%" badge)
4. 4-column grid of plan cards
5. FAQ section specific to pricing
6. Final CTA: "Not sure which plan? Start free and upgrade anytime."

---

## Features Page Requirements

### Current State:
The features page shows technical details but lacks:
1. Feature titles (just icons + descriptions)
2. Visual hierarchy
3. Compelling benefit framing

### Required Structure:

```typescript
const FEATURE_CATEGORIES = [
  {
    category: 'Communication',
    features: [
      {
        icon: Mic,
        title: 'Voice AI',
        description: 'Natural voice interactions with real-time transcription powered by Deepgram. Supports multiple languages and accents with high accuracy.',
        specs: ['<500ms latency', '40+ languages', 'Speaker diarization'],
      },
      {
        icon: Eye,
        title: 'Visual AI',
        description: 'Screen sharing and image analysis with optimized 1 FPS capture. 96% cost reduction compared to standard 30 FPS processing.',
        specs: ['1 FPS optimized', 'pHash deduplication', 'Real-time guidance'],
      },
      {
        icon: MessageSquare,
        title: 'Text Chat',
        description: 'Real-time text conversations with context awareness and message history. WebSocket-based for instant responses.',
        specs: ['Instant delivery', 'Rich formatting', 'File attachments'],
      },
      {
        icon: Share2,
        title: 'File Sharing',
        description: 'Share documents, images, and files during conversations. AI analyzes and incorporates content into responses.',
        specs: ['PDF, DOCX, images', 'Up to 50MB', 'AI analysis'],
      },
    ],
  },
  {
    category: 'Intelligence',
    features: [
      {
        icon: Brain,
        title: 'Smart Routing',
        description: 'Intelligent provider selection: Gemini Flash 2.5 for 85% of routine tasks, Claude 3.5 Sonnet for 15% complex reasoning. Achieves $0.50/1M tokens.',
        specs: ['85% cost savings', 'Automatic fallback', 'Quality preserved'],
      },
      {
        icon: Database,
        title: 'Knowledge Base',
        description: 'Upload documents and images for context-aware responses. Hybrid retrieval with semantic search, keyword matching, and reranking.',
        specs: ['PDF, DOCX, MD', 'Semantic search', 'Cohere reranking'],
      },
    ],
  },
  {
    category: 'Enterprise',
    features: [
      {
        icon: Shield,
        title: 'Security',
        description: 'SOC 2 Type II attested, GDPR compliant. AES-256 encryption at rest, TLS 1.3 in transit. Your data never leaves your control.',
        specs: ['SOC 2 Type II', 'GDPR', 'HIPAA-ready'],
      },
      {
        icon: Globe,
        title: 'Global Infrastructure',
        description: 'Deploy in US, EU, or your own infrastructure. Self-hosted option with full feature parity.',
        specs: ['Multi-region', 'Self-hosted', '<100ms global'],
      },
    ],
  },
];
```

---

## Contact Page Requirements

### Current State:
Form exists but needs:
1. Proper field validation
2. Success/error states
3. Integration with backend

### Form Fields:
- Name (required)
- Email (required, validated)
- Company (optional)
- Message (required, min 20 chars)

### Additional Contact Options (Right Column):
```typescript
const CONTACT_OPTIONS = [
  {
    title: 'Support',
    description: 'For general inquiries and support questions',
    email: 'support@visualkit.live',
    icon: MessageCircle,
  },
  {
    title: 'Sales',
    description: 'For enterprise plans and custom solutions',
    email: 'sales@visualkit.live',
    icon: Briefcase,
  },
  {
    title: 'Hours',
    description: 'We\'re here to help during business hours',
    hours: 'Monday - Friday: 9:00 AM - 6:00 PM PST',
    icon: Clock,
  },
];
```

---

## Production Checklist

### Must Fix Before Launch:

- [ ] **Hero visual** - Replace placeholder with actual demo GIF/video
- [ ] **Product tab previews** - Add real screenshots for each product
- [ ] **Pricing values** - Add actual prices ($0, $49, $149, Custom)
- [ ] **Pricing features** - Add feature text next to checkmarks
- [ ] **Features page titles** - Add titles to feature cards
- [ ] **Contact form** - Wire up to backend/email service
- [ ] **Meta tags** - SEO title, description, OG images
- [ ] **Favicon** - Add VisualKit favicon
- [ ] **Analytics** - Add Plausible/PostHog tracking
- [ ] **404 page** - Create custom 404

### Performance Requirements:
- [ ] Lighthouse score > 95
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Images optimized (WebP, lazy loading)
- [ ] Font subsetting (Inter Latin only)

### Accessibility:
- [ ] All images have alt text
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Keyboard navigation works
- [ ] Color contrast ratios pass WCAG AA
- [ ] Focus states visible

---

## File Structure

```
apps/landing/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx       # Main landing page
│   │   ├── FeaturesPage.tsx   # Detailed features
│   │   ├── PricingPage.tsx    # Pricing plans
│   │   ├── ContactPage.tsx    # Contact form
│   │   └── AboutPage.tsx      # Company info (if needed)
│   ├── components/
│   │   ├── Header.tsx         # Navigation
│   │   ├── Footer.tsx         # Footer links
│   │   ├── HeroSection.tsx    # Hero with video
│   │   ├── ProductTabs.tsx    # 4-product tabs
│   │   ├── FeatureGrid.tsx    # Feature cards
│   │   ├── PricingCard.tsx    # Individual plan card
│   │   ├── TestimonialCard.tsx
│   │   ├── FAQAccordion.tsx
│   │   └── CTASection.tsx
│   ├── config/
│   │   └── urls.ts            # Route constants
│   └── assets/
│       ├── hero-demo.mp4      # Hero video (TO CREATE)
│       ├── product-widget.png # Widget screenshot (TO CREATE)
│       ├── product-sdk.png    # SDK screenshot (TO CREATE)
│       ├── product-meeting.png # Meeting screenshot (TO CREATE)
│       └── product-platform.png # Platform screenshot (TO CREATE)
```

---

## Implementation Order

1. **Fix Pricing Page** (highest impact - users can't evaluate without prices)
   - Add actual price values
   - Add feature labels
   - Add annual toggle functionality

2. **Add Hero Visual** (second highest - demonstrates the product)
   - Create or source demo video/GIF
   - Implement video player with fallback

3. **Add Product Tab Previews** (third - shows what users get)
   - Create screenshots of each product
   - Replace placeholders

4. **Fix Features Page** (fourth - adds credibility)
   - Add titles to all feature cards
   - Group by category

5. **Wire Contact Form** (fifth - captures leads)
   - Add validation
   - Connect to backend

6. **Production Polish** (final)
   - Meta tags, favicon, analytics
   - Performance optimization
   - Accessibility audit

---

## Commands to Run

```bash
# Development
cd apps/landing
pnpm dev

# Build
pnpm build --filter=@platform/landing

# Type check
pnpm typecheck --filter=@platform/landing

# Lint
pnpm lint --filter=@platform/landing
```

---

## Success Metrics

After implementation, the landing page should achieve:

1. **Clarity** - Visitor understands what VisualKit does within 5 seconds
2. **Differentiation** - "AI that sees screens" is immediately clear
3. **Trust** - Security badges visible before scroll
4. **Action** - Clear path to "See It In Action" or "Start Free Trial"
5. **Information** - Pricing is transparent and complete
6. **Performance** - Loads fast, looks professional

---

## Notes for Claude Code

- Preserve the existing dark theme and styling patterns
- Use the existing shadcn/ui Button component
- Keep all Lucide icons consistent
- Test on mobile - ensure responsive breakpoints work
- The URL config is in `src/config/urls.ts` - use `appUrls.signup`, `appUrls.meeting`, etc.
- Build must pass before committing: `pnpm build --filter=@platform/landing`