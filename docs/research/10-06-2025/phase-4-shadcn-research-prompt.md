# Phase 4 Frontend Implementation Research Prompt

**Date**: 2025-10-06
**Phase**: Phase 4 - Frontend Application Implementation
**Status**: Pre-implementation research
**Context**: Turborepo monorepo with pnpm + Vite 6 + React 18 + Tailwind v4 + shadcn/ui

---

## 🎯 Research Objective

Conduct comprehensive research on implementing shadcn/ui in a Turborepo monorepo with Tailwind CSS v4, focusing on production-ready patterns for our specific architecture:

**Our Stack**:
- **Monorepo**: Turborepo + pnpm workspaces
- **Apps**: 4 React apps (landing, dashboard, meeting, widget-sdk)
- **Shared UI**: `packages/ui` component library
- **Framework**: React 18.3.1 + Vite 6.0.13 + TypeScript 5.7.2
- **CSS**: Tailwind CSS v4.1.14 (CSS-first, hybrid installation)
- **UI Components**: shadcn/ui (copy-paste approach)
- **Backend**: tRPC v11 + Fastify 5.3.2+ (already implemented - Phase 3)

---

## 📚 Research Areas

### 1. shadcn/ui in Turborepo Monorepos (2025)

**Critical Questions**:

1. **Installation Strategy**:
   - Where should shadcn/ui CLI be installed in a monorepo? Root vs packages/ui vs each app?
   - How to configure shadcn to work with a shared `packages/ui` library?
   - What's the best approach: centralized components in `packages/ui` or per-app installation?
   - Does shadcn/ui support monorepo workspaces natively?

2. **Tailwind v4 Compatibility**:
   - Is shadcn/ui fully compatible with Tailwind CSS v4.1.14?
   - Does shadcn work with CSS-first `@theme` directive configuration?
   - Are there breaking changes from v3 that affect shadcn components?
   - How to handle `@source` directives with shadcn components?

3. **Component Architecture**:
   - Best practices for shared components across 4 apps
   - How to customize shadcn components for multi-tenant use cases
   - Component composition patterns for enterprise SaaS
   - Theming strategy across different apps (landing vs dashboard vs meeting)

**Search Queries**:
```
"shadcn/ui turborepo monorepo 2025"
"shadcn/ui pnpm workspace setup"
"shadcn/ui tailwind v4 compatibility"
"shadcn/ui shared component library monorepo"
"shadcn/ui components.json turborepo"
"shadcn/ui multi-app architecture"
```

---

### 2. Tailwind CSS v4 + shadcn/ui Integration

**Critical Questions**:

1. **Configuration Conflicts**:
   - Does shadcn/ui expect `tailwind.config.js`? (we use CSS-first `@theme`)
   - How to adapt shadcn components to work without JavaScript config?
   - Are there any `@apply` directives in shadcn that conflict with v4?
   - PostCSS requirements from shadcn (we don't use PostCSS in v4)

2. **Design System Integration**:
   - How to override shadcn default colors with our `@theme` oklch colors?
   - Best practices for maintaining design system consistency
   - Component variant management with class-variance-authority
   - Dark mode implementation with v4 CSS variables

3. **Performance Considerations**:
   - Does shadcn impact Tailwind v4's 100x faster incremental builds?
   - Component tree-shaking and bundle size optimization
   - CSS file size with full shadcn component set
   - Build performance benchmarks

**Search Queries**:
```
"tailwind css v4 shadcn/ui compatibility 2025"
"shadcn/ui without tailwind.config.js"
"shadcn/ui @theme directive CSS-first"
"shadcn/ui @apply directives tailwind v4"
"shadcn/ui performance bundle size"
"tailwind v4 oklch colors shadcn"
```

---

### 3. React 18 + Vite 6 Best Practices (2025)

**Critical Questions**:

1. **Vite 6 Optimizations**:
   - Latest Vite 6 optimizations for React apps (2025)
   - Module preloading strategies for SaaS dashboard
   - Code splitting best practices for multi-page apps
   - Asset optimization (images, fonts, icons)

2. **React 18 Patterns**:
   - Server Components vs Client Components (for future Next.js migration)
   - Concurrent rendering patterns for real-time features
   - Suspense boundaries for data fetching (tRPC integration)
   - Error boundaries for production resilience

3. **Development Experience**:
   - Hot Module Replacement (HMR) optimization
   - TypeScript performance in large monorepos
   - Debugging tools and DevTools integration
   - Testing setup (Vitest + Playwright)

**Search Queries**:
```
"vite 6 react 18 best practices 2025"
"vite 6 production optimization techniques"
"react 18 concurrent rendering saas dashboard"
"vite turborepo performance optimization"
"vite 6 code splitting strategies"
```

---

### 4. tRPC React Integration Patterns

**Critical Questions**:

1. **React Query Integration**:
   - Latest @tanstack/react-query patterns (v5.60.5)
   - Optimistic updates for real-time UX
   - Cache invalidation strategies
   - Pagination and infinite scroll

2. **Type Safety**:
   - AppRouter type inference across packages
   - Form validation with Zod + tRPC
   - Error handling patterns
   - Loading states and skeleton UI

3. **Performance**:
   - Request batching configuration
   - Prefetching strategies
   - Background refetching policies
   - Memory management for long-running sessions

**Search Queries**:
```
"trpc v11 react query best practices 2025"
"trpc react hooks patterns enterprise"
"trpc optimistic updates real-time"
"trpc react form validation zod"
"trpc prefetching strategies vite"
```

---

### 5. Authentication UX Patterns (Auth.js)

**Critical Questions**:

1. **OAuth Flow UX**:
   - Best UX patterns for OAuth (Google, Microsoft)
   - Loading states during authentication
   - Error handling and user feedback
   - Redirect URL management in multi-app setup

2. **Session Management**:
   - Session refresh strategies
   - Logout across multiple apps
   - "Remember me" implementation
   - Session timeout warnings

3. **Protected Routes**:
   - Route guard patterns in React Router v6
   - Role-based access control (RBAC) UI
   - Permission-based component rendering
   - Unauthorized state handling

**Search Queries**:
```
"auth.js react oauth ux patterns 2025"
"nextauth v5 react router integration"
"oauth loading states best practices"
"rbac ui patterns react 2025"
"session management multi-tenant saas"
```

---

### 6. Multi-Tenant SaaS UI Patterns

**Critical Questions**:

1. **Tenant Context**:
   - How to display tenant information in UI
   - Tenant switching UX patterns
   - Tenant-aware component design
   - Data isolation visual indicators

2. **Dashboard Design**:
   - Modern SaaS dashboard layouts (2025 trends)
   - Analytics visualization libraries
   - Real-time data display patterns
   - Responsive navigation patterns

3. **Settings & Configuration**:
   - Settings page architecture
   - Form management patterns (react-hook-form?)
   - Bulk operations UI
   - Import/export features

**Search Queries**:
```
"multi-tenant saas ui patterns 2025"
"tenant switching ux best practices"
"modern dashboard design patterns 2025"
"saas settings page architecture"
"react dashboard component libraries 2025"
```

---

### 7. Accessibility (WCAG 2.1 AA)

**Critical Questions**:

1. **shadcn/ui Accessibility**:
   - WCAG compliance in shadcn components
   - Keyboard navigation patterns
   - Screen reader support
   - Focus management

2. **Testing Tools**:
   - Automated accessibility testing (axe-core?)
   - Manual testing workflows
   - CI/CD integration for a11y checks
   - Accessibility linting rules

3. **Common Pitfalls**:
   - Color contrast with custom themes
   - Form labels and ARIA attributes
   - Modal and dialog accessibility
   - Dynamic content announcements

**Search Queries**:
```
"shadcn/ui accessibility wcag 2.1 aa"
"react accessibility testing tools 2025"
"wcag compliance saas dashboard"
"axe-core vite integration"
"keyboard navigation patterns react"
```

---

### 8. Testing Strategy

**Critical Questions**:

1. **Unit Testing**:
   - Vitest setup for React components
   - Testing shadcn/ui components
   - Mock strategies for tRPC
   - Test coverage targets (80%+)

2. **Integration Testing**:
   - Testing user workflows
   - Auth flow testing
   - Form submission testing
   - API integration tests

3. **E2E Testing**:
   - Playwright setup in Turborepo
   - Cross-browser testing strategy
   - Visual regression testing
   - CI/CD pipeline integration

**Search Queries**:
```
"vitest react testing library 2025 best practices"
"playwright turborepo monorepo setup"
"testing trpc react components"
"visual regression testing vite"
"e2e testing multi-tenant saas"
```

---

### 9. Performance Budgets & Optimization

**Critical Questions**:

1. **Bundle Size**:
   - Target bundle sizes for SaaS dashboard
   - Code splitting strategies
   - Tree shaking verification
   - Dynamic imports patterns

2. **Runtime Performance**:
   - Core Web Vitals targets
   - React rendering optimization
   - Memory leak prevention
   - Long-running session optimization

3. **Monitoring**:
   - Client-side performance monitoring tools
   - Error tracking (Sentry?)
   - User analytics integration
   - Performance budgets in CI/CD

**Search Queries**:
```
"react performance optimization 2025"
"core web vitals saas dashboard"
"bundle size optimization vite 6"
"performance monitoring tools react 2025"
"memory leak detection react"
```

---

### 10. Real-Time Features UI

**Critical Questions**:

1. **WebSocket Integration**:
   - React patterns for WebSocket connections
   - Connection state UI indicators
   - Reconnection handling UX
   - Message queuing on disconnect

2. **Optimistic UI**:
   - Optimistic updates for chat
   - Conflict resolution strategies
   - Rollback UX patterns
   - Loading states for real-time actions

3. **LiveKit Integration** (Phase 5 prep):
   - React components for video/audio
   - Screen sharing UI patterns
   - Participant management UI
   - Recording indicators

**Search Queries**:
```
"websocket react patterns 2025"
"optimistic ui updates react best practices"
"livekit react components integration"
"real-time chat ui patterns react"
"websocket reconnection ux"
```

---

### 11. Widget SDK Architecture

**Critical Questions**:

1. **Embeddable Widget Design**:
   - Shadow DOM isolation patterns
   - CSS scoping strategies
   - Parent window communication
   - Iframe vs Web Component approach

2. **Bundle Size**:
   - Minimal bundle targets (<100KB?)
   - Tree shaking for widget-only features
   - External dependencies handling
   - CDN delivery strategy

3. **API Design**:
   - Widget initialization API
   - Configuration options
   - Event system design
   - Version compatibility

**Search Queries**:
```
"embeddable widget react architecture 2025"
"shadow dom react components"
"widget sdk bundle size optimization"
"iframe vs web components 2025"
"cdn delivery react widgets"
```

---

### 12. Mobile Responsiveness

**Critical Questions**:

1. **Responsive Design**:
   - Mobile-first vs desktop-first approach
   - Breakpoint strategy with Tailwind v4
   - Touch-friendly UI patterns
   - Mobile navigation patterns

2. **Progressive Web App (PWA)**:
   - Should we implement PWA features?
   - Offline support strategies
   - Install prompts UX
   - Service worker patterns

3. **Mobile Performance**:
   - 3G network optimization
   - Image lazy loading
   - Font loading strategies
   - Touch event optimization

**Search Queries**:
```
"mobile-first design saas 2025"
"tailwind v4 responsive patterns"
"pwa react vite 2025"
"mobile performance optimization react"
"touch-friendly ui patterns"
```

---

## 🔍 Research Methodology

### Phase 1: Documentation Review (30 min)
1. Review official shadcn/ui documentation
2. Check Tailwind CSS v4 migration guides
3. Read Turborepo monorepo best practices
4. Review React 18 + Vite 6 optimization guides

### Phase 2: Community Research (45 min)
1. Search GitHub for similar monorepo setups
2. Review recent blog posts (2024-2025)
3. Check Stack Overflow recent questions
4. Review Discord/community discussions

### Phase 3: Hands-on Validation (30 min)
1. Test shadcn/ui CLI in monorepo structure
2. Verify Tailwind v4 compatibility
3. Check component customization options
4. Test build performance

### Phase 4: Synthesis (15 min)
1. Document findings in structured format
2. Identify potential blockers
3. Create implementation checklist
4. Note any architecture adjustments needed

---

## 📝 Expected Deliverables

### 1. Implementation Guide
- Step-by-step shadcn/ui setup for our monorepo
- Component organization strategy
- Customization patterns for our design system
- Migration path if needed

### 2. Best Practices Document
- React 18 patterns for our use cases
- tRPC integration patterns
- Testing strategies
- Performance optimization checklist

### 3. Risk Assessment
- Compatibility issues identified
- Performance concerns
- Accessibility gaps
- Testing challenges

### 4. Code Examples
- shadcn component customization examples
- tRPC + React Query patterns
- Auth flow implementations
- Responsive layout examples

---

## 🚨 Critical Success Criteria

Research must answer:

1. ✅ Can shadcn/ui work seamlessly with Tailwind v4.1.14 CSS-first configuration?
2. ✅ What's the optimal monorepo structure for shared components?
3. ✅ How to maintain 80%+ test coverage with shadcn components?
4. ✅ Are there performance impacts we need to mitigate?
5. ✅ What accessibility considerations are critical?
6. ✅ How to integrate with our existing tRPC backend?
7. ✅ What's the optimal build configuration for production?
8. ✅ Are there any blockers that would require architecture changes?

---

## 📚 Additional Context

### Project Structure Reference:
```
platform/
├── apps/
│   ├── landing/          # Public marketing (Next.js or Astro - TBD)
│   ├── dashboard/        # Admin portal (React + Vite)
│   ├── meeting/          # Meeting rooms (React + Vite + LiveKit)
│   └── widget-sdk/       # Embeddable widget (React + Vite)
├── packages/
│   ├── ui/               # Shared UI components (shadcn/ui target)
│   ├── api/              # Fastify + tRPC server (DONE - Phase 3)
│   ├── api-contract/     # tRPC router definitions (DONE - Phase 3)
│   ├── auth/             # Auth.js configuration (DONE - Phase 3)
│   └── db/               # Drizzle ORM schemas (DONE - Phase 2)
```

### Completed Phases:
- ✅ **Phase 1**: Project scaffolding
- ✅ **Phase 2**: Database + Auth + Security (15 tables, 70 RLS policies)
- ✅ **Phase 3**: Backend APIs (5 tRPC routers, 85% test coverage)
- 🚧 **Phase 4**: Frontend (READY TO START - need research first)

### Technology Constraints:
- **Static Version Pinning**: No `^` or `~` ranges allowed
- **TypeScript Strict Mode**: All code must pass strict checks
- **80% Test Coverage**: Minimum requirement
- **WCAG 2.1 AA**: Accessibility compliance mandatory
- **Enterprise Quality**: Production-grade patterns only

---

## 🎯 Time Budget

- **Total Research Time**: ~2 hours
- **Documentation Writing**: 30 min
- **Implementation Planning**: 30 min
- **Total**: ~3 hours before starting Phase 4 development

---

## 📞 Follow-up Questions

After research, we need to answer:

1. Do we need to adjust our Tailwind v4 setup for shadcn?
2. Should we modify the monorepo structure?
3. Are there additional dependencies required?
4. What's the optimal component development workflow?
5. Any build configuration changes needed?
6. Testing infrastructure adjustments?
7. Documentation templates for components?

---

**Research Priority**: HIGH - This research blocks Phase 4 implementation start
**Assigned To**: Claude (Web Research Mode)
**Due Date**: Before Phase 4 Week 1 Day 1
**Success Metric**: Clear, actionable implementation plan with zero blockers

---

## 🔗 References

- Project Documentation: `/docs/implementation/PHASE_4_READINESS.md`
- Tailwind v4 Setup: `/docs/reference/tailwind-v4-setup.md`
- Phase 3 Summary: `/docs/implementation/phase-3-implementation.md`
- Architecture: `/docs/architecture/system-design.md`
- Roadmap: `/docs/guides/roadmap.md`




## RESEARCH RESULTS:
# Phase 4 Frontend Implementation Guide: Production Multi-Tenant SaaS Platform

## Critical Compatibility Status: shadcn/ui + Tailwind v4.1.14

**✅ OFFICIALLY SUPPORTED** as of February 2025. shadcn/ui works with Tailwind CSS v4.1.14 CSS-first @theme configuration via the canary CLI. This is production-ready with live implementations at v4.shadcn.com.

### Critical Browser Requirements

Tailwind v4 requires modern browsers due to native CSS features:
- **Safari 16.4+** (March 2023)
- **Chrome 111+** (March 2023)  
- **Firefox 128+** (July 2024)

**Decision Point**: If >5% of your users are on older browsers (especially Safari 15 or iOS 15), stay on Tailwind v3 until broader compatibility arrives. Check your analytics before proceeding.

### Architecture Decision Summary

**Monorepo Structure**: Shared `packages/ui` library consuming shadcn components, distributed to 4 React apps (landing, dashboard, meeting, widget-sdk).

**Widget Architecture**: Shadow DOM with Custom Elements - NOT iframe. This is 2025 industry standard for embeddable widgets with superior performance and CSS isolation.

**Testing Requirements**: 80%+ coverage with Vitest + Playwright, automated accessibility testing with axe-core.

**Performance Budgets**: Main app <200KB gzipped, Widget SDK <100KB gzipped, Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1.

---

## Part 1: shadcn/ui + Tailwind v4 Implementation Guide

### Installation Strategy

**Recommended**: Install shadcn in `packages/ui` as shared component library.

**Step-by-Step Setup:**

```bash
# 1. Create packages/ui directory structure
mkdir -p packages/ui/src/{components,hooks,lib,styles}
cd packages/ui

# 2. Install dependencies
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D tailwindcss@next @tailwindcss/vite@next typescript

# 3. Initialize shadcn with Tailwind v4 support
pnpm dlx shadcn@canary init
```

**packages/ui/package.json**:
```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./styles/*": "./src/styles/*.css"
  },
  "dependencies": {
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.1",
    "tailwind-merge": "2.4.0",
    "lucide-react": "0.400.0",
    "@radix-ui/react-slot": "1.1.0"
  },
  "peerDependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

### Tailwind v4 CSS-First Configuration

**packages/ui/src/styles/globals.css**:
```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --primary: hsl(0 0% 9%);
  --primary-foreground: hsl(0 0% 98%);
  --radius: 0.5rem;
}

.dark {
  --background: hsl(240 10% 3.9%);
  --foreground: hsl(0 0% 98%);
  --primary: hsl(0 0% 98%);
  --primary-foreground: hsl(240 5.9% 10%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

**Key Changes from v3**:
- No `tailwind.config.js` file required
- Colors wrapped in `hsl()` in CSS (not in config)
- `@theme inline` maps CSS variables to Tailwind namespace
- `@custom-variant` replaces `darkMode: 'class'`
- Use `tw-animate-css` instead of deprecated `tailwindcss-animate`

### Monorepo Component Sharing

**packages/ui/components.json**:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@repo/ui/components",
    "utils": "@repo/ui/lib/utils",
    "ui": "@repo/ui/components/ui"
  }
}
```

**packages/ui/tsconfig.json**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@repo/ui/components/*": ["./src/components/*"],
      "@repo/ui/lib/*": ["./src/lib/*"]
    },
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Adding Components**:
```bash
# From packages/ui
pnpm dlx shadcn@canary add button card input dialog

# Export in packages/ui/src/index.ts
export { Button } from './components/ui/button';
export { Card, CardHeader, CardContent } from './components/ui/card';
export { cn } from './lib/utils';
```

### App Integration

**apps/dashboard/package.json**:
```json
{
  "name": "@repo/dashboard",
  "dependencies": {
    "@repo/ui": "workspace:*",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

**apps/dashboard/tailwind.config.ts**:
```typescript
import type { Config } from 'tailwindcss';
import sharedConfig from '@repo/ui/tailwind.config';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    // CRITICAL: Include UI package
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [sharedConfig],
  theme: {
    extend: {
      // App-specific overrides
      colors: {
        brand: 'hsl(220 90% 50%)',
      }
    }
  }
};

export default config;
```

**apps/dashboard/src/main.css**:
```css
@import '@repo/ui/styles/globals.css';

/* App-specific theme overrides */
:root {
  --brand: 220 90% 50%;
}
```

**Vite Configuration for Apps**:
```typescript
// apps/dashboard/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/ui': path.resolve(__dirname, '../../packages/ui/src')
    }
  },
  optimizeDeps: {
    include: ['@repo/ui']
  }
});
```

### Multi-Tenant Theming Strategy

**Pattern 1: CSS Variable Overrides (Recommended)**

```css
/* apps/landing/src/app.css */
@import '@repo/ui/styles/globals.css';

:root {
  --primary: 270 95% 60%; /* Purple for landing */
}

/* apps/dashboard/src/app.css */
@import '@repo/ui/styles/globals.css';

:root {
  --primary: 200 98% 39%; /* Blue for dashboard */
}
```

**Pattern 2: Theme Provider for Runtime Switching**

```typescript
// packages/ui/src/providers/theme-provider.tsx
import { createContext, useContext } from 'react';

type TenantTheme = {
  tenantId: string;
  primaryColor: string;
  logo: string;
};

const ThemeContext = createContext<TenantTheme | null>(null);

export function TenantThemeProvider({ 
  theme, 
  children 
}: { 
  theme: TenantTheme; 
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={theme}>
      <div 
        data-tenant={theme.tenantId}
        style={{ 
          '--primary': theme.primaryColor 
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
```

### CVA Component Variants

```typescript
// packages/ui/src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@repo/ui/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = ({ variant, size, className, ...props }: ButtonProps) => {
  return (
    <button 
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};
```

**Note**: CVA works identically with Tailwind v3 and v4 - no changes needed.

---

## Part 2: React 18 + Vite 6 + TypeScript Best Practices

### Vite 6 Optimizations

**Key Vite 6 Features (Released November 2024)**:
- Experimental Environment API for multi-environment support
- Native ESM performance improvements
- Sass modern API by default
- Rolldown integration path (experimental)
- 17M weekly npm downloads (up from 7.5M in 2023)

**Optimal Vite Config for Production SaaS**:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // Use SWC for performance
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true
    }),
    tailwindcss()
  ],
  
  build: {
    // Target modern browsers (baseline-widely-available)
    target: 'esnext',
    
    // Manual chunking for optimal caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'data-vendor': ['@tanstack/react-query', '@trpc/client']
        }
      }
    },
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Source maps for production debugging
    sourcemap: true
  },
  
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@tanstack/react-query',
      '@trpc/client'
    ]
  },
  
  // Performance: Enable caching
  cacheDir: 'node_modules/.vite'
});
```

### Code Splitting Strategies

**Route-Based Code Splitting**:

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Component-Level Code Splitting**:

```typescript
// Heavy chart component loaded on demand
const AnalyticsChart = lazy(() => import('./components/AnalyticsChart'));

function DashboardPage() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>View Analytics</button>
      {showChart && (
        <Suspense fallback={<Spinner />}>
          <AnalyticsChart />
        </Suspense>
      )}
    </div>
  );
}
```

### React 18 Concurrent Features

**useTransition for Non-Urgent Updates**:

```typescript
import { useTransition, useState } from 'react';

function SearchComponent() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleSearch = (value: string) => {
    setQuery(value); // Urgent: update input immediately
    
    startTransition(() => {
      // Non-urgent: can be interrupted
      const filtered = expensiveSearch(value);
      setResults(filtered);
    });
  };
  
  return (
    <>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```

**useDeferredValue for Expensive Rendering**:

```typescript
import { useDeferredValue, useMemo } from 'react';

function FilterableList({ items, query }) {
  // Defer filtering to avoid blocking input
  const deferredQuery = useDeferredValue(query);
  
  const filteredItems = useMemo(() => 
    items.filter(item => item.name.includes(deferredQuery)),
    [items, deferredQuery]
  );
  
  return (
    <div>
      {filteredItems.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}
```

### Error Boundaries for Production

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div>
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### TypeScript 5.7.2 Configuration for Monorepo

**tsconfig.base.json** (root):
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "composite": true,
    "incremental": true
  }
}
```

**Performance Tips**:
- Enable `composite: true` for project references
- Use `skipLibCheck: true` to speed up builds
- Set `incremental: true` for faster rebuilds
- Avoid barrel files (index.ts exports) - import directly from source

---

## Part 3: tRPC v11 + React Query v5 Integration

### tRPC Client Setup

**New TanStack Integration (2025 Recommended)**:

```typescript
// utils/trpc.ts
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '@server/router';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
```

**App Setup with Query Client**:

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { TRPCProvider } from './utils/trpc';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    mutations: {
      retry: 1
    }
  }
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:2022/trpc',
      maxURLLength: 2083,
      maxBatchSize: 10
    })
  ]
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {/* Your app */}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
```

### Data Fetching Patterns

**Basic Query**:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from './utils/trpc';

function UserProfile() {
  const trpc = useTRPC();
  
  const { data, isLoading, error } = useQuery(
    trpc.users.getById.queryOptions({ id: '123' })
  );
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>Hello, {data.name}!</div>;
}
```

**Optimistic Updates**:

```typescript
function useUpdateTodo() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  return useMutation({
    ...trpc.todos.update.mutationOptions(),
    onMutate: async (newTodo) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: trpc.todos.list.queryKey() 
      });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(
        trpc.todos.list.queryKey()
      );
      
      // Optimistically update
      queryClient.setQueryData(
        trpc.todos.list.queryKey(),
        (old) => old?.map(todo => 
          todo.id === newTodo.id ? { ...todo, ...newTodo } : todo
        )
      );
      
      return { previous };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(
        trpc.todos.list.queryKey(),
        context?.previous
      );
      toast.error('Update failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: trpc.todos.list.queryKey() 
      });
    }
  });
}
```

**Infinite Scroll / Cursor Pagination**:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function PostList() {
  const trpc = useTRPC();
  
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    ...trpc.posts.list.infiniteQueryOptions({ limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined
  });
  
  return (
    <div>
      {data?.pages.map((page) => 
        page.items.map((post) => <PostCard key={post.id} post={post} />)
      )}
      
      <button 
        onClick={() => fetchNextPage()} 
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}
```

### Form Integration with Zod

**Shared Schema (monorepo pattern)**:

```typescript
// packages/api-schemas/src/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'member'])
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

**Server (tRPC procedure)**:

```typescript
import { createUserSchema } from '@schemas/user.schema';

export const usersRouter = router({
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input, ctx }) => {
      return await ctx.db.user.create({ data: input });
    })
});
```

**Client (React Hook Form)**:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type CreateUserInput } from '@schemas/user.schema';

function CreateUserForm() {
  const trpc = useTRPC();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema)
  });
  
  const createUser = useMutation({
    ...trpc.users.create.mutationOptions(),
    onSuccess: () => {
      toast.success('User created');
    }
  });
  
  return (
    <form onSubmit={handleSubmit((data) => createUser.mutate(data))}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <input type="email" {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <select {...register('role')}>
        <option value="admin">Admin</option>
        <option value="member">Member</option>
      </select>
      
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

---

## Part 4: Authentication & Multi-Tenant Patterns

### Auth.js OAuth Implementation

**Configuration**:

```typescript
// auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Microsoft from 'next-auth/providers/microsoft';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    Microsoft({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      authorization: {
        params: { scope: 'openid profile email User.Read' }
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Multi-app redirect handling
      const allowedApps = [
        'dashboard.app.com',
        'meeting.app.com',
        'landing.app.com'
      ];
      
      const urlObj = new URL(url);
      if (allowedApps.some(app => urlObj.hostname.includes(app))) {
        return url;
      }
      
      return baseUrl;
    }
  }
});
```

**Protected Routes (React Router v6)**:

```typescript
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <LoadingScreen />;
  
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  return children || <Outlet />;
}

// Usage
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<RequireAuth />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
</Routes>
```

**RBAC Implementation**:

```typescript
function usePermissions() {
  const { user } = useAuth();
  
  return {
    hasPermission: (perm: string) => 
      user?.permissions?.includes(perm) ?? false,
    hasRole: (role: string) => 
      user?.roles?.includes(role) ?? false
  };
}

// Component-level permission check
function Can({ permission, children }) {
  const { hasPermission } = usePermissions();
  return hasPermission(permission) ? children : null;
}

// Usage
<Can permission="create:documents">
  <button>Create Document</button>
</Can>
```

### Tenant Context Management

**Tenant Provider**:

```typescript
// contexts/TenantContext.tsx
import { createContext, useContext, useState } from 'react';

interface Tenant {
  id: string;
  name: string;
  logo: string;
  plan: string;
}

interface TenantContextValue {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  switchTenant: (tenantId: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  const switchTenant = async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      // Store in localStorage/cookie
      localStorage.setItem('currentTenantId', tenantId);
      // Refresh app data for new tenant
      window.location.reload();
    }
  };
  
  return (
    <TenantContext.Provider value={{ currentTenant, tenants, switchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
};
```

**Tenant Switcher UI (2025 Pattern)**:

```typescript
import { Popover, PopoverTrigger, PopoverContent } from '@repo/ui/components/ui/popover';

function TenantSwitcher() {
  const { currentTenant, tenants, switchTenant } = useTenant();
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
          <img src={currentTenant?.logo} className="size-6 rounded" />
          <span>{currentTenant?.name}</span>
          <ChevronDownIcon />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <p className="text-sm font-medium px-2">Switch organization</p>
          {tenants.map(tenant => (
            <button
              key={tenant.id}
              onClick={() => switchTenant(tenant.id)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100
                ${tenant.id === currentTenant?.id ? 'bg-blue-50' : ''}`}
            >
              <img src={tenant.logo} className="size-8 rounded" />
              <div className="flex-1 text-left">
                <div className="font-medium">{tenant.name}</div>
                <div className="text-sm text-gray-500">{tenant.plan}</div>
              </div>
              {tenant.id === currentTenant?.id && <CheckIcon />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Part 5: Testing Strategy (80%+ Coverage)

### Vitest Configuration

**vitest.config.ts**:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8', // Recommended: 10x faster than istanbul
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
```

**Setup File**:

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);
afterEach(() => cleanup());
```

### Testing shadcn/ui Components

```typescript
// components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@repo/ui/components/ui/button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('applies variant styles', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });
});
```

### Testing tRPC with MSW

```typescript
// test/trpc-msw.ts
import { createTRPCMsw } from 'msw-trpc';
import type { AppRouter } from '@server/router';

export const trpcMsw = createTRPCMsw<AppRouter>();
```

```typescript
// components/UserProfile.test.tsx
import { setupServer } from 'msw/node';
import { trpcMsw } from '../test/trpc-msw';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('displays user name', async () => {
  server.use(
    trpcMsw.users.getById.query(() => ({
      id: '1',
      name: 'John Doe'
    }))
  );
  
  render(<UserProfile userId="1" />);
  
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### Playwright E2E Testing

**playwright.config.ts**:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

**E2E Test Example**:

```typescript
// tests/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can login and access dashboard', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

---

## Part 6: Accessibility (WCAG 2.1 AA)

### shadcn/ui Accessibility Status

**Built on Radix UI** (WCAG compliant):
- ✅ WAI-ARIA compliant
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support

**Required Additions**:

```tsx
// Icon-only buttons need aria-label
<button aria-label="Close dialog">
  <X className="size-4" aria-hidden="true" />
</button>

// Verify color contrast for custom themes
// Minimum: 4.5:1 for normal text, 3:1 for large text
```

### Automated Accessibility Testing

**vitest-axe**:

```typescript
// Button.test.tsx
import { axe } from 'vitest-axe';

test('no a11y violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Playwright + axe-core**:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('homepage accessibility', async ({ page }) => {
  await page.goto('/');
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  expect(results.violations).toEqual([]);
});
```

### ESLint Accessibility Linting

```javascript
// eslint.config.js (ESLint 9)
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/label-has-associated-control': 'error'
    }
  }
];
```

### Common Accessibility Patterns

**Form Labels**:

```tsx
<Label htmlFor="email">Email</Label>
<Input 
  id="email"
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && <span id="email-error" role="alert">{error}</span>}
```

**Skip Links**:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
<main id="main-content" tabIndex={-1}>
  {/* Content */}
</main>
```

**Live Regions for Dynamic Content**:

```tsx
// Status messages
<div role="status" aria-live="polite">Form saved</div>

// Error alerts
<div role="alert" aria-live="assertive">Error occurred</div>
```

---

## Part 7: Widget SDK Architecture

### Decision: Shadow DOM (2025 Best Practice)

**Why Shadow DOM over iframe:**
- ✅ No iframe height/scroll issues
- ✅ Better performance (same rendering context)
- ✅ Native browser API
- ✅ CSS isolation prevents conflicts
- ✅ Easy parent communication (no postMessage)

### Implementation

**widget-sdk/src/widget.ts**:

```typescript
import { createRoot } from 'react-dom/client';
import { WidgetApp } from './WidgetApp';

class SaaSWidget extends HTMLElement {
  private root: ReturnType<typeof createRoot> | null = null;
  
  connectedCallback() {
    // Create shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });
    
    // Inject styles
    const style = document.createElement('style');
    style.textContent = widgetStyles; // CSS string from build
    shadow.appendChild(style);
    
    // Create React root
    const container = document.createElement('div');
    shadow.appendChild(container);
    
    this.root = createRoot(container);
    this.root.render(
      <WidgetApp 
        apiKey={this.getAttribute('api-key')}
        tenantId={this.getAttribute('tenant-id')}
      />
    );
  }
  
  disconnectedCallback() {
    this.root?.unmount();
  }
}

// Register custom element
customElements.define('saas-widget', SaaSWidget);

// Global API
window.SaaSWidget = {
  init: (config) => {
    const widget = document.createElement('saas-widget');
    Object.entries(config).forEach(([key, value]) => {
      widget.setAttribute(key, String(value));
    });
    document.body.appendChild(widget);
  }
};
```

**Vite Config for Widget (<100KB target)**:

```typescript
// widget-sdk/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/widget.ts',
      name: 'SaaSWidget',
      fileName: 'widget',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        passes: 2
      }
    }
  }
});
```

**To achieve <100KB: Use Preact (3KB) instead of React (40KB)**:

```typescript
// Replace React with Preact in widget
import { render } from 'preact';
import { WidgetApp } from './WidgetApp';

// Save ~37KB gzipped
```

### Widget Integration Examples

**Script Tag**:
```html
<script src="https://cdn.yourapp.com/widget.js"></script>
<saas-widget api-key="pk_123" tenant-id="tenant_456"></saas-widget>
```

**JavaScript API**:
```javascript
<script src="https://cdn.yourapp.com/widget.js"></script>
<script>
  SaaSWidget.init({
    apiKey: 'pk_123',
    tenantId: 'tenant_456',
    position: 'bottom-right'
  });
</script>
```

**NPM Package**:
```typescript
import { SaaSWidget } from '@yourapp/widget-sdk';

SaaSWidget.init({
  apiKey: 'pk_123',
  tenantId: 'tenant_456'
});
```

---

## Part 8: Performance Optimization

### Bundle Size Targets (2025)

- **Main App**: <200KB gzipped
- **Widget SDK**: <100KB gzipped
- **Per-route**: 50-100KB

### Core Web Vitals Targets

- **LCP** (Largest Contentful Paint): ≤2.5s
- **INP** (Interaction to Next Paint): ≤200ms (replaced FID in 2024)
- **CLS** (Cumulative Layout Shift): ≤0.1

### Optimization Checklist

**Code Splitting**:
- ✅ Route-based with React.lazy
- ✅ Component-level for heavy features
- ✅ Manual chunks for vendor libraries

**React Optimization**:
- ✅ React.memo for expensive components
- ✅ useCallback for stable function references
- ✅ useMemo for expensive calculations
- ✅ react-window for lists >100 items

**Asset Optimization**:
- ✅ WebP images with loading="lazy"
- ✅ Font optimization: woff2, font-display: swap
- ✅ SVG icons instead of icon fonts

**Memory Leak Prevention**:

```typescript
// Always cleanup in useEffect
useEffect(() => {
  const handler = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// Clear timers
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  return () => clearTimeout(timer);
}, []);

// Close WebSocket connections
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3000');
  return () => ws.close();
}, []);
```

### Monitoring Stack

| Tool | Purpose | Cost/Month | Rating |
|------|---------|------------|--------|
| Sentry | Error tracking | $26 | ⭐⭐⭐⭐⭐ |
| LogRocket | Session replay | $99 | ⭐⭐⭐⭐⭐ |
| PostHog | Analytics | Free | ⭐⭐⭐⭐⭐ |

**Sentry Setup**:

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

---

## Part 9: Mobile Responsiveness & PWA

### Strategy: Mobile-First

**Why mobile-first (2025 consensus):**
- 60%+ users access SaaS on mobile
- Better performance
- Forces prioritization of content

### Breakpoints (Tailwind v4)

```css
/* Default: mobile */
.container { padding: 1rem; }

/* sm: 640px */
@media (min-width: 640px) {
  .container { padding: 2rem; }
}

/* md: 768px */
@media (min-width: 768px) {
  .container { padding: 3rem; }
}
```

### Mobile Navigation Pattern

```tsx
function MobileNav() {
  return (
    <>
      {/* Bottom navigation for mobile */}
      <nav className="md:hidden fixed bottom-0 w-full border-t bg-white">
        <div className="flex justify-around p-2">
          <NavItem icon={<HomeIcon />} label="Home" />
          <NavItem icon={<SearchIcon />} label="Search" />
          <NavItem icon={<NotificationsIcon />} label="Alerts" />
          <NavItem icon={<UserIcon />} label="Profile" />
        </div>
      </nav>
      
      {/* Sidebar for desktop */}
      <aside className="hidden md:block w-64 border-r">
        <nav className="p-4 space-y-2">
          <NavItem icon={<HomeIcon />} label="Dashboard" />
          <NavItem icon={<UsersIcon />} label="Team" />
        </nav>
      </aside>
    </>
  );
}
```

### PWA Implementation

**Install vite-plugin-pwa**:

```bash
pnpm add -D vite-plugin-pwa
```

**vite.config.ts**:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SaaS Dashboard',
        short_name: 'Dashboard',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ],
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone'
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.yourapp\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          }
        ]
      }
    })
  ]
});
```

**Implement PWA if:**
- ✅ Sessions >30 minutes
- ✅ Mobile usage >30%
- ✅ Need offline functionality

---

## Part 10: Risk Assessment & Production Readiness

### Critical Compatibility Issues

**1. Tailwind v4 Browser Requirements**

**Risk Level: HIGH**

- Safari 16.4+ required (iOS 16.4+)
- Older browsers will have broken styling
- Features that fail: OKLCH colors, @property, container queries

**Mitigation**:
```bash
# Check your analytics for browser versions
# If >5% users on Safari <16.4, stay on Tailwind v3
```

**2. shadcn/ui Canary CLI**

**Risk Level: MEDIUM**

- CLI is in canary (not stable)
- API may change before stable release
- Stable release expected Q2 2025

**Mitigation**:
- Pin exact versions: `"shadcn-ui": "0.x.x"` (no ^ or ~)
- Test thoroughly before production
- Monitor GitHub releases

**3. React 18 + tRPC v11 Integration**

**Risk Level: LOW**

- Official TanStack integration is new (2024)
- Some community resources still use old patterns
- Well-tested by ecosystem

**Mitigation**:
- Use official `@trpc/tanstack-react-query` package
- Follow official documentation
- Test coverage >80%

### Performance Blockers

**1. Large Bundle Sizes**

**Issue**: Default React + shadcn + tRPC setup can exceed 300KB

**Solution**:
```typescript
// Implement aggressive code splitting
const Dashboard = lazy(() => import('./Dashboard'));

// Use manual chunks
manualChunks: {
  'react-vendor': ['react', 'react-dom'],
  'ui-vendor': ['@radix-ui/react-dialog']
}
```

**2. Memory Leaks in Long Sessions**

**Issue**: SaaS dashboards run for hours, leaks accumulate

**Solution**:
- Always cleanup event listeners in useEffect
- Test sessions >2 hours with Chrome DevTools Memory Profiler
- Implement session monitoring with LogRocket

### Architecture Changes Required

**None if following this guide**. The architecture is production-ready:

✅ Turborepo monorepo with pnpm workspaces
✅ Shared packages/ui library
✅ tRPC v11 with Fastify backend (already implemented)
✅ React Router v6 for routing
✅ Auth.js for authentication
✅ Shadow DOM for widget SDK

### Production Deployment Checklist

**Pre-Launch**:
- [ ] Browser compatibility verified (Safari 16.4+, Chrome 111+)
- [ ] Bundle sizes meet targets (<200KB main, <100KB widget)
- [ ] Core Web Vitals tested (LCP <2.5s, INP <200ms, CLS <0.1)
- [ ] 80%+ test coverage achieved
- [ ] WCAG 2.1 AA compliance verified with axe-core
- [ ] Security audit completed (no console.log with secrets)
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring enabled (LogRocket/PostHog)

**Post-Launch**:
- [ ] Monitor error rates daily
- [ ] Track Core Web Vitals in production
- [ ] Review session replays for UX issues
- [ ] Monitor bundle sizes in CI/CD
- [ ] Test long sessions >2 hours monthly

---

## Critical Success Criteria: Answered

### 1. Can shadcn/ui work with Tailwind v4.1.14 CSS-first @theme configuration?

**✅ YES** - Official support via canary CLI as of February 2025. Use `@theme inline` directive, wrap colors in `hsl()`, and use `@custom-variant` for dark mode. Browser requirements: Safari 16.4+, Chrome 111+, Firefox 128+.

### 2. Optimal monorepo structure for shared components across 4 apps?

**✅ ANSWERED** - Use `packages/ui` with shadcn components. Apps import via workspace references (`@repo/ui`). JIT transpilation with `transpilePackages` (Next.js) or Vite aliases. Share CSS variables, override per-app. Turborepo caching for fast builds.

### 3. How to maintain 80%+ test coverage with shadcn components?

**✅ STRATEGY PROVIDED** - Vitest with V8 coverage provider (10x faster). Test shadcn components with React Testing Library. Mock tRPC with MSW. Automated accessibility testing with vitest-axe. Playwright E2E tests. Set coverage thresholds in vitest.config.ts.

### 4. Any performance impacts to mitigate?

**✅ ADDRESSED** - Main risks: bundle size (use code splitting, manual chunks), memory leaks (cleanup useEffect), long sessions (monitor with LogRocket). Targets: <200KB main app, <100KB widget, LCP <2.5s, INP <200ms.

### 5. Critical accessibility considerations for WCAG 2.1 AA compliance?

**✅ CHECKLIST PROVIDED** - shadcn/ui is WCAG compliant via Radix UI. Add aria-labels to icon buttons. Verify 4.5:1 color contrast with custom themes. Automated testing with axe-core. Lint with eslint-plugin-jsx-a11y. Manual testing with NVDA/VoiceOver.

### 6. Integration patterns with existing tRPC v11 backend?

**✅ PATTERNS PROVIDED** - Use new `@trpc/tanstack-react-query` integration. HTTP batch link for request batching. Optimistic updates with cache management. Infinite queries for pagination. Shared Zod schemas in monorepo. React Hook Form integration.

### 7. Optimal production build configuration?

**✅ CONFIGURATION PROVIDED** - Vite 6 with @vitejs/plugin-react-swc. Manual chunks for vendor code. Target modern browsers (esnext). Enable incremental TypeScript builds. V8 coverage provider. Source maps for debugging. CDN for widget delivery.

### 8. Any blockers requiring architecture changes?

**✅ NO BLOCKERS** - Architecture is sound. Only decision point: If >5% users on Safari <16.4, stay on Tailwind v3 until v4 compatibility mode releases. Otherwise, proceed with confidence.

---

## Code Examples Summary

### Component Customization

```typescript
// Extend shadcn Button with custom variants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        tenant1: 'bg-purple-600 text-white',
        tenant2: 'bg-blue-600 text-white'
      }
    }
  }
);
```

### tRPC Pattern

```typescript
// Optimistic update with rollback
const updateTodo = useMutation({
  ...trpc.todos.update.mutationOptions(),
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: trpc.todos.list.queryKey() });
    const previous = queryClient.getQueryData(trpc.todos.list.queryKey());
    queryClient.setQueryData(trpc.todos.list.queryKey(), (old) => 
      old?.map(todo => todo.id === newTodo.id ? newTodo : todo)
    );
    return { previous };
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(trpc.todos.list.queryKey(), context?.previous);
  }
});
```

### Auth Flow

```typescript
// Protected route with loading state
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} />;
  
  return children;
}
```

---


## Conclusion

This Phase 4 Frontend Implementation provides a production-ready, enterprise-grade architecture for your multi-tenant SaaS platform. The stack (React 18.3.1, Vite 6.0.13, TypeScript 5.7.2, Tailwind v4.1.14, shadcn/ui, tRPC v11) represents 2025 best practices with official compatibility and active maintenance.

**Key strengths**: Type-safe full-stack with shared schemas, accessible UI components out-of-box, high performance with modern tooling, 80%+ test coverage achievable, flexible multi-tenant architecture.

**Main consideration**: Tailwind v4 browser requirements. Verify your user base supports Safari 16.4+ before proceeding, or defer v4 migration to Phase 5.

The monorepo structure with shared `packages/ui`, Shadow DOM widget SDK, and comprehensive testing strategy positions the platform for long-term scalability and maintainability.