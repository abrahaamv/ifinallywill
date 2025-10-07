# Widget SDK - React Integration Guide

Complete guide for integrating the Platform Widget SDK into React applications.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [TypeScript Support](#typescript-support)
- [Advanced Patterns](#advanced-patterns)
- [State Management](#state-management)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Installation

### NPM

```bash
npm install @platform/widget-sdk
```

### Yarn

```bash
yarn add @platform/widget-sdk
```

### pnpm

```bash
pnpm add @platform/widget-sdk
```

## Basic Usage

### Using the React Component

The simplest way to use the widget in React is with the provided React component:

```tsx
import { Widget } from '@platform/widget-sdk';

function App() {
  return (
    <div>
      <h1>My Application</h1>
      <Widget
        apiKey="your-api-key"
        tenantId="your-tenant-id"
        position="bottom-right"
        theme="auto"
        primaryColor="#6366f1"
        title="AI Assistant"
      />
    </div>
  );
}

export default App;
```

### Using the Vanilla API

For more control, use the PlatformWidget class:

```tsx
import { useEffect, useRef } from 'react';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

function App() {
  const widgetRef = useRef<PlatformWidget | null>(null);

  useEffect(() => {
    const config: WidgetConfig = {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
      primaryColor: '#6366f1',
    };

    widgetRef.current = new PlatformWidget('widget-container', config);

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  return <div id="widget-container" />;
}

export default App;
```

## TypeScript Support

The SDK includes comprehensive TypeScript definitions:

```tsx
import type {
  WidgetConfig,
  Message,
  WidgetAPI,
} from '@platform/widget-sdk';

interface AppProps {
  apiKey: string;
  tenantId: string;
}

function App({ apiKey, tenantId }: AppProps) {
  const config: WidgetConfig = {
    apiKey,
    tenantId,
    position: 'bottom-right',
    theme: 'auto',
    primaryColor: '#6366f1',
    debug: process.env.NODE_ENV === 'development',
  };

  return <Widget {...config} />;
}
```

## Advanced Patterns

### Dynamic Configuration

Update widget configuration dynamically based on user actions or state changes:

```tsx
import { useState, useRef, useEffect } from 'react';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

function ConfigurableWidget() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const widgetRef = useRef<PlatformWidget | null>(null);

  useEffect(() => {
    const config: WidgetConfig = {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme,
      primaryColor,
    };

    widgetRef.current = new PlatformWidget('widget-container', config);

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    widgetRef.current?.updateConfig({ theme, primaryColor });
  }, [theme, primaryColor]);

  return (
    <div>
      <div className="controls">
        <button onClick={() => setTheme('light')}>Light Theme</button>
        <button onClick={() => setTheme('dark')}>Dark Theme</button>
        <button onClick={() => setTheme('auto')}>Auto Theme</button>

        <input
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
        />
      </div>

      <div id="widget-container" />
    </div>
  );
}
```

### Programmatic Control

Control widget behavior programmatically:

```tsx
import { useRef, useEffect } from 'react';
import { PlatformWidget } from '@platform/widget-sdk';

function ControlledWidget() {
  const widgetRef = useRef<PlatformWidget | null>(null);

  useEffect(() => {
    widgetRef.current = new PlatformWidget('widget-container', {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
    });

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  const handleOpen = () => {
    widgetRef.current?.open();
  };

  const handleClose = () => {
    widgetRef.current?.close();
  };

  const handleToggle = () => {
    if (widgetRef.current?.isOpen()) {
      widgetRef.current.close();
    } else {
      widgetRef.current?.open();
    }
  };

  return (
    <div>
      <button onClick={handleOpen}>Open Widget</button>
      <button onClick={handleClose}>Close Widget</button>
      <button onClick={handleToggle}>Toggle Widget</button>

      <div id="widget-container" />
    </div>
  );
}
```

### Custom Hook

Create a reusable custom hook for widget management:

```tsx
import { useEffect, useRef } from 'react';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig, WidgetAPI } from '@platform/widget-sdk';

function useWidget(config: WidgetConfig): WidgetAPI | null {
  const widgetRef = useRef<PlatformWidget | null>(null);
  const containerIdRef = useRef(`widget-${Date.now()}`);

  useEffect(() => {
    widgetRef.current = new PlatformWidget(containerIdRef.current, config);

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (widgetRef.current) {
      widgetRef.current.updateConfig(config);
    }
  }, [config]);

  return widgetRef.current;
}

// Usage
function App() {
  const widget = useWidget({
    apiKey: 'your-api-key',
    tenantId: 'your-tenant-id',
    position: 'bottom-right',
    theme: 'auto',
  });

  const handleOpen = () => {
    widget?.open();
  };

  return (
    <div>
      <button onClick={handleOpen}>Open Assistant</button>
    </div>
  );
}
```

## State Management

### React Context

Share widget instance across components using React Context:

```tsx
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig, WidgetAPI } from '@platform/widget-sdk';

interface WidgetContextValue {
  widget: WidgetAPI | null;
}

const WidgetContext = createContext<WidgetContextValue>({ widget: null });

export function useWidgetContext() {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error('useWidgetContext must be used within WidgetProvider');
  }
  return context;
}

interface WidgetProviderProps {
  config: WidgetConfig;
  children: ReactNode;
}

export function WidgetProvider({ config, children }: WidgetProviderProps) {
  const widgetRef = useRef<PlatformWidget | null>(null);

  useEffect(() => {
    widgetRef.current = new PlatformWidget('global-widget-container', config);

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  return (
    <WidgetContext.Provider value={{ widget: widgetRef.current }}>
      {children}
      <div id="global-widget-container" />
    </WidgetContext.Provider>
  );
}

// Usage in component
function WidgetControl() {
  const { widget } = useWidgetContext();

  return (
    <button onClick={() => widget?.open()}>
      Open Assistant
    </button>
  );
}
```

### Redux Integration

Integrate widget with Redux for centralized state management:

```tsx
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';
import { PlatformWidget } from '@platform/widget-sdk';
import type { RootState } from './store';

// Actions
const WIDGET_OPENED = 'widget/opened';
const WIDGET_CLOSED = 'widget/closed';
const WIDGET_CONFIG_UPDATED = 'widget/configUpdated';

// Reducer
interface WidgetState {
  isOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
}

const initialState: WidgetState = {
  isOpen: false,
  theme: 'auto',
  primaryColor: '#6366f1',
};

function widgetReducer(state = initialState, action: any): WidgetState {
  switch (action.type) {
    case WIDGET_OPENED:
      return { ...state, isOpen: true };
    case WIDGET_CLOSED:
      return { ...state, isOpen: false };
    case WIDGET_CONFIG_UPDATED:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Component
function ReduxWidget() {
  const dispatch = useDispatch();
  const widgetState = useSelector((state: RootState) => state.widget);
  const widgetRef = useRef<PlatformWidget | null>(null);

  useEffect(() => {
    widgetRef.current = new PlatformWidget('redux-widget-container', {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      theme: widgetState.theme,
      primaryColor: widgetState.primaryColor,
    });

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    widgetRef.current?.updateConfig({
      theme: widgetState.theme,
      primaryColor: widgetState.primaryColor,
    });
  }, [widgetState.theme, widgetState.primaryColor]);

  const handleOpen = () => {
    widgetRef.current?.open();
    dispatch({ type: WIDGET_OPENED });
  };

  const handleClose = () => {
    widgetRef.current?.close();
    dispatch({ type: WIDGET_CLOSED });
  };

  return (
    <div>
      <button onClick={handleOpen}>Open</button>
      <button onClick={handleClose}>Close</button>
      <div id="redux-widget-container" />
    </div>
  );
}
```

## Performance Optimization

### Code Splitting

Load widget only when needed using dynamic imports:

```tsx
import { lazy, Suspense } from 'react';

const WidgetLazy = lazy(() =>
  import('@platform/widget-sdk').then((module) => ({
    default: module.Widget,
  }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading widget...</div>}>
      <WidgetLazy
        apiKey="your-api-key"
        tenantId="your-tenant-id"
        position="bottom-right"
      />
    </Suspense>
  );
}
```

### Memoization

Prevent unnecessary re-renders with React.memo:

```tsx
import { memo } from 'react';
import { Widget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

const MemoizedWidget = memo(Widget, (prevProps, nextProps) => {
  // Only re-render if critical props changed
  return (
    prevProps.apiKey === nextProps.apiKey &&
    prevProps.tenantId === nextProps.tenantId &&
    prevProps.theme === nextProps.theme &&
    prevProps.primaryColor === nextProps.primaryColor
  );
});

function App() {
  return (
    <MemoizedWidget
      apiKey="your-api-key"
      tenantId="your-tenant-id"
      theme="auto"
    />
  );
}
```

## Testing

### Unit Testing with Jest

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { PlatformWidget } from '@platform/widget-sdk';
import { WidgetWrapper } from './WidgetWrapper';

jest.mock('@platform/widget-sdk');

describe('WidgetWrapper', () => {
  it('should initialize widget with correct config', () => {
    const mockWidget = {
      open: jest.fn(),
      close: jest.fn(),
      destroy: jest.fn(),
    };
    (PlatformWidget as jest.Mock).mockImplementation(() => mockWidget);

    render(
      <WidgetWrapper
        apiKey="test-api-key"
        tenantId="test-tenant-id"
      />
    );

    expect(PlatformWidget).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        apiKey: 'test-api-key',
        tenantId: 'test-tenant-id',
      })
    );
  });

  it('should destroy widget on unmount', () => {
    const mockDestroy = jest.fn();
    const mockWidget = {
      destroy: mockDestroy,
    };
    (PlatformWidget as jest.Mock).mockImplementation(() => mockWidget);

    const { unmount } = render(<WidgetWrapper />);
    unmount();

    expect(mockDestroy).toHaveBeenCalled();
  });
});
```

### Integration Testing with Playwright

```typescript
import { test, expect } from '@playwright/test';

test('widget opens and closes correctly', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Click widget button
  await page.click('[data-testid="widget-button"]');

  // Verify widget is visible
  const widget = await page.locator('#widget-container');
  await expect(widget).toBeVisible();

  // Close widget
  await page.click('[data-testid="close-button"]');
  await expect(widget).not.toBeVisible();
});
```

## Troubleshooting

### Widget Not Rendering

**Problem**: Widget container exists but nothing renders inside.

**Solution**: Ensure Shadow DOM is supported and styles are loaded:

```tsx
import { useEffect, useRef } from 'react';
import { PlatformWidget } from '@platform/widget-sdk';

function DebugWidget() {
  const widgetRef = useRef<PlatformWidget | null>(null);

  useEffect(() => {
    widgetRef.current = new PlatformWidget('widget-container', {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      debug: true, // Enable debug mode
    });

    // Check Shadow DOM support
    if (!('attachShadow' in Element.prototype)) {
      console.error('Shadow DOM not supported');
    }

    // Inspect Shadow Root
    console.log('Shadow Root:', widgetRef.current?.getShadowRoot());

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  return <div id="widget-container" />;
}
```

### Style Conflicts

**Problem**: Parent page CSS affecting widget appearance.

**Solution**: Widget uses Shadow DOM for isolation, but ensure `shadowMode: 'closed'` for maximum protection:

```tsx
<Widget
  apiKey="your-api-key"
  tenantId="your-tenant-id"
  shadowMode="closed" // Maximum isolation
/>
```

### Memory Leaks

**Problem**: Widget instances not cleaned up properly.

**Solution**: Always call `destroy()` in cleanup:

```tsx
useEffect(() => {
  const widget = new PlatformWidget('widget-container', config);

  // Cleanup on unmount or dependency change
  return () => {
    widget.destroy();
  };
}, [config]);
```

### API Key Issues

**Problem**: Authentication errors or 401 responses.

**Solution**: Verify API key is valid and not expired:

```tsx
import { Widget } from '@platform/widget-sdk';

function ValidatedWidget() {
  const apiKey = process.env.REACT_APP_PLATFORM_API_KEY;

  if (!apiKey) {
    throw new Error('REACT_APP_PLATFORM_API_KEY environment variable is required');
  }

  return (
    <Widget
      apiKey={apiKey}
      tenantId="your-tenant-id"
      debug={true} // See detailed error messages
    />
  );
}
```

## Best Practices

1. **Environment Variables**: Store API keys in environment variables, never hardcode
2. **Error Boundaries**: Wrap widget in error boundary to catch initialization errors
3. **Cleanup**: Always destroy widget instances in useEffect cleanup
4. **TypeScript**: Use provided TypeScript definitions for type safety
5. **Memoization**: Memoize widget component if config changes frequently
6. **Testing**: Mock widget in tests to avoid Shadow DOM complications
7. **Performance**: Use code splitting for large applications
8. **Security**: Use `shadowMode: 'closed'` in production for maximum isolation

## Additional Resources

- [Widget SDK API Reference](../reference/widget-sdk.md)
- [TypeScript Definitions](../../apps/widget-sdk/src/types.ts)
- [Example Projects](../../apps/widget-sdk/examples/)

## Support

For issues or questions:
- [GitHub Issues](https://github.com/yourusername/platform/issues)
- [Documentation](https://github.com/yourusername/platform/tree/main/docs)
