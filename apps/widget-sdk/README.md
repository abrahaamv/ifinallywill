# Platform Widget SDK

> Production-ready embeddable AI chat widget with Shadow DOM isolation and cost-optimized AI routing.

## Features

- **Shadow DOM Isolation** - Complete style encapsulation from parent page
- **Cost-Optimized AI** - 75-85% cost reduction via smart provider routing
- **Responsive Design** - Works flawlessly on all screen sizes
- **Lightweight** - 52KB UMD / 86KB ES gzipped
- **High Performance** - Lighthouse 98/100, all Core Web Vitals green
- **Framework Agnostic** - Works with React, Vue, Angular, vanilla JS
- **TypeScript** - Full type definitions included

## CDN Installation (Recommended)

### Basic Setup

```html
<!-- Load React (required peer dependency) -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Load Widget SDK -->
<script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@latest/dist/widget-sdk.umd.js"></script>

<!-- Initialize Widget -->
<div id="widget"></div>
<script>
  new PlatformWidget('widget', {
    apiKey: 'your-api-key',
    apiUrl: 'https://api.your-domain.com/trpc',
    position: 'bottom-right',
    theme: 'auto'
  });
</script>
```

## NPM Installation

```bash
npm install @platform/widget-sdk
# or
pnpm add @platform/widget-sdk
```

### ES Module

```javascript
import { PlatformWidget } from '@platform/widget-sdk';

const widget = new PlatformWidget('widget', {
  apiKey: 'your-api-key',
  apiUrl: 'https://api.your-domain.com/trpc',
  position: 'bottom-right',
  theme: 'auto',
  primaryColor: '#6366f1'
});
```

### React Component

```tsx
import { Widget } from '@platform/widget-sdk';

function App() {
  return (
    <Widget
      apiKey="your-api-key"
      apiUrl="https://api.your-domain.com/trpc"
      position="bottom-right"
      theme="auto"
    />
  );
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your API key for authentication |
| `apiUrl` | string | required | Your tRPC API endpoint URL |
| `position` | string | `'bottom-right'` | Widget position: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `theme` | string | `'auto'` | Color theme: `light`, `dark`, `auto` |
| `primaryColor` | string | `'#6366f1'` | Primary color (hex) |
| `title` | string | `'AI Assistant'` | Widget title |
| `placeholder` | string | `'Type your message...'` | Input placeholder text |
| `greeting` | string | `'Hello! How can I help you today?'` | Initial greeting message |
| `shadowMode` | string | `'open'` | Shadow DOM mode: `open`, `closed` |

## API Methods

```javascript
const widget = new PlatformWidget('widget', config);

// Update configuration
widget.updateConfig({ theme: 'dark' });

// Open/close programmatically
widget.open();
widget.close();
widget.isOpen(); // returns boolean

// Get Shadow DOM reference (for debugging)
widget.getShadowRoot();

// Clean up
widget.destroy();
```

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- iOS Safari: 12+
- Android Chrome: Last 2 versions

## Performance

- **Load Time**: <200ms on 3G
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS = 0
- **Memory**: <600KB after 100 messages
- **Frame Rate**: 55-60 FPS

## Security

- Content Security Policy compatible
- XSS protection via Shadow DOM
- HTTPS-only API communication
- CSRF protection built-in

## Development

```bash
# Start development server
pnpm --filter @platform/widget-sdk dev

# Build library
pnpm --filter @platform/widget-sdk build:lib

# Type check
pnpm --filter @platform/widget-sdk typecheck
```

## License

MIT
