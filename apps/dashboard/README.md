# Dashboard App - Admin Portal

> Enterprise admin dashboard with AI chat, real-time WebSocket chat, and comprehensive platform management.

**Status**: ✅ Production Ready (Phase 4 Complete - 2025-10-07)

## Features

### 🤖 Dual-Mode Chat Interface (Phase 6 Complete)
- **AI Chat**: Cost-optimized 75% reduction (GPT-4o-mini + GPT-4o routing)
- **Real-Time Chat**: WebSocket bidirectional chat with Redis Streams
- **Unified UI**: Single interface for both chat modes with mode switching

### 📊 Management Features
- **Knowledge Base**: Upload documents, configure RAG system
- **Team Management**: User invites, role assignment, permissions
- **Analytics**: Usage metrics, cost tracking, session analytics
- **Widget Configuration**: Customize embeddable widget appearance
- **Settings**: Account preferences, integrations, API keys

### 🎨 UI Components (Phase 4 Complete)
- **16 shadcn/ui components**: Radix UI + Tailwind CSS v4
- **Dark Mode**: System preference detection with manual override
- **Responsive Design**: Mobile-first, works on all screen sizes
- **Accessibility**: WCAG 2.1 AA compliance

## Quick Start

```bash
# Development
pnpm dev:dashboard

# Production build
pnpm --filter @platform/dashboard build

# Type checking
pnpm --filter @platform/dashboard typecheck
```

Access at: http://localhost:5174

## Technology Stack

- **Framework**: React 18 + Vite 6
- **Language**: TypeScript 5.7 (strict mode)
- **UI Library**: shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS v4 with CSS-first configuration
- **State Management**: React hooks + Context API
- **API Client**: tRPC v11 client with React Query
- **Real-time**: WebSocket client with auto-reconnection
- **Build**: Vite with SWC transpilation

## Bundle Size

- **Development**: Hot reload <100ms
- **Production**: 410 KB total (optimized)
- **Gzipped**: ~130 KB
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1

## Features by Page

### Home Page
- Platform overview and quick stats
- Recent activity feed
- Quick actions dashboard

### Conversations Page
- Session history with search and filters
- Conversation details with message replay
- Export and analytics

### Knowledge Page
- Document upload (PDF, DOCX, TXT, MD)
- RAG configuration and testing
- Embedding status and metrics

### Team Page
- User management and invites
- Role assignment (Owner, Admin, Member)
- Activity logs

### Settings Page
- Account preferences
- OAuth connections (Google, Microsoft)
- MFA setup (TOTP)
- API key management
- Webhook configuration

### Widget Config Page
- Appearance customization
- Behavior settings
- Integration code snippets

## Authentication

- **Auth.js**: OAuth providers (Google, Microsoft)
- **Session Management**: 30-day expiration with 24-hour refresh
- **MFA**: TOTP support for enhanced security
- **Role-Based Access**: Owner > Admin > Member hierarchy

## Development

### Environment Variables

```env
# API endpoints
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002

# Feature flags
VITE_ENABLE_MFA=true
VITE_ENABLE_ANALYTICS=true
```

### Project Structure

```
apps/dashboard/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ChatWidget.tsx     # AI + Real-time chat interface
│   │   ├── ErrorBoundary.tsx  # Error handling
│   │   └── ...
│   ├── layouts/           # Page layouts
│   │   └── DashboardLayout.tsx  # Main dashboard shell
│   ├── pages/             # Route pages
│   │   ├── HomePage.tsx
│   │   ├── ConversationsPage.tsx
│   │   ├── KnowledgePage.tsx
│   │   ├── TeamPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── WidgetConfigPage.tsx
│   ├── utils/             # Utilities and helpers
│   │   ├── trpc.ts        # tRPC client setup
│   │   └── websocket.ts   # WebSocket client
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── main.css           # Global styles
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Performance Optimizations

- **Code Splitting**: Route-based lazy loading
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image compression and lazy loading
- **Cache Strategy**: HTTP caching for static assets
- **Bundle Analysis**: Regular monitoring and optimization

## Security

- **HTTPS Only**: Enforced in production
- **CSRF Protection**: Built into Auth.js
- **XSS Prevention**: React automatic escaping
- **Content Security Policy**: Configured for production
- **Dependency Scanning**: Automated vulnerability checks

## Testing

```bash
# Unit tests
pnpm --filter @platform/dashboard test

# E2E tests
pnpm --filter @platform/dashboard test:e2e

# Type checking
pnpm --filter @platform/dashboard typecheck
```

## Deployment

### Production Build

```bash
# Build for production
pnpm --filter @platform/dashboard build

# Preview production build
pnpm --filter @platform/dashboard preview
```

### Environment Configuration

Set `VITE_API_URL` and `VITE_WS_URL` to production endpoints before building.

## Documentation

- [Dashboard Implementation](../../docs/implementation/phase-4-frontend-development.md)
- [tRPC Integration](../../docs/guides/integration.md)
- [Component Patterns](../../docs/guides/components.md)
- [AI Chat Integration](../../docs/guides/ai-integration.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/platform/issues)
- **Documentation**: See `docs/` directory
- **Architecture**: `docs/architecture/system-design.md`

---

**Built with React 18 + Vite 6 + TypeScript 5.7 + Tailwind CSS v4**
