# Component Patterns - Frontend Architecture Guide

## 🎯 Frontend Philosophy

**Principles**:
1. **Composition over inheritance** - Build complex UIs from simple primitives
2. **Pure Tailwind** - No component libraries, full control over styling
3. **Type-safe props** - Zod schemas for runtime validation
4. **Performance-first** - Lazy loading, code splitting, minimal re-renders
5. **Accessible by default** - WCAG 2.1 AA compliance built-in

**No Component Libraries**: We use pure Tailwind + React. This gives us:
- ✅ Full control over styling
- ✅ Smaller bundle size
- ✅ No dependency lock-in
- ✅ Faster customization

---

## 🏗️ Project Structure

```
apps/dashboard/src/
├── components/
│   ├── ui/               # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   ├── chat/             # Chat-specific components
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   └── ChatContainer.tsx
│   ├── dashboard/        # Dashboard components
│   │   ├── SessionsList.tsx
│   │   ├── WidgetCard.tsx
│   │   └── Analytics.tsx
│   └── layout/           # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Container.tsx
├── hooks/                # Custom hooks
│   ├── useAuth.ts
│   ├── useChat.ts
│   └── useLiveKit.ts
├── lib/                  # Utilities
│   ├── trpc.ts
│   ├── utils.ts
│   └── cn.ts             # classNames utility
├── pages/                # Route components
│   ├── Dashboard.tsx
│   ├── Widgets.tsx
│   └── Settings.tsx
└── styles/
    └── globals.css       # Tailwind + custom styles
```

---

## 🧩 UI Primitives

### Button Component

```typescript
// apps/dashboard/src/components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-colors focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',

          // Variants
          {
            primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
            secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-500',
            ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
          }[variant],

          // Sizes
          {
            sm: 'h-9 px-3 text-sm',
            md: 'h-10 px-4',
            lg: 'h-11 px-8',
          }[size],

          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Input Component

```typescript
// apps/dashboard/src/components/ui/Input.tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2',
            'text-sm placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-600',
            className
          )}
          {...props}
        />

        {(error || helperText) && (
          <p className={cn('mt-1 text-sm', error ? 'text-red-600' : 'text-gray-500')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### Modal Component

```typescript
// apps/dashboard/src/components/ui/Modal.tsx
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-white rounded-xl shadow-xl',
          'max-h-[90vh] overflow-y-auto',
          {
            sm: 'max-w-sm',
            md: 'max-w-md',
            lg: 'max-w-lg',
            xl: 'max-w-xl',
          }[size],
          'mx-4' // Margin on mobile
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {title && (
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>

            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100"
              aria-label="Close modal"
            >
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
```

---

## 🔌 Widget Architecture (ShadowDOM)

### ShadowDOM Utility

```typescript
// apps/widget/src/lib/ShadowDOM.ts

/**
 * ShadowDOM utility for isolated widget styling
 *
 * Benefits:
 * - Complete style isolation (widget styles don't affect parent page)
 * - Parent page styles don't leak into widget
 * - Predictable rendering across different websites
 */

export class ShadowDOMManager {
  private shadow: ShadowRoot;
  private styleElement: HTMLStyleElement;

  constructor(hostElement: HTMLElement) {
    // Create shadow root
    this.shadow = hostElement.attachShadow({ mode: 'open' });

    // Create style element
    this.styleElement = document.createElement('style');
    this.shadow.appendChild(this.styleElement);

    // Inject base styles
    this.injectBaseStyles();
  }

  /**
   * Inject Tailwind CSS and custom styles
   */
  private injectBaseStyles() {
    this.styleElement.textContent = `
      /* Tailwind CSS base */
      *,
      ::before,
      ::after {
        box-sizing: border-box;
        border-width: 0;
        border-style: solid;
        border-color: #e5e7eb;
      }

      /* Reset */
      * {
        margin: 0;
        padding: 0;
      }

      /* Typography */
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Focus visible */
      :focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      /* Scrollbar styles */
      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #f1f5f9;
      }

      ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
      }

      .animate-slide-in {
        animation: slideIn 0.3s ease-out;
      }

      .animate-spin {
        animation: spin 1s linear infinite;
      }
    `;
  }

  /**
   * Add custom styles (Tailwind utility classes, etc.)
   */
  addStyles(styles: string) {
    this.styleElement.textContent += '\n' + styles;
  }

  /**
   * Get shadow root for mounting React app
   */
  getShadowRoot(): ShadowRoot {
    return this.shadow;
  }

  /**
   * Create a container element inside shadow DOM
   */
  createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'widget-root';
    this.shadow.appendChild(container);
    return container;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.shadow.innerHTML = '';
  }
}
```

### Widget Main Component

```typescript
// apps/widget/src/Widget.tsx
import { useState, useEffect } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { ChatButton } from './components/ChatButton';
import { trpc } from './lib/trpc';

export interface WidgetProps {
  apiKey: string;
  widgetId: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark' | 'auto';
}

export function Widget({ apiKey, widgetId, position = 'bottom-right', theme = 'auto' }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Create session when widget opens
  const createSession = trpc.chat.createSession.useMutation();

  useEffect(() => {
    if (isOpen && !sessionId) {
      createSession.mutate(
        { widgetId, mode: 'text' },
        {
          onSuccess: (data) => {
            setSessionId(data.sessionId);
          },
        }
      );
    }
  }, [isOpen, sessionId]);

  return (
    <div
      className={cn(
        'fixed z-[9999]',
        position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'
      )}
    >
      {/* Chat Container */}
      {isOpen && sessionId && (
        <div className="mb-4 animate-slide-in">
          <ChatContainer
            sessionId={sessionId}
            apiKey={apiKey}
            onClose={() => setIsOpen(false)}
            theme={theme}
          />
        </div>
      )}

      {/* Open/Close Button */}
      <ChatButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        theme={theme}
      />
    </div>
  );
}
```

### Widget Entry Point

```typescript
// apps/widget/src/main.ts
import { createRoot } from 'react-dom/client';
import { Widget, type WidgetProps } from './Widget';
import { ShadowDOMManager } from './lib/ShadowDOM';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from './lib/trpc';

/**
 * Widget SDK for embedding on customer websites
 *
 * Usage:
 * <script src="https://cdn.platform.com/v1/widget.js"></script>
 * <script>
 *   PlatformWidget.init({
 *     apiKey: 'pk_live_...',
 *     widgetId: 'widget-uuid',
 *     position: 'bottom-right',
 *     theme: 'auto'
 *   });
 * </script>
 */

declare global {
  interface Window {
    PlatformWidget: {
      init: (config: WidgetProps) => void;
      destroy: () => void;
    };
  }
}

let shadowManager: ShadowDOMManager | null = null;
let reactRoot: any = null;

function init(config: WidgetProps) {
  // Create host element
  const hostElement = document.createElement('div');
  hostElement.id = 'platform-widget-host';
  document.body.appendChild(hostElement);

  // Setup Shadow DOM
  shadowManager = new ShadowDOMManager(hostElement);

  // Add Tailwind utilities (you would inject full Tailwind CSS here)
  shadowManager.addStyles(`
    /* Widget-specific styles */
    .widget-container {
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 2rem);
      max-height: calc(100vh - 2rem);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    }

    @media (max-width: 640px) {
      .widget-container {
        width: calc(100vw - 2rem);
        height: calc(100vh - 2rem);
      }
    }
  `);

  // Create container for React
  const container = shadowManager.createContainer();

  // Setup tRPC client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000,
        refetchOnWindowFocus: false,
      },
    },
  });

  // Mount React app inside Shadow DOM
  reactRoot = createRoot(container);
  reactRoot.render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Widget {...config} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function destroy() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }

  if (shadowManager) {
    shadowManager.destroy();
    shadowManager = null;
  }

  const hostElement = document.getElementById('platform-widget-host');
  if (hostElement) {
    hostElement.remove();
  }
}

// Expose global API
window.PlatformWidget = {
  init,
  destroy,
};

// Auto-init if config provided via data attribute
const scriptTag = document.currentScript as HTMLScriptElement;
if (scriptTag && scriptTag.dataset.apiKey) {
  init({
    apiKey: scriptTag.dataset.apiKey,
    widgetId: scriptTag.dataset.widgetId!,
    position: (scriptTag.dataset.position as any) || 'bottom-right',
    theme: (scriptTag.dataset.theme as any) || 'auto',
  });
}
```

### Widget Build Configuration

```typescript
// apps/widget/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'PlatformWidget',
      formats: ['umd'],
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        // Inline all dependencies
        inlineDynamicImports: true,
      },
    },
    // Target modern browsers
    target: 'es2020',
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

---

## 🎣 Custom Hooks

### useAuth Hook

```typescript
// apps/dashboard/src/hooks/useAuth.ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';

export function useAuth(requireAuth = true) {
  const navigate = useNavigate();

  const { data: user, isLoading, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    enabled: requireAuth,
  });

  useEffect(() => {
    if (!isLoading && requireAuth && (!user || error)) {
      navigate('/login');
    }
  }, [user, isLoading, error, requireAuth, navigate]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
```

### useSSEChat Hook

```typescript
// apps/dashboard/src/hooks/useSSEChat.ts
import { useState, useEffect, useRef } from 'react';
import type { Message } from '@platform/api-contract';

export function useSSEChat(sessionId: string | null, apiKey: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Create SSE connection
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/api/chat/stream/${sessionId}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'user-message' || data.type === 'assistant-message') {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    eventSource.onerror = () => {
      console.error('[SSE] Connection error');
      setIsConnected(false);
    };

    eventSourceRef.current = eventSource;

    // Cleanup
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [sessionId, apiKey]);

  return {
    messages,
    isConnected,
  };
}
```

### useLiveKit Hook

```typescript
// apps/meeting/src/hooks/useLiveKit.ts
import { useState, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { trpc } from '@/lib/trpc';

export function useLiveKit(sessionId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  const { data: token, isLoading } = trpc.livekit.createToken.useMutation();

  useEffect(() => {
    if (!token) return;

    const room = new Room();

    room.on(RoomEvent.Connected, () => {
      console.log('[LiveKit] Connected');
      setIsConnected(true);
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log('[LiveKit] Disconnected');
      setIsConnected(false);
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
    });

    // Connect to room
    room.connect(token.url, token.token);

    setRoom(room);

    return () => {
      room.disconnect();
    };
  }, [token]);

  const shareScreen = async () => {
    if (!room) return;

    try {
      await room.localParticipant.setScreenShareEnabled(true);
    } catch (error) {
      console.error('Failed to share screen:', error);
    }
  };

  const toggleMic = async () => {
    if (!room) return;

    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
  };

  const toggleCamera = async () => {
    if (!room) return;

    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
  };

  return {
    room,
    isConnected,
    participants,
    shareScreen,
    toggleMic,
    toggleCamera,
  };
}
```

---

## 🎨 Styling Utilities

### ClassNames Utility

```typescript
// apps/dashboard/src/lib/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper precedence
 *
 * Example:
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Tailwind Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

---

## 🧪 Component Testing

### Testing UI Components

```typescript
// apps/dashboard/src/components/ui/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('disables when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## 📦 Code Splitting

### Lazy Loading Routes

```typescript
// apps/dashboard/src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Widgets = lazy(() => import('./pages/Widgets'));
const Settings = lazy(() => import('./pages/Settings'));
const Meeting = lazy(() => import('./pages/Meeting'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/widgets" element={<Widgets />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/meeting/:id" element={<Meeting />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

## ♿ Accessibility Best Practices

### ARIA Attributes

```typescript
// Always include proper ARIA attributes
<button
  aria-label="Close modal"
  aria-pressed={isOpen}
  aria-expanded={isExpanded}
  role="button"
>
  Close
</button>

// For icons
<svg aria-hidden="true">...</svg>

// For loading states
<div role="status" aria-live="polite">
  Loading...
</div>
```

### Keyboard Navigation

```typescript
// Handle keyboard events
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    onClose();
  }

  if (e.key === 'Enter' || e.key === ' ') {
    onClick();
  }
};

<div
  tabIndex={0}
  role="button"
  onKeyDown={handleKeyDown}
  onClick={onClick}
>
  Clickable div
</div>
```

---

**Next**: See `09-DEPLOYMENT-GUIDE.md` for production deployment strategies.
