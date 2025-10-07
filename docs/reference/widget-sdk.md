# Widget SDK Reference

Complete API reference for the Platform Widget SDK.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [TypeScript](#typescript)
- [Framework Integration](#framework-integration)
- [CDN Usage](#cdn-usage)
- [Performance](#performance)
- [Security](#security)

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

### CDN

**jsDelivr** (Recommended):
```html
<script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1/dist/widget-sdk.umd.js"></script>
```

**unpkg**:
```html
<script src="https://unpkg.com/@platform/widget-sdk@1/dist/widget-sdk.umd.js"></script>
```

## Quick Start

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Platform Widget Demo</title>
</head>
<body>
  <!-- Widget will be mounted here -->
  <div id="platform-widget"></div>

  <!-- Load from CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1/dist/widget-sdk.umd.js"></script>

  <script>
    // Initialize widget
    const widget = new PlatformWidget('platform-widget', {
      apiKey: 'your-api-key-here',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
      primaryColor: '#6366f1',
      title: 'AI Assistant',
    });
  </script>
</body>
</html>
```

### ES Modules

```javascript
import { PlatformWidget } from '@platform/widget-sdk';

const widget = new PlatformWidget('my-widget', {
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
  position: 'bottom-right',
  theme: 'auto',
});
```

### React

```tsx
import { Widget } from '@platform/widget-sdk';

function App() {
  return (
    <Widget
      apiKey="your-api-key"
      tenantId="your-tenant-id"
      position="bottom-right"
      theme="auto"
      primaryColor="#6366f1"
      title="AI Assistant"
    />
  );
}
```

## Configuration

### WidgetConfig Interface

```typescript
interface WidgetConfig {
  // Authentication
  apiKey?: string;
  tenantId?: string;
  apiUrl?: string;

  // Appearance
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;

  // Content
  title?: string;
  placeholder?: string;
  greeting?: string;

  // Behavior
  shadowMode?: 'open' | 'closed';
  debug?: boolean;
  maxMessages?: number;
  offline?: boolean;

  // Privacy & Analytics
  analytics?: boolean;
  privacyMode?: boolean;

  // Advanced
  className?: string;
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `undefined` | **Required for production.** API key for authentication |
| `tenantId` | `string` | `undefined` | Tenant ID for multi-tenant isolation |
| `apiUrl` | `string` | `'https://api.platform.com'` | Backend API URL |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Widget position on screen |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Theme mode (auto detects system preference) |
| `primaryColor` | `string` | `'#6366f1'` | Primary brand color (hex format) |
| `title` | `string` | `'AI Assistant'` | Widget title in header |
| `placeholder` | `string` | `'Type your message...'` | Input placeholder text |
| `greeting` | `string` | `'Hello! How can I help you today?'` | Initial greeting message |
| `shadowMode` | `'open' \| 'closed'` | `'open'` | Shadow DOM mode (use `'closed'` for production) |
| `debug` | `boolean` | `false` | Enable debug logging to console |
| `maxMessages` | `number` | `50` | Maximum messages to keep in memory |
| `offline` | `boolean` | `false` | Enable offline message queuing |
| `analytics` | `boolean` | `false` | Enable usage analytics |
| `privacyMode` | `boolean` | `false` | GDPR mode (no tracking, no storage) |
| `className` | `string` | `undefined` | Custom CSS class for container |

## API Reference

### PlatformWidget Class

#### Constructor

```typescript
constructor(containerId: string, config: WidgetConfig)
```

Creates a new widget instance and mounts it to the specified container.

**Parameters:**
- `containerId`: ID of the HTML element to mount the widget (will be created if doesn't exist)
- `config`: Widget configuration object

**Example:**
```javascript
const widget = new PlatformWidget('my-widget', {
  apiKey: 'pk_test_123',
  position: 'bottom-right',
});
```

#### Methods

##### `updateConfig(config: Partial<WidgetConfig>): void`

Updates widget configuration dynamically without remounting.

**Example:**
```javascript
widget.updateConfig({
  theme: 'dark',
  primaryColor: '#10b981',
});
```

##### `open(): void`

Opens the widget programmatically.

**Example:**
```javascript
widget.open();
```

##### `close(): void`

Closes the widget programmatically.

**Example:**
```javascript
widget.close();
```

##### `isOpen(): boolean`

Returns whether the widget is currently open.

**Example:**
```javascript
if (widget.isOpen()) {
  console.log('Widget is open');
}
```

##### `destroy(): void`

Destroys the widget and cleans up all resources.

**Example:**
```javascript
// Clean up before page unload
window.addEventListener('beforeunload', () => {
  widget.destroy();
});
```

##### `getShadowRoot(): ShadowRoot`

Returns the Shadow DOM root for debugging purposes.

**Example:**
```javascript
const shadowRoot = widget.getShadowRoot();
console.log('Shadow DOM:', shadowRoot);
```

## TypeScript

The SDK includes comprehensive TypeScript definitions.

### Types

```typescript
import type {
  WidgetConfig,
  Message,
  WidgetAPI,
} from '@platform/widget-sdk';
```

### Message Interface

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    costUsd?: number;
    latencyMs?: number;
  };
}
```

### WidgetAPI Interface

```typescript
interface WidgetAPI {
  updateConfig(config: Partial<WidgetConfig>): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  sendMessage(content: string): Promise<void>;
  getMessages(): Message[];
  clearMessages(): void;
  destroy(): void;
  getShadowRoot(): ShadowRoot;
}
```

## Framework Integration

### React

```tsx
import { Widget } from '@platform/widget-sdk';
import { useState } from 'react';

function App() {
  const [config, setConfig] = useState({
    apiKey: 'your-api-key',
    tenantId: 'your-tenant-id',
    position: 'bottom-right' as const,
    theme: 'auto' as const,
  });

  return (
    <div>
      <Widget {...config} />

      <button onClick={() => setConfig(prev => ({
        ...prev,
        theme: prev.theme === 'light' ? 'dark' : 'light'
      }))}>
        Toggle Theme
      </button>
    </div>
  );
}
```

### Vue 3

```vue
<template>
  <div id="widget-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

const widget = ref<PlatformWidget>();

const config: WidgetConfig = {
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
  position: 'bottom-right',
  theme: 'auto',
};

onMounted(() => {
  widget.value = new PlatformWidget('widget-container', config);
});

onBeforeUnmount(() => {
  widget.value?.destroy();
});
</script>
```

### Angular

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlatformWidget, type WidgetConfig } from '@platform/widget-sdk';

@Component({
  selector: 'app-widget',
  template: '<div id="widget-container"></div>',
})
export class WidgetComponent implements OnInit, OnDestroy {
  private widget?: PlatformWidget;

  ngOnInit(): void {
    const config: WidgetConfig = {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
    };

    this.widget = new PlatformWidget('widget-container', config);
  }

  ngOnDestroy(): void {
    this.widget?.destroy();
  }
}
```

### Svelte

```svelte
<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { PlatformWidget } from '@platform/widget-sdk';

let widget: PlatformWidget;

onMount(() => {
  widget = new PlatformWidget('widget-container', {
    apiKey: 'your-api-key',
    tenantId: 'your-tenant-id',
    position: 'bottom-right',
    theme: 'auto',
  });
});

onDestroy(() => {
  widget?.destroy();
});
</script>

<div id="widget-container"></div>
```

## CDN Usage

### Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Platform Widget</title>
</head>
<body>
  <div id="platform-widget"></div>

  <script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1/dist/widget-sdk.umd.js"></script>
  <script>
    new PlatformWidget('platform-widget', {
      apiKey: 'your-api-key',
      position: 'bottom-right',
    });
  </script>
</body>
</html>
```

### With Subresource Integrity (SRI)

```html
<script
  src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1.0.0/dist/widget-sdk.umd.js"
  integrity="sha384-HASH-HERE"
  crossorigin="anonymous">
</script>
```

### Version Pinning

```html
<!-- Latest 1.x version (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1/dist/widget-sdk.umd.js"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1.0.0/dist/widget-sdk.umd.js"></script>

<!-- Latest version (not recommended for production) -->
<script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk/dist/widget-sdk.umd.js"></script>
```

## Performance

### Bundle Sizes

- **ESM**: 86KB gzipped
- **UMD**: 52KB gzipped
- **CSS**: Inline in JS (no separate file needed)

### Load Times

- **3G Network**: <200ms
- **4G Network**: <100ms
- **WiFi**: <50ms

### Metrics

- **First Contentful Paint**: <1s
- **Time to Interactive**: <2s
- **Lighthouse Performance**: 95+

### Optimization Tips

1. **Use CDN**: Leverage browser caching and CDN edge locations
2. **Async Loading**: Load widget script asynchronously
3. **Lazy Initialization**: Initialize widget only when needed
4. **Version Pinning**: Use specific version for better caching

```html
<!-- Async loading example -->
<script async src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1/dist/widget-sdk.umd.js"></script>
<script>
  window.addEventListener('load', () => {
    if (typeof PlatformWidget !== 'undefined') {
      new PlatformWidget('my-widget', { apiKey: 'pk_test_123' });
    }
  });
</script>
```

## Security

### Content Security Policy (CSP)

The widget is compatible with strict CSP policies:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://cdn.jsdelivr.net;
               connect-src 'self' https://api.platform.com;
               style-src 'self' 'unsafe-inline';">
```

### XSS Protection

Shadow DOM provides complete isolation from parent page:
- Widget styles cannot be affected by parent page CSS
- Parent page JavaScript cannot access widget internals (when `shadowMode: 'closed'`)
- No DOM manipulation from parent page possible

### HTTPS Only

All API communication is HTTPS-only. HTTP connections are rejected.

### Privacy Mode

Enable GDPR-compliant privacy mode:

```javascript
new PlatformWidget('my-widget', {
  privacyMode: true,  // No tracking, no persistent storage
  analytics: false,    // Disable analytics
});
```

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 |
| Edge | Last 2 |
| Firefox | Last 2 |
| Safari | Last 2 |
| iOS Safari | 12+ |
| Android Chrome | Last 2 |

**Note**: Internet Explorer 11 is not supported due to Shadow DOM requirement.

## License

MIT © Platform AI Assistant

## Support

- 📖 [Documentation](https://github.com/yourusername/platform/tree/main/apps/widget-sdk)
- 🐛 [Report Issues](https://github.com/yourusername/platform/issues)
- 💬 [Discussions](https://github.com/yourusername/platform/discussions)
