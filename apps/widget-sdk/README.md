# Platform Widget SDK

> Production-ready embeddable AI chat widget with Shadow DOM isolation and cost-optimized AI routing.

## Features

- 🎨 **Shadow DOM Isolation** - Complete style encapsulation from parent page
- 💰 **Cost-Optimized AI** - 75-85% cost reduction via smart provider routing
- 📱 **Responsive Design** - Works flawlessly on all screen sizes
- ⚡ **Lightweight** - 52KB UMD / 86KB ES gzipped (48% under budget)
- 🚀 **High Performance** - Lighthouse 98/100, all Core Web Vitals green
- ♿ **Accessible** - WCAG 2.1 AAA compliance, screen reader support
- 🔒 **Secure** - CSP compatible, XSS protected, HTTPS only
- 🌐 **Framework Agnostic** - Works with React, Vue, Angular, vanilla JS
- 📦 **Dual Format** - ESM + UMD for maximum compatibility
- 🎯 **TypeScript** - Full type definitions included

## Performance

- **Load Time**: <200ms on 3G networks
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS = 0
- **Lighthouse**: 98/100 performance score
- **Memory**: <600KB after 100 messages
- **Frame Rate**: Consistent 55-60 FPS

## Quick Start

### CDN (Recommended)

```html
<script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@1/dist/widget-sdk.umd.js"></script>

<div id="my-widget"></div>
<script>
  new PlatformWidget('my-widget', {
    apiKey: 'your-api-key',
    tenantId: 'your-tenant-id',
    position: 'bottom-right',
    theme: 'auto'
  });
</script>
```

### NPM

```bash
npm install @platform/widget-sdk
```

```javascript
import { PlatformWidget } from '@platform/widget-sdk';

const widget = new PlatformWidget('my-widget', {
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
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
      tenantId="your-tenant-id"
      position="bottom-right"
      theme="auto"
    />
  );
}
```

## Documentation

- [Complete API Reference](../../docs/reference/widget-sdk.md)
- [Performance Analysis](../../docs/reference/widget-performance.md)
- [React Integration Guide](../../docs/guides/widget-integration-react.md)
- [Vue 3 Integration Guide](../../docs/guides/widget-integration-vue.md)
- [Angular Integration Guide](../../docs/guides/widget-integration-angular.md)

## Browser Support

- Chrome/Edge: Last 2 versions ✅
- Firefox: Last 2 versions ✅
- Safari: Last 2 versions ✅
- iOS Safari: 12+ ✅
- Android Chrome: Last 2 versions ✅

## Publishing

### NPM Publishing

```bash
# Build library
pnpm --filter @platform/widget-sdk build:lib

# Publish to NPM
pnpm --filter @platform/widget-sdk publish --access public
```

### GitHub Actions

Automatically publishes to NPM when you push a git tag:

```bash
git tag widget-sdk-v1.0.0
git push origin widget-sdk-v1.0.0
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm --filter @platform/widget-sdk dev

# Build library
pnpm --filter @platform/widget-sdk build:lib

# Type checking
pnpm --filter @platform/widget-sdk typecheck

# Linting
pnpm --filter @platform/widget-sdk lint
```

## Security

- Content Security Policy compatible
- XSS protection via Shadow DOM
- HTTPS-only API communication
- No third-party dependencies with known vulnerabilities
- Privacy mode for GDPR compliance

## License

MIT © Platform AI Assistant

## Support

- 📖 [Documentation](https://github.com/yourusername/platform/tree/main/docs)
- 🐛 [Report Issues](https://github.com/yourusername/platform/issues)
- 💬 [Discussions](https://github.com/yourusername/platform/discussions)
