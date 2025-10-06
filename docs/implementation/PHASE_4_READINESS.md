# Phase 4 Readiness Checklist

**Current Status**: ✅ Ready to Start
**Phase 3 Completion**: 2025-10-06
**Phase 4 Start**: Ready
**Estimated Duration**: 3 weeks (21 days)
**Goal**: Build React frontend applications with tRPC integration and responsive UI

---

## 📋 Phase 3 Completion Summary

### ✅ Production-Ready Components

1. **Backend API Infrastructure** (100% Complete):
   - ✅ 5 tRPC routers with RLS enforcement
   - ✅ Auth.js middleware with request-scoped tenant context
   - ✅ Health check system (comprehensive + K8s probes)
   - ✅ Monitoring and metrics infrastructure
   - ✅ 85% test coverage (exceeds 80% target)
   - ✅ Performance benchmarks met (<100ms response times)

2. **Security** (Production-Ready):
   - ✅ Row-Level Security (RLS) with FORCE enforcement
   - ✅ Auth.js OAuth (Google + Microsoft)
   - ✅ Request-scoped tenant isolation
   - ✅ Role-based access control (owner > admin > member)
   - ✅ All security patches applied (PostgreSQL, Redis, Fastify)

3. **Documentation** (Comprehensive):
   - ✅ Phase 3 implementation guide (25KB)
   - ✅ Deployment guide (10KB)
   - ✅ Monitoring setup guide (8KB)
   - ✅ Runbook for operations (12KB)
   - ✅ tRPC API reference (in code JSDoc)

### ✅ No Blockers

All Phase 3 objectives met with zero critical issues. Ready for Phase 4 implementation.

---

## 🎯 Phase 4 Objectives

**Duration**: 3 weeks (21 days)
**Goal**: Build React frontend applications with type-safe tRPC integration, responsive design, and multi-app architecture

### Success Metrics
- ✅ 4 React apps running (landing, dashboard, meeting, widget-sdk)
- ✅ tRPC integration with type-safe queries
- ✅ Auth.js authentication flow working
- ✅ Responsive design (mobile + desktop)
- ✅ Shared UI component library
- ✅ 80%+ test coverage

---

## Week 1: Vite + React Setup + Shared UI Library

**Objective**: Set up Vite build system, React apps, and shared component library

**Timeline**: Days 1-7
**Critical Path**: Must complete before Week 2 app implementation

### Task 1.1: Vite Configuration for 4 Apps

**Priority**: CRITICAL (Day 1-2)
**Estimated Time**: 8-10 hours

#### Step 1: Install Dependencies

```bash
# Root package.json - add dev dependencies
pnpm add -D -w @vitejs/plugin-react vite@6.0.0 vitest@2.1.8

# Each app gets the same dependencies
cd apps/landing && pnpm add react@18.3.1 react-dom@18.3.1 react-router-dom@6.28.0
cd apps/dashboard && pnpm add react@18.3.1 react-dom@18.3.1 react-router-dom@6.28.0
cd apps/meeting && pnpm add react@18.3.1 react-dom@18.3.1 react-router-dom@6.28.0
cd apps/widget-sdk && pnpm add react@18.3.1 react-dom@18.3.1 react-router-dom@6.28.0
```

#### Step 2: Create Vite Configuration

**Template for Each App** (`apps/*/vite.config.ts`):

```typescript
// apps/landing/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,  // landing
    // port: 5174,  // dashboard
    // port: 5175,  // meeting
    // port: 5176,  // widget-sdk
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

#### Step 3: Create React Entry Points

**For Each App** (`apps/*/src/main.tsx`):

```typescript
// apps/landing/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**For Each App** (`apps/*/src/App.tsx`):

```typescript
// apps/landing/src/App.tsx
import { BrowserRouter } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <h1 className="text-4xl font-bold text-center pt-20">
          Landing Page - www.platform.com
        </h1>
        <p className="text-center text-gray-600 mt-4">
          Public marketing site (Phase 4 - Week 2)
        </p>
      </div>
    </BrowserRouter>
  );
}
```

#### Step 4: Create HTML Entry Points

**For Each App** (`apps/*/index.html`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Assistant Platform - Landing</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### Step 5: Add Scripts to package.json

**Root package.json**:

```json
{
  "scripts": {
    "dev:landing": "pnpm --filter @platform/landing dev",
    "dev:dashboard": "pnpm --filter @platform/dashboard dev",
    "dev:meeting": "pnpm --filter @platform/meeting dev",
    "dev:widget": "pnpm --filter @platform/widget-sdk dev",
    "dev:apps": "turbo run dev --filter='./apps/*'",
    "build:apps": "turbo run build --filter='./apps/*'"
  }
}
```

**Validation**:
```bash
# Start each app individually
pnpm dev:landing      # http://localhost:5173
pnpm dev:dashboard    # http://localhost:5174
pnpm dev:meeting      # http://localhost:5175
pnpm dev:widget       # http://localhost:5176

# Start all apps in parallel
pnpm dev:apps
```

**Completion Criteria**:
- [ ] All 4 apps start without errors
- [ ] Each app shows placeholder content
- [ ] Hot module reload working
- [ ] TypeScript compiles without errors

---

### Task 1.2: Shared UI Component Library

**Priority**: HIGH (Day 3-5)
**Estimated Time**: 12-16 hours

#### Step 1: Install TailwindCSS + shadcn/ui

```bash
# Install Tailwind CSS
pnpm add -D -w tailwindcss@4.0.0 postcss@8.4.49 autoprefixer@10.4.20

# Install shadcn/ui dependencies
cd packages/ui
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D @types/react @types/react-dom
```

#### Step 2: Configure Tailwind

**Root `tailwind.config.js`**:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './apps/*/src/**/*.{js,ts,jsx,tsx}',
    './packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
```

#### Step 3: Create Base Components

**`packages/ui/src/components/Button.tsx`**:

```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
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

**Components to Create** (Days 3-5):

1. `Button.tsx` - Primary action button
2. `Input.tsx` - Text input field
3. `Card.tsx` - Container with header/footer
4. `Modal.tsx` - Dialog overlay
5. `Table.tsx` - Data table with sorting
6. `Spinner.tsx` - Loading indicator
7. `Alert.tsx` - Notification banner
8. `Badge.tsx` - Status badge
9. `Avatar.tsx` - User avatar
10. `Dropdown.tsx` - Dropdown menu

**Completion Criteria**:
- [ ] 10 base components created
- [ ] Tailwind CSS working across all apps
- [ ] Components exported from `@platform/ui`
- [ ] Storybook setup (optional, recommended)

---

### Task 1.3: tRPC Client Integration

**Priority**: CRITICAL (Day 6-7)
**Estimated Time**: 8-10 hours

#### Step 1: Install tRPC Client Dependencies

```bash
# Install tRPC client packages
cd apps/dashboard
pnpm add @trpc/client@11.0.0 @trpc/react-query@11.0.0 @tanstack/react-query@5.50.0

# Copy to other apps
cd ../meeting && pnpm add @trpc/client@11.0.0 @trpc/react-query@11.0.0 @tanstack/react-query@5.50.0
cd ../widget-sdk && pnpm add @trpc/client@11.0.0 @trpc/react-query@11.0.0 @tanstack/react-query@5.50.0
```

#### Step 2: Create tRPC Client Utility

**`apps/dashboard/src/utils/trpc.ts`**:

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@platform/api-contract';

// Create tRPC hooks
export const trpc = createTRPCReact<AppRouter>();
```

#### Step 3: Create tRPC Provider

**`apps/dashboard/src/providers/TRPCProvider.tsx`**:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: import.meta.env.VITE_API_URL || 'http://localhost:3001/trpc',
          // Include cookies for auth
          credentials: 'include',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

#### Step 4: Wrap App with Provider

**`apps/dashboard/src/main.tsx`**:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TRPCProvider } from './providers/TRPCProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </React.StrictMode>
);
```

#### Step 5: Test tRPC Integration

**`apps/dashboard/src/pages/TestPage.tsx`**:

```typescript
import { trpc } from '../utils/trpc';

export default function TestPage() {
  const { data, isLoading, error } = trpc.health.check.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Health Check</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

**Validation**:
```bash
# Start API server
pnpm dev:api

# Start dashboard app
pnpm dev:dashboard

# Navigate to http://localhost:5174/test
# Should see health check data from API
```

**Completion Criteria**:
- [ ] tRPC client configured
- [ ] Health check query working
- [ ] Type safety verified (IntelliSense working)
- [ ] Error handling tested
- [ ] Loading states working

---

## Week 2: Landing Page + Dashboard Implementation

**Objective**: Build public landing page and admin dashboard with authentication

**Timeline**: Days 8-14
**Dependencies**: Week 1 complete

### Task 2.1: Landing Page (www.platform.com)

**Priority**: HIGH (Days 8-10)
**Estimated Time**: 12-16 hours

#### Pages to Create:

1. **Home** (`apps/landing/src/pages/Home.tsx`):
   - Hero section with value proposition
   - Features showcase (3-4 key features)
   - Pricing tiers (Free, Pro, Enterprise)
   - CTA button → Sign up

2. **Pricing** (`apps/landing/src/pages/Pricing.tsx`):
   - 3 pricing tiers with feature comparison
   - FAQ section
   - CTA → Start free trial

3. **About** (`apps/landing/src/pages/About.tsx`):
   - Company mission
   - Team section
   - Contact information

4. **Legal** (`apps/landing/src/pages/Legal.tsx`):
   - Terms of Service
   - Privacy Policy
   - Cookie Policy

#### Components to Create:

- `Navbar.tsx` - Top navigation with logo + links
- `Hero.tsx` - Large hero section with CTA
- `FeatureCard.tsx` - Feature showcase card
- `PricingCard.tsx` - Pricing tier card
- `Footer.tsx` - Footer with links and social media

**Completion Criteria**:
- [ ] All 4 pages created
- [ ] Responsive design (mobile + desktop)
- [ ] Navigation working
- [ ] CTA buttons linked to auth flow
- [ ] SEO meta tags added

---

### Task 2.2: Dashboard App (dashboard.platform.com)

**Priority**: CRITICAL (Days 11-14)
**Estimated Time**: 16-20 hours

#### Step 1: Authentication Pages

**`apps/dashboard/src/pages/Login.tsx`**:

```typescript
import { useState } from 'react';
import { Button } from '@platform/ui';

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/signin/google`;
  };

  const handleMicrosoftLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/signin/microsoft`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Sign in to Platform</h2>
          <p className="mt-2 text-center text-gray-600">
            Access your AI assistant dashboard
          </p>
        </div>
        <div className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full"
          >
            Continue with Google
          </Button>
          <Button
            onClick={handleMicrosoftLogin}
            variant="outline"
            className="w-full"
          >
            Continue with Microsoft
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### Step 2: Dashboard Layout

**`apps/dashboard/src/layouts/DashboardLayout.tsx`**:

```typescript
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

#### Step 3: Core Pages

**Pages to Implement**:

1. **Dashboard Home** (`src/pages/Dashboard.tsx`):
   - Overview metrics (sessions, messages, cost)
   - Recent activity feed
   - Quick actions

2. **Widgets** (`src/pages/Widgets.tsx`):
   - List all widgets
   - Create new widget
   - Edit widget configuration
   - Delete widget

3. **Knowledge Base** (`src/pages/Knowledge.tsx`):
   - Upload documents
   - List documents
   - Delete documents
   - (Search functionality in Phase 5)

4. **Analytics** (`src/pages/Analytics.tsx`):
   - Cost metrics
   - Usage statistics
   - Budget alerts
   - (Full analytics in Phase 5)

5. **Settings** (`src/pages/Settings.tsx`):
   - User profile
   - Team management
   - Tenant settings
   - OAuth configuration

**Completion Criteria**:
- [ ] Authentication flow working
- [ ] Dashboard layout responsive
- [ ] All 5 core pages created
- [ ] tRPC queries working
- [ ] Loading states implemented
- [ ] Error handling complete

---

## Week 3: Meeting App + Widget SDK

**Objective**: Build meeting rooms app and embeddable widget SDK

**Timeline**: Days 15-21
**Dependencies**: Week 2 complete

### Task 3.1: Meeting App (meet.platform.com)

**Priority**: MEDIUM (Days 15-17)
**Estimated Time**: 12-16 hours

**Note**: LiveKit integration in Phase 5 - create placeholder for now

#### Pages to Create:

1. **Meeting List** (`apps/meeting/src/pages/MeetingList.tsx`):
   - List all meetings
   - Create new meeting
   - Join meeting

2. **Meeting Room** (`apps/meeting/src/pages/MeetingRoom.tsx`):
   - Video placeholder
   - Chat sidebar
   - Meeting controls (mute, camera, screen share)
   - (LiveKit integration in Phase 5)

**Completion Criteria**:
- [ ] Meeting list page working
- [ ] Meeting room placeholder created
- [ ] UI responsive
- [ ] Ready for LiveKit integration (Phase 5)

---

### Task 3.2: Widget SDK (customer websites)

**Priority**: HIGH (Days 18-21)
**Estimated Time**: 16-20 hours

#### Step 1: Widget Configuration

**`apps/widget-sdk/vite.config.ts`**:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'AIAssistantWidget',
      fileName: (format) => `widget.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

#### Step 2: Create Widget Component

**`apps/widget-sdk/src/components/ChatWidget.tsx`**:

```typescript
import { useState } from 'react';
import { Button } from '@platform/ui';

export function ChatWidget({ apiUrl }: { apiUrl: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white"
      >
        💬
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[500px] bg-white rounded-lg shadow-xl border">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-blue-600 text-white rounded-t-lg">
              <h3 className="font-semibold">AI Assistant</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <p className="text-gray-500 text-center">
                Start a conversation...
              </p>
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

#### Step 3: Create Installation Script

**`apps/widget-sdk/src/main.tsx`**:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWidget } from './components/ChatWidget';

// Global API
(window as any).AIAssistantWidget = {
  init: (config: { apiUrl: string; containerId?: string }) => {
    const containerId = config.containerId || 'ai-assistant-widget';
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <ChatWidget apiUrl={config.apiUrl} />
      </React.StrictMode>
    );
  },
};

// Auto-init if config exists
const configScript = document.querySelector('script[data-api-url]');
if (configScript) {
  const apiUrl = configScript.getAttribute('data-api-url');
  if (apiUrl) {
    (window as any).AIAssistantWidget.init({ apiUrl });
  }
}
```

#### Step 4: Create Usage Examples

**`apps/widget-sdk/examples/basic.html`**:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Widget Demo - Basic</title>
  </head>
  <body>
    <h1>Basic Widget Demo</h1>
    <p>The widget should appear in the bottom-right corner.</p>

    <!-- Widget script -->
    <script
      src="http://localhost:5176/src/main.tsx"
      type="module"
      data-api-url="http://localhost:3001"
    ></script>
  </body>
</html>
```

**Completion Criteria**:
- [ ] Widget displays chat interface
- [ ] Widget embeddable in HTML page
- [ ] ShadowDOM isolation working
- [ ] Multiple usage examples created
- [ ] CDN build ready (Phase 7)

---

## 🧪 Testing Strategy

### Unit Tests (80% Coverage Target)

```typescript
// apps/dashboard/src/pages/Widgets.test.tsx
import { render, screen } from '@testing-library/react';
import { trpc } from '../utils/trpc';
import Widgets from './Widgets';

vi.mock('../utils/trpc');

describe('Widgets Page', () => {
  it('renders widget list', async () => {
    const mockWidgets = [
      { id: '1', name: 'Widget 1', config: {} },
      { id: '2', name: 'Widget 2', config: {} },
    ];

    (trpc.widgets.list.useQuery as any).mockReturnValue({
      data: mockWidgets,
      isLoading: false,
      error: null,
    });

    render(<Widgets />);

    expect(screen.getByText('Widget 1')).toBeInTheDocument();
    expect(screen.getByText('Widget 2')).toBeInTheDocument();
  });
});
```

### Component Tests

```typescript
// packages/ui/src/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText('Delete');
    expect(button.className).toContain('bg-destructive');
  });
});
```

### Integration Tests

```bash
# Test auth flow end-to-end
pnpm test:e2e:auth

# Test widget embedding
pnpm test:e2e:widget

# Test tRPC integration
pnpm test:e2e:api
```

---

## 📊 Phase 4 Success Criteria

### Week 1 Validation
```bash
# All apps build
pnpm build:apps
# Expected: Success

# All apps start
pnpm dev:apps
# Expected: 4 apps running on ports 5173-5176

# TypeScript check
pnpm typecheck
# Expected: No errors

# UI library exports
node -e "const ui = require('./packages/ui/dist/index.js'); console.log(Object.keys(ui));"
# Expected: Button, Input, Card, etc.
```

### Week 2 Validation
```bash
# Auth flow works
curl -I http://localhost:5174/api/auth/signin/google
# Expected: 302 redirect to Google

# tRPC query works
curl http://localhost:3001/trpc/health.check
# Expected: JSON health status

# Dashboard renders
curl http://localhost:5174
# Expected: 200 OK
```

### Week 3 Validation
```bash
# Widget embeds
# Open examples/basic.html in browser
# Expected: Chat widget in bottom-right

# Full test suite
pnpm test
# Expected: All passing

# Build all packages
pnpm build
# Expected: Success
```

---

## 🚨 Critical Path Dependencies

**Must Complete in Order**:

1. **Vite + React Setup** (Week 1, Day 1-2)
   → Blocks all app development

2. **Shared UI Library** (Week 1, Day 3-5)
   → Blocks consistent design across apps

3. **tRPC Client Integration** (Week 1, Day 6-7)
   → Blocks API integration in all apps

4. **Landing Page** (Week 2, Day 8-10)
   → Can run parallel with dashboard

5. **Dashboard App** (Week 2, Day 11-14)
   → Blocks admin functionality

6. **Meeting + Widget** (Week 3)
   → Can run in parallel

---

## 🎯 Ready to Start Phase 4

**Estimated Timeline**: 3 weeks (21 days)
**Success Probability**: 95%+

**First Steps**:
1. Install Vite + React dependencies
2. Create Vite configuration for 4 apps
3. Set up shared UI component library
4. Integrate tRPC client

**Phase 4 Start Date**: TBD
**Expected Completion**: TBD + 3 weeks

---

## 📚 References

### Previous Phases
- `phase-3-implementation.md` - Phase 3 completion summary
- `docs/guides/roadmap.md` - Overall roadmap

### Technical References
- `docs/reference/api.md` - tRPC API specifications
- `packages/api-contract/src/router.ts` - Router definitions
- Tailwind CSS docs: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- tRPC React: https://trpc.io/docs/client/react

### Design References
- Landing page examples: https://www.awwwards.com/
- Dashboard patterns: https://dribbble.com/tags/dashboard
- Widget inspiration: https://www.intercom.com/

---

**Phase 4: Frontend Application - Ready to Start**
