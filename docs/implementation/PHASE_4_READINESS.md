# Phase 4 Readiness - Frontend Application Implementation

**Phase**: 4 of 7
**Goal**: Build React frontend applications with tRPC integration and responsive UI
**Duration**: 3 weeks (21 days)
**Start Date**: TBD
**Prerequisites**: Phase 3 complete ✅
**Research Status**: ✅ COMPLETE (see `/docs/research/10-06-2025/phase-4-research-summary.md`)

> **🔬 RESEARCH COMPLETE**: Comprehensive research on shadcn/ui + Tailwind v4 integration completed.
> See **Phase 4 Research Summary** (`/docs/research/10-06-2025/phase-4-research-summary.md`) for:
> - Architecture validation (no changes required)
> - Browser compatibility requirements (Safari 16.4+ critical decision point)
> - Implementation strategy with code templates
> - Risk assessment and mitigation
> - Testing strategy (80%+ coverage validated)
> - Production readiness checklist

---

## 📊 Phase 3 Completion Summary

### ✅ Production-Ready Components

**Backend API Infrastructure**:
- ✅ 5 tRPC routers with RLS enforcement (users, widgets, knowledge, sessions, health)
- ✅ Auth.js middleware with request-scoped tenant context
- ✅ Comprehensive health check system (standard + K8s probes)
- ✅ Monitoring and metrics infrastructure
- ✅ 85% test coverage (exceeds 80% target)
- ✅ 3 operational guides (1200+ lines documentation)

**API Endpoints Available**:
```typescript
// Authentication & Users
trpc.users.list()          // List users in tenant
trpc.users.get()           // Get user by ID
trpc.users.update()        // Update user profile
trpc.users.delete()        // Delete user (owner only)

// Widget Configuration
trpc.widgets.create()      // Create widget
trpc.widgets.list()        // List widgets
trpc.widgets.get()         // Get widget by ID
trpc.widgets.update()      // Update widget
trpc.widgets.delete()      // Delete widget

// Knowledge Management
trpc.knowledge.uploadDocument()    // Upload document
trpc.knowledge.listDocuments()     // List documents
trpc.knowledge.getDocument()       // Get document details
trpc.knowledge.deleteDocument()    // Delete document
trpc.knowledge.searchChunks()      // Vector search (Phase 5)

// AI Sessions
trpc.sessions.create()     // Create AI session
trpc.sessions.list()       // List sessions
trpc.sessions.get()        // Get session with messages
trpc.sessions.addMessage() // Add message
trpc.sessions.delete()     // Delete session

// Health & Monitoring
trpc.health.check()        // Comprehensive health check
trpc.health.liveness()     // K8s liveness probe
trpc.health.readiness()    // K8s readiness probe
trpc.health.metrics()      // Metrics endpoint
```

**Performance Metrics**:
- ✅ <100ms response times (P95)
- ✅ <10ms RLS context set time
- ✅ <50ms database query latency
- ✅ 100% index usage

**Security Validation**:
- ✅ Auth.js session management working
- ✅ OAuth flow validated (Google, Microsoft)
- ✅ Role-based access control enforced
- ✅ Tenant isolation verified
- ✅ PostgreSQL 16.7+ (SQL injection patched)
- ✅ Redis 7.4.2+ (RCE vulnerabilities patched)
- ✅ Fastify 5.3.2+ (parsing bypass patched)

### ⚠️ No Critical Blockers

All Phase 3 objectives met successfully. No blockers for Phase 4.

### 📝 Phase 3 Documentation

**Implementation Documents**:
- `docs/implementation/phase-3-implementation.md` - Comprehensive achievements summary
- `docs/operations/deployment-guide.md` - Production deployment instructions (438 lines)
- `docs/operations/monitoring-setup.md` - Health check and metrics configuration
- `docs/operations/runbook.md` - Troubleshooting and emergency procedures

---

## 🚨 CRITICAL: Pre-Phase 4 Decision Point

**Status**: ⚠️ REQUIRES ANALYTICS CHECK BEFORE IMPLEMENTATION START

### Browser Compatibility Decision (Week 0)

Tailwind CSS v4.1.14 requires modern browsers:

| Browser | Minimum Version | Release Date | User Impact |
|---------|----------------|--------------|-------------|
| **Safari** | 16.4+ | March 2023 | ⚠️ **HIGH** - iOS users |
| **Chrome** | 111+ | March 2023 | ✅ LOW |
| **Firefox** | 128+ | July 2024 | ⚠️ MEDIUM |

**Action Required**:
1. Check analytics for browser version distribution
2. If **>5% users on Safari 15 or iOS 15**, stay on Tailwind v3 until compatibility mode releases (Q2 2025)
3. If compatible, proceed with Tailwind v4 as planned

**Impact if Skipped**: Broken styling for users on older browsers (OKLCH colors fail, container queries unsupported)

**Timeline**: Must be decided **before Phase 4 Day 1**

**Reference**: See `/docs/research/10-06-2025/phase-4-research-summary.md` - Risk Assessment section

---

## 🎯 Phase 4 Objectives

### High-Level Goal

Build 4 React frontend applications with:
- Type-safe tRPC integration
- Auth.js authentication flow
- Responsive design (mobile + desktop)
- Shared UI component library
- 80%+ test coverage
- Production-ready deployment

### Applications to Implement

1. **Landing Page** (`apps/landing`) - Public marketing
   - Homepage with feature highlights
   - Pricing page
   - Contact/signup forms
   - Responsive design
   - Port 5173 → **www.platform.com**

2. **Dashboard** (`apps/dashboard`) - Admin portal
   - Knowledge base management (upload, configure)
   - Widget configuration
   - Team management
   - Cost analytics
   - Port 5174 → **dashboard.platform.com**

3. **Meeting Rooms** (`apps/meeting`) - LiveKit integration
   - Meeting room interface
   - Video/audio controls
   - Chat sidebar
   - Screen sharing
   - Port 5175 → **meet.platform.com**

4. **Widget SDK** (`apps/widget-sdk`) - Embeddable widget
   - ShadowDOM isolation
   - Minimal bundle size
   - Global API interface
   - NPM package + CDN distribution
   - Port 5176 → Customer websites

### Week-by-Week Breakdown

**Week 1 (Days 1-7)**: Foundation + Auth + Shared Components
- [ ] Day 1-2: App structure and tRPC integration
- [ ] Day 3-4: Auth.js integration and protected routes
- [ ] Day 5-7: Shared UI component library

**Week 2 (Days 8-14)**: Core Application Features
- [ ] Day 8-9: Dashboard UI and knowledge management
- [ ] Day 10-11: Widget configuration interface
- [ ] Day 12-14: Meeting room interface

**Week 3 (Days 15-21)**: Testing + Optimization + Polish
- [ ] Day 15-16: Component testing (80%+ coverage)
- [ ] Day 17-18: E2E testing with Playwright
- [ ] Day 19-21: Performance optimization and production build

---

## 📋 Pre-Phase 4 Setup

### 1. Environment Validation

**Verify Backend Services Running**:
```bash
# Check API server
curl http://localhost:3001/trpc/health.check
# Expected: {"status":"healthy", ...}

# Check database
psql postgresql://platform:platform_dev_password@localhost:5432/platform -c "SELECT 1"
# Expected: 1 row returned

# Check Redis
redis-cli -h localhost -p 6379 PING
# Expected: PONG
```

**Verify Phase 3 Completion**:
```bash
# TypeScript type checking
pnpm typecheck
# Expected: No errors

# Linting
pnpm lint
# Expected: No errors

# Build
pnpm build
# Expected: All packages build successfully

# Tests
pnpm test
# Expected: 85%+ coverage, all tests passing
```

### 2. Required Environment Variables

Add to `.env`:
```bash
# Frontend URLs
VITE_API_URL=http://localhost:3001
VITE_REALTIME_URL=http://localhost:3002
VITE_LIVEKIT_URL=wss://platform.livekit.cloud
VITE_WIDGET_CDN_URL=http://localhost:5176

# Auth.js (already configured in Phase 3)
AUTH_SECRET=your-secret-key
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_MICROSOFT_ID=your-microsoft-client-id
AUTH_MICROSOFT_SECRET=your-microsoft-client-secret

# LiveKit (Phase 5 - not needed for Phase 4)
# LIVEKIT_API_KEY=...
# LIVEKIT_API_SECRET=...
```

### 3. Package Dependencies Check

**Verify Installed Packages**:
```bash
# React and Vite should be installed
pnpm list react react-dom @vitejs/plugin-react
# Expected: react@18.3.1, react-dom@18.3.1, @vitejs/plugin-react@latest

# tRPC client packages
pnpm list @trpc/client @trpc/react-query
# Expected: @trpc/client@11.0.0, @trpc/react-query@11.0.0

# If missing, install:
cd apps/dashboard
pnpm add react@18.3.1 react-dom@18.3.1
pnpm add @trpc/client@11.0.0 @trpc/react-query@11.0.0 @tanstack/react-query@5.60.5
pnpm add -D @vitejs/plugin-react@5.0.0
```

---

## 📅 Week 1: Foundation + Auth + Shared Components

### Day 1-2: App Structure and tRPC Integration

#### Task 1.1: Configure Vite for All Apps

**Files to Create/Update**:

**`apps/landing/vite.config.ts`**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

**`apps/dashboard/vite.config.ts`**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

**`apps/meeting/vite.config.ts`**: Same as dashboard but port 5175

**`apps/widget-sdk/vite.config.ts`**: Same as dashboard but port 5176

**Success Criteria**:
- [ ] All 4 apps start with `pnpm dev:landing`, `pnpm dev:dashboard`, etc.
- [ ] No TypeScript errors
- [ ] Hot module replacement (HMR) working

#### Task 1.2: Set Up tRPC Client

**Files to Create**:

**`apps/dashboard/src/utils/trpc.ts`**:
```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@platform/api-contract';

export const trpc = createTRPCReact<AppRouter>();
```

**`apps/dashboard/src/utils/trpc-client.ts`**:
```typescript
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL + '/trpc',
      headers() {
        return {
          // Auth headers will be added here after Auth.js integration
        };
      },
    }),
  ],
});
```

**`apps/dashboard/src/main.tsx`**:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { trpc } from './utils/trpc';
import { trpcClient } from './utils/trpc-client';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
```

**`apps/dashboard/src/App.tsx`**:
```typescript
import { trpc } from './utils/trpc';

function App() {
  const healthQuery = trpc.health.check.useQuery();

  if (healthQuery.isLoading) return <div>Loading...</div>;
  if (healthQuery.error) return <div>Error: {healthQuery.error.message}</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>API Status: {healthQuery.data?.status}</p>
    </div>
  );
}

export default App;
```

**Success Criteria**:
- [ ] Dashboard loads and displays API health status
- [ ] tRPC queries type-safe (autocomplete working)
- [ ] Loading and error states handled
- [ ] No console errors

### Day 3-4: Auth.js Integration and Protected Routes

#### Task 1.3: Auth.js Client Setup

**Files to Create**:

**`packages/auth/src/client/index.ts`** (new file):
```typescript
/**
 * Auth.js client utilities for frontend apps
 * Provides session management and protected route helpers
 */

export interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'owner' | 'admin' | 'member';
  };
  tenantId: string;
  expires: string;
}

export async function getSession(): Promise<Session | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function signIn(provider: 'google' | 'microsoft') {
  window.location.href = `/api/auth/signin/${provider}`;
}

export async function signOut() {
  await fetch('/api/auth/signout', {
    method: 'POST',
    credentials: 'include',
  });
  window.location.href = '/';
}
```

**`apps/dashboard/src/hooks/useAuth.ts`**:
```typescript
import { useEffect, useState } from 'react';
import type { Session } from '@platform/auth/client';
import { getSession } from '@platform/auth/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  return { session, loading, isAuthenticated: !!session };
}
```

**`apps/dashboard/src/components/auth/ProtectedRoute.tsx`**:
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'member';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(session.user.role, requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = { owner: 3, admin: 2, member: 1 };
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >=
         roleHierarchy[requiredRole as keyof typeof roleHierarchy];
}
```

**`apps/dashboard/src/pages/Login.tsx`**:
```typescript
import { signIn } from '@platform/auth/client';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          <button
            onClick={() => signIn('google')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign in with Google
          </button>
          <button
            onClick={() => signIn('microsoft')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
}
```

**`apps/dashboard/src/App.tsx` (updated with routing)**:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Success Criteria**:
- [ ] OAuth login flow working (Google, Microsoft)
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect to login
- [ ] Role-based access control enforced
- [ ] Logout functionality working

### Day 5-7: Shared UI Component Library

#### Task 1.4: Set Up `packages/ui` with shadcn/ui + Tailwind CSS v4

> **🎨 CRITICAL: Tailwind CSS v4 Architecture**
>
> Tailwind v4.1.14 introduces **CSS-first configuration** and requires a **hybrid installation pattern** for Turborepo monorepos:
> - **UI Package**: Uses `@tailwindcss/cli` for standalone builds
> - **Apps**: Use `@tailwindcss/vite` plugin for Vite integration
> - **Configuration**: CSS-only via `@theme` directive (no `tailwind.config.js`)
> - **Cross-Package Scanning**: `@source` directive for monorepo component imports
> - **Performance**: 3.5x faster full builds, 100x faster incremental builds

**Step 1: Install Tailwind v4 (Hybrid Approach)**

```bash
# UI Package - Use CLI for standalone builds
pnpm --filter @platform/ui add -D \
  tailwindcss@4.1.14 \
  @tailwindcss/cli@4.1.14

# All Apps - Use Vite plugin for development
pnpm --filter @platform/landing add -D \
  tailwindcss@4.1.14 \
  @tailwindcss/vite@4.1.14

pnpm --filter @platform/dashboard add -D \
  tailwindcss@4.1.14 \
  @tailwindcss/vite@4.1.14

pnpm --filter @platform/meeting add -D \
  tailwindcss@4.1.14 \
  @tailwindcss/vite@4.1.14

pnpm --filter @platform/widget-sdk add -D \
  tailwindcss@4.1.14 \
  @tailwindcss/vite@4.1.14

# Shared UI utilities (all packages)
pnpm add -w \
  class-variance-authority@0.7.1 \
  clsx@2.1.1 \
  tailwind-merge@2.5.5
```

**Step 2: Configure UI Package**

**`packages/ui/package.json`**:
```json
{
  "name": "@platform/ui",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tailwindcss --input src/styles.css --output dist/styles.css && tsc",
    "dev": "tailwindcss --input src/styles.css --output dist/styles.css --watch",
    "typecheck": "tsc --noEmit",
    "lint": "biome check --write .",
    "clean": "rm -rf dist node_modules .turbo"
  },
  "dependencies": {
    "react": "18.3.1",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "tailwind-merge": "2.5.5"
  },
  "devDependencies": {
    "@types/react": "18.3.18",
    "typescript": "5.7.2",
    "tailwindcss": "4.1.14",
    "@tailwindcss/cli": "4.1.14"
  }
}
```

**`packages/ui/src/styles.css`** (CSS-First Configuration):
```css
@import "tailwindcss";

/**
 * Design System Theme
 * Tailwind v4 uses @theme directive instead of tailwind.config.js
 */
@theme {
  /* Color Palette - Using oklch for better color consistency */
  --color-primary-50: oklch(0.97 0.01 262.29);
  --color-primary-100: oklch(0.95 0.02 262.29);
  --color-primary-200: oklch(0.88 0.05 262.29);
  --color-primary-300: oklch(0.78 0.11 262.29);
  --color-primary-400: oklch(0.68 0.18 262.29);
  --color-primary-500: oklch(0.55 0.22 262.29);
  --color-primary-600: oklch(0.45 0.20 262.29);
  --color-primary-700: oklch(0.38 0.17 262.29);
  --color-primary-800: oklch(0.30 0.13 262.29);
  --color-primary-900: oklch(0.25 0.10 262.29);
  --color-primary-950: oklch(0.18 0.06 262.29);

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;

  /* Spacing Scale */
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

/**
 * Cross-Package Component Scanning
 * @source directive tells Tailwind where to find components
 */
@source "./components";

/**
 * Base Styles
 */
@layer base {
  * {
    @apply border-gray-200;
  }

  body {
    @apply bg-white text-gray-900 antialiased;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/**
 * Component Styles
 */
@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500;
    @apply disabled:pointer-events-none disabled:opacity-50;
  }
}
```

**`packages/ui/src/components/button.tsx`**:
```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**`packages/ui/src/components/input.tsx`**:
```typescript
import * as React from 'react';
import { cn } from '../utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

**`packages/ui/src/utils.ts`**:
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**`packages/ui/src/index.ts`**:
```typescript
export { Button } from './components/button';
export { Input } from './components/input';
export { cn } from './utils';
```

**Step 3: Configure Apps with Tailwind v4 Vite Plugin**

> **⚡ CRITICAL: Vite Plugin Configuration**
>
> - Each app MUST use `@tailwindcss/vite` plugin (not CLI)
> - Config file MUST be `.ts` or `.mjs` (ESM-only package)
> - Use `@source` directive to scan `packages/ui` components
> - Import `packages/ui/dist/styles.css` for base theme

**Update Vite Configs (All Apps)**:

**`apps/dashboard/vite.config.ts`** (Update existing):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 Vite plugin
  ],
  server: {
    port: 5174,
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

**`apps/landing/vite.config.ts`**, **`apps/meeting/vite.config.ts`**, **`apps/widget-sdk/vite.config.ts`**:
Same pattern - add `tailwindcss()` to plugins array and update ports accordingly (5173, 5175, 5176).

**Step 4: Configure App CSS Files**

**`apps/dashboard/src/index.css`**:
```css
@import "tailwindcss";

/**
 * Import UI package theme and styles
 * Provides access to design tokens defined in packages/ui
 */
@import "@platform/ui/dist/styles.css";

/**
 * Scan packages/ui for component classes
 * @source directive enables cross-package Tailwind scanning
 */
@source "../../../packages/ui/src";

/**
 * App-Specific Overrides (if needed)
 */
@layer components {
  .dashboard-card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
}
```

**Repeat for all apps**: Create `src/index.css` with same pattern (adjust `@source` path if needed).

**Step 5: Update Turborepo Configuration**

**`turbo.json`** (Add CSS file outputs to cache):
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "dist/styles.css"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Step 6: Validation and Troubleshooting**

**Validate Installation**:
```bash
# Check versions
pnpm list tailwindcss @tailwindcss/cli @tailwindcss/vite

# Expected output:
# packages/ui
# ├── tailwindcss@4.1.14
# └── @tailwindcss/cli@4.1.14
#
# apps/dashboard (and other apps)
# ├── tailwindcss@4.1.14
# └── @tailwindcss/vite@4.1.14

# Build UI package
pnpm --filter @platform/ui build

# Start dashboard app
pnpm dev:dashboard
```

**Common Issues**:

1. **"@apply cannot be used with @reference"**
   - **Cause**: Tailwind v4 removed `@apply` support for custom utilities with `@reference`
   - **Fix**: Use inline utilities or define as CSS custom properties instead

2. **"require() of ES Module not supported"**
   - **Cause**: Vite config is `.js` instead of `.ts` or `.mjs`
   - **Fix**: Rename `vite.config.js` → `vite.config.ts`

3. **"Tailwind classes not working in UI package components"**
   - **Cause**: Missing `@source` directive in app CSS
   - **Fix**: Add `@source "../../../packages/ui/src"` to `apps/*/src/index.css`

4. **Build fails with "Cannot find module @platform/ui/dist/styles.css"**
   - **Cause**: UI package not built yet
   - **Fix**: Run `pnpm --filter @platform/ui build` first

5. **Changes not reflected in browser**
   - **Cause**: Turborepo caching outdated CSS
   - **Fix**: Clear cache with `pnpm clean` and rebuild

**Performance Validation**:
```bash
# Measure build performance
time pnpm build

# Expected improvements with v4:
# - Full builds: 3.5x faster than v3
# - Incremental builds: 100x faster
# - Hot reload: <100ms CSS updates
```

**Additional Components to Create**:
- `card.tsx` - Card container
- `modal.tsx` - Modal dialog
- `table.tsx` - Data table
- `spinner.tsx` - Loading spinner
- `alert.tsx` - Alert notifications

**Success Criteria**:
- [ ] Tailwind v4.1.14 installed (hybrid: CLI + Vite plugin)
- [ ] `packages/ui/dist/styles.css` generated successfully
- [ ] All apps start with Tailwind plugin active
- [ ] CSS-first `@theme` configuration working
- [ ] `@source` directives scanning cross-package components
- [ ] UI package builds without errors (`pnpm --filter @platform/ui build`)
- [ ] All components type-safe with proper TypeScript definitions
- [ ] Components render correctly in all 4 apps with consistent styling
- [ ] Tailwind utilities applied correctly (test with variant classes)
- [ ] Hot reload working (<100ms CSS updates)
- [ ] Build performance: 3.5x faster full builds vs v3
- [ ] No "@apply with @reference" errors
- [ ] Component tests passing with proper accessibility attributes

---

## 📅 Week 2: Core Application Features

### Day 8-9: Dashboard UI and Knowledge Management

#### Task 2.1: Dashboard Layout

**Files to Create**:

**`apps/dashboard/src/layouts/DashboardLayout.tsx`**:
```typescript
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Header } from '../components/navigation/Header';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**`apps/dashboard/src/components/navigation/Sidebar.tsx`**:
```typescript
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@platform/ui';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Knowledge Base', href: '/knowledge', icon: '📚' },
  { name: 'Widgets', href: '/widgets', icon: '🔧' },
  { name: 'Team', href: '/team', icon: '👥' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <nav className="px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-4 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

**`apps/dashboard/src/components/navigation/Header.tsx`**:
```typescript
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '@platform/auth/client';
import { Button } from '@platform/ui';

export function Header() {
  const { session } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI Assistant Platform</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session?.user.email}</span>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
```

**Success Criteria**:
- [ ] Dashboard layout renders correctly
- [ ] Sidebar navigation working
- [ ] Responsive design (mobile + desktop)
- [ ] User info and logout button functional

#### Task 2.2: Knowledge Management Page

**Files to Create**:

**`apps/dashboard/src/pages/Knowledge.tsx`**:
```typescript
import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { Button, Input } from '@platform/ui';

export function Knowledge() {
  const [file, setFile] = useState<File | null>(null);
  const documentsQuery = trpc.knowledge.listDocuments.useQuery();
  const uploadMutation = trpc.knowledge.uploadDocument.useMutation({
    onSuccess: () => {
      documentsQuery.refetch();
      setFile(null);
    },
  });

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadMutation.mutate({
      name: file.name,
      content: await file.text(),
      metadata: { size: file.size, type: file.type },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Knowledge Base</h2>
        <div className="flex gap-2">
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleUpload} disabled={!file}>
            Upload
          </Button>
        </div>
      </div>

      {documentsQuery.isLoading && <p>Loading...</p>}
      {documentsQuery.error && <p>Error: {documentsQuery.error.message}</p>}

      <div className="grid grid-cols-1 gap-4">
        {documentsQuery.data?.map((doc) => (
          <div key={doc.id} className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold">{doc.name}</h3>
            <p className="text-sm text-gray-600">
              Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Success Criteria**:
- [ ] Document upload working
- [ ] Document list displays correctly
- [ ] Loading and error states handled
- [ ] File validation (size, type)

### Day 10-11: Widget Configuration Interface

#### Task 2.3: Widget Configuration Page

**Files to Create**:

**`apps/dashboard/src/pages/Widgets.tsx`**:
```typescript
import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { Button, Input } from '@platform/ui';

export function Widgets() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const widgetsQuery = trpc.widgets.list.useQuery();
  const createMutation = trpc.widgets.create.useMutation({
    onSuccess: () => {
      widgetsQuery.refetch();
      setShowCreateModal(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Widgets</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Widget
        </Button>
      </div>

      {widgetsQuery.isLoading && <p>Loading...</p>}
      {widgetsQuery.error && <p>Error: {widgetsQuery.error.message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgetsQuery.data?.map((widget) => (
          <div key={widget.id} className="p-6 bg-white rounded-lg border">
            <h3 className="font-semibold">{widget.name}</h3>
            <p className="text-sm text-gray-600 mt-2">
              {widget.description || 'No description'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateWidgetModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
  );
}

function CreateWidgetModal({ onClose, onSubmit }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Create Widget</h3>
        <div className="space-y-4">
          <Input
            placeholder="Widget name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => onSubmit({ name, description, config: {} })}>
              Create
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Success Criteria**:
- [ ] Widget creation modal working
- [ ] Widget list displays correctly
- [ ] Edit and delete functionality
- [ ] Form validation

### Day 12-14: Meeting Room Interface

#### Task 2.4: Meeting Room Page (Basic UI - LiveKit integration in Phase 5)

**Files to Create**:

**`apps/meeting/src/pages/MeetingRoom.tsx`**:
```typescript
import { useParams } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import { Button } from '@platform/ui';

export function MeetingRoom() {
  const { roomId } = useParams();
  const sessionQuery = trpc.sessions.get.useQuery({ id: roomId! });

  if (sessionQuery.isLoading) return <div>Loading...</div>;
  if (sessionQuery.error) return <div>Error: {sessionQuery.error.message}</div>;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Grid - Placeholder for Phase 5 LiveKit integration */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
            <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-white">Video will be integrated in Phase 5</p>
            </div>
            <div className="mt-4 flex gap-4 justify-center">
              <Button>Microphone</Button>
              <Button>Camera</Button>
              <Button>Screen Share</Button>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold mb-4">Chat</h3>
            <div className="space-y-2">
              {sessionQuery.data?.messages.map((msg) => (
                <div key={msg.id} className="p-2 bg-gray-50 rounded">
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Success Criteria**:
- [ ] Meeting room UI renders correctly
- [ ] Chat messages display
- [ ] Placeholder for video integration
- [ ] Controls UI ready for Phase 5

---

## 📅 Week 3: Testing + Optimization + Polish

### Day 15-16: Component Testing

#### Task 3.1: Set Up Vitest for Component Testing

**Files to Create**:

**`apps/dashboard/vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
```

**`apps/dashboard/src/test/setup.ts`**:
```typescript
import '@testing-library/jest-dom';
```

**`apps/dashboard/src/components/__tests__/Button.test.tsx`**:
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@platform/ui';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

**Success Criteria**:
- [ ] 80%+ test coverage for components
- [ ] All critical user flows tested
- [ ] Integration tests for tRPC queries
- [ ] Snapshot tests for UI components

### Day 17-18: E2E Testing with Playwright

#### Task 3.2: Set Up Playwright

**Files to Create**:

**`playwright.config.ts`** (root):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev:dashboard',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
```

**`e2e/auth.spec.ts`**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login flow', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign in with Google');
    // OAuth flow will redirect
    await expect(page).toHaveURL('/dashboard');
  });

  test('protected routes redirect', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
```

**`e2e/widgets.spec.ts`**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Widget Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    // ... login steps
  });

  test('create widget', async ({ page }) => {
    await page.goto('/widgets');
    await page.click('text=Create Widget');
    await page.fill('input[placeholder="Widget name"]', 'Test Widget');
    await page.click('text=Create');
    await expect(page.locator('text=Test Widget')).toBeVisible();
  });
});
```

**Success Criteria**:
- [ ] E2E tests for authentication flow
- [ ] E2E tests for widget creation/editing
- [ ] E2E tests for knowledge upload
- [ ] E2E tests pass in CI/CD

### Day 19-21: Performance Optimization and Production Build

#### Task 3.3: Performance Optimization

**Optimizations to Implement**:

1. **Code Splitting**:
```typescript
// apps/dashboard/src/App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Widgets = lazy(() => import('./pages/Widgets'));
const Knowledge = lazy(() => import('./pages/Knowledge'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/widgets" element={<Widgets />} />
        <Route path="/knowledge" element={<Knowledge />} />
      </Routes>
    </Suspense>
  );
}
```

2. **React Query Optimization**:
```typescript
// apps/dashboard/src/utils/trpc-client.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

3. **Bundle Size Analysis**:
```bash
# Add to package.json
"analyze": "vite-bundle-visualizer"

# Run analysis
pnpm analyze
```

**Success Criteria**:
- [ ] Initial bundle size <500KB
- [ ] Code splitting implemented
- [ ] Lazy loading for routes
- [ ] React Query optimized
- [ ] Lighthouse score >90

#### Task 3.4: Production Build Validation

**Validation Checklist**:
```bash
# Build all apps
pnpm build

# Check bundle sizes
du -sh apps/*/dist

# Test production builds locally
pnpm preview

# Run all tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

**Success Criteria**:
- [ ] All apps build successfully
- [ ] Bundle sizes within targets
- [ ] All tests passing (80%+ coverage)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Production preview working

---

## ✅ Phase 4 Success Criteria

### Functional Requirements
- [ ] All 4 apps (landing, dashboard, meeting, widget-sdk) running
- [ ] Auth.js authentication flow working (OAuth + protected routes)
- [ ] tRPC integration type-safe with all backend endpoints
- [ ] Knowledge management: upload, list, delete documents
- [ ] Widget configuration: create, edit, delete widgets
- [ ] Meeting room basic UI (LiveKit integration in Phase 5)
- [ ] Responsive design (mobile + desktop)

### Technical Requirements
- [ ] TypeScript strict mode with no errors
- [ ] 80%+ test coverage (unit + integration)
- [ ] E2E tests for critical flows
- [ ] Lighthouse score >90
- [ ] Bundle size <500KB initial load
- [ ] Code splitting and lazy loading implemented
- [ ] React Query optimization complete

### Performance Benchmarks
- [ ] Initial page load <3s on 3G
- [ ] Time to Interactive <5s
- [ ] First Contentful Paint <2s
- [ ] Largest Contentful Paint <2.5s
- [ ] Cumulative Layout Shift <0.1

### Quality Gates
- [ ] All builds successful
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Production preview working
- [ ] Documentation updated

---

## 🚧 Known Considerations

### LiveKit Integration (Phase 5)
- Meeting room UI is placeholder only
- LiveKit WebRTC integration in Phase 5
- Budget approval required ($5K-10K+/month Enterprise plan)

### Real-time Chat (Phase 6)
- WebSocket integration in Phase 6
- Redis Streams for message broadcasting
- Sticky sessions for load balancing

### Widget SDK (Phase 7)
- Basic structure in Phase 4
- Full ShadowDOM isolation in Phase 7
- NPM package and CDN distribution in Phase 7

---

## 📚 Reference Documentation

### Implementation Guides
- `docs/implementation/phase-3-implementation.md` - Backend API reference
- `docs/reference/api.md` - tRPC API specifications
- `docs/reference/database.md` - Database schema

### Operational Guides
- `docs/operations/deployment-guide.md` - Production deployment
- `docs/operations/monitoring-setup.md` - Monitoring configuration
- `docs/operations/runbook.md` - Troubleshooting guide

### Code References
- `packages/api-contract/src/router.ts` - tRPC router definitions
- `packages/auth/src/lib/auth.ts` - Auth.js configuration
- `packages/db/src/schema/` - Database schemas

---

## 🎯 Next Phase Preview: Phase 5

**Goal**: AI Integration + LiveKit
**Duration**: 3 weeks
**Key Objectives**:
- AI provider integration (OpenAI, Anthropic, Gemini)
- RAG system implementation
- LiveKit WebRTC integration (Enterprise plan)
- Python LiveKit agent development
- Multi-modal AI (voice, vision, text)

**Prerequisites from Phase 4**:
- Meeting room UI structure complete
- Frontend tRPC integration working
- Auth flow validated
- Production build optimized

---

**Phase 4 Readiness Complete** ✅

**Total Documentation Size**: 30KB
**Status**: Ready to begin implementation
**Next Action**: Start Week 1 Day 1 - App Structure and tRPC Integration
