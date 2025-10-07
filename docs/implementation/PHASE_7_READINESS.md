# Phase 7 Readiness Checklist - Widget SDK + Production Polish

**Target Duration**: Weeks 16-17 (2 weeks)
**Prerequisites**: Phases 1-6 complete ✅
**Current Status**: Ready to begin

---

## 🎯 Phase 7 Overview

**Primary Goals**:
1. Create embeddable widget SDK as NPM package
2. Implement Shadow DOM isolation for style encapsulation
3. Set up CDN distribution for easy integration
4. Production optimization and polish
5. Comprehensive documentation and examples

**Success Criteria**:
- ✅ Widget SDK installable via NPM (`npm install @platform/widget`)
- ✅ CDN bundle available (`<script src="https://cdn.platform.com/widget.js">`)
- ✅ Shadow DOM prevents style conflicts
- ✅ Bundle size <100KB gzipped
- ✅ Complete API documentation
- ✅ Working examples for popular frameworks

---

## 📋 Pre-Phase 7 Checklist

### Infrastructure Validation

- [x] **All Phases Complete**: Phases 1-6 implemented and documented
- [x] **Build System**: All 20 packages typecheck, 13 apps build successfully
- [x] **Performance**: Build time 81ms (FULL TURBO), zero errors
- [x] **Documentation**: Implementation docs for all phases exist

### Widget Foundation

- [x] **Widget App**: `apps/widget-sdk` placeholder exists
- [x] **Build Config**: Vite configured for library mode
- [x] **Bundle Output**: UMD + ESM formats already generating
- [ ] **NPM Package**: Not yet published to registry
- [ ] **CDN Setup**: Not yet configured

### API Integration

- [x] **tRPC Client**: Available for backend communication
- [x] **Auth System**: Auth.js ready for token-based auth
- [x] **WebSocket**: Real-time chat server operational
- [x] **LiveKit**: Video/audio meeting integration ready

---

## 📅 Week 1: Widget SDK Core (Days 1-5)

### Day 1-2: NPM Package Setup

**Objective**: Configure widget SDK as publishable NPM package

**Tasks**:

1. **Update `apps/widget-sdk/package.json`**:
```json
{
  "name": "@platform/widget",
  "version": "1.0.0",
  "description": "Embeddable AI assistant widget for websites",
  "main": "dist/widget.umd.js",
  "module": "dist/widget.es.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "exports": {
    ".": {
      "import": "./dist/widget.es.js",
      "require": "./dist/widget.umd.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/style.css"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "keywords": [
    "ai-assistant",
    "chatbot",
    "widget",
    "embeddable",
    "customer-support"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/platform",
    "directory": "apps/widget-sdk"
  },
  "license": "MIT"
}
```

2. **Create `apps/widget-sdk/README.md`**:
   - Installation instructions (NPM + CDN)
   - Quick start guide
   - Configuration options
   - API reference
   - Framework examples (React, Vue, Angular, Vanilla)

3. **Add `apps/widget-sdk/LICENSE`**:
   - Choose appropriate license (MIT recommended)

**Validation**:
```bash
cd apps/widget-sdk
pnpm build
npm pack  # Creates .tgz file for testing
npm publish --dry-run  # Test publishing (no actual publish)
```

### Day 2-3: Shadow DOM Implementation

**Objective**: Implement Shadow DOM for style isolation

**Files to Modify**:
- `apps/widget-sdk/src/main.tsx`
- `apps/widget-sdk/src/Widget.tsx`

**Implementation**:

```typescript
// apps/widget-sdk/src/main.tsx
import { createRoot } from 'react-dom/client';
import Widget from './Widget';
import styles from './index.css?inline'; // Inline CSS for Shadow DOM

export interface WidgetConfig {
  apiUrl: string;
  token?: string;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  zIndex?: number;
  primaryColor?: string;
}

class PlatformWidget {
  private shadowRoot: ShadowRoot;
  private config: WidgetConfig;

  constructor(containerId: string, config: WidgetConfig) {
    this.config = config;

    // Create container
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    // Attach Shadow DOM
    this.shadowRoot = container.attachShadow({ mode: 'open' });

    // Inject styles into Shadow DOM
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    this.shadowRoot.appendChild(styleSheet);

    // Create React root inside Shadow DOM
    const mountPoint = document.createElement('div');
    mountPoint.id = 'widget-root';
    this.shadowRoot.appendChild(mountPoint);

    // Render React component
    const root = createRoot(mountPoint);
    root.render(<Widget config={this.config} />);
  }

  // Public API methods
  open() {
    const widget = this.shadowRoot.querySelector('#widget-root');
    widget?.classList.add('open');
  }

  close() {
    const widget = this.shadowRoot.querySelector('#widget-root');
    widget?.classList.remove('open');
  }

  destroy() {
    this.shadowRoot.innerHTML = '';
  }
}

// Global API
window.PlatformWidget = PlatformWidget;

// Export for NPM
export default PlatformWidget;
```

**Key Features**:
- Shadow DOM prevents external styles from leaking in
- All styles scoped to widget only
- CSS variables for theme customization
- Public API for programmatic control

**Validation**:
```html
<!-- Test Shadow DOM isolation -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* These styles should NOT affect widget */
    button { background: red !important; }
    div { border: 10px solid blue !important; }
  </style>
</head>
<body>
  <div id="platform-widget"></div>
  <script src="/dist/widget.umd.js"></script>
  <script>
    new window.PlatformWidget('platform-widget', {
      apiUrl: 'http://localhost:3001',
      theme: 'light',
      position: 'bottom-right'
    });
  </script>
</body>
</html>
```

### Day 3-4: Widget UI Implementation

**Objective**: Implement collapsible chat widget with launcher button

**Components to Create**:

1. **`apps/widget-sdk/src/components/WidgetLauncher.tsx`**:
```typescript
interface WidgetLauncherProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function WidgetLauncher({ isOpen, onClick, unreadCount, position }: WidgetLauncherProps) {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <button
      onClick={onClick}
      className={`fixed ${positionClasses[position]} w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110`}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
      {isOpen ? <CloseIcon /> : <ChatIcon />}
    </button>
  );
}
```

2. **`apps/widget-sdk/src/components/WidgetWindow.tsx`**:
```typescript
import { ChatWindow } from '@platform/dashboard/src/components/chat/ChatWindow';

interface WidgetWindowProps {
  isOpen: boolean;
  position: string;
  config: WidgetConfig;
}

export function WidgetWindow({ isOpen, position, config }: WidgetWindowProps) {
  if (!isOpen) return null;

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col animate-slide-up`}
      style={{ zIndex: config.zIndex || 999999 }}
    >
      <div className="border-b p-4 flex items-center justify-between">
        <h3 className="font-semibold">AI Assistant</h3>
        <span className="text-xs text-gray-500">Powered by Platform</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatWindow
          sessionId={config.sessionId || 'widget-session'}
          token={config.token || ''}
          wsUrl={config.apiUrl.replace('http', 'ws') + '/ws'}
        />
      </div>
    </div>
  );
}
```

**Validation**:
- Launcher button appears in correct position
- Widget window opens/closes smoothly
- Unread count badge displays correctly
- Animations work (slide up, fade in)

### Day 4-5: Bundle Optimization

**Objective**: Optimize bundle size to <100KB gzipped

**Tasks**:

1. **Configure Code Splitting** (`vite.config.ts`):
```typescript
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'PlatformWidget',
      formats: ['es', 'umd'],
      fileName: (format) => `widget.${format}.js`,
    },
    rollupOptions: {
      external: [], // Bundle everything
      output: {
        manualChunks: undefined, // Single bundle for easy CDN
        globals: {},
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    cssCodeSplit: false, // Single CSS file
  },
});
```

2. **Tree Shaking**:
   - Review imports, remove unused dependencies
   - Use named imports instead of namespace imports
   - Remove unused @platform packages

3. **Lazy Loading**:
   - Lazy load heavy components (video calling)
   - Use React.lazy() for conditional features

**Validation**:
```bash
pnpm build
ls -lh dist/  # Check file sizes

# Target sizes:
# widget.es.js: <200KB raw, <60KB gzipped
# widget.umd.js: <180KB raw, <55KB gzipped
# style.css: <30KB raw, <8KB gzipped
```

---

## 📅 Week 2: CDN Distribution + Documentation (Days 6-10)

### Day 6-7: CDN Setup

**Objective**: Set up CDN distribution for easy integration

**Options**:

**Option 1: jsDelivr (Free, Recommended for Open Source)**
```bash
# Automatic after NPM publish
https://cdn.jsdelivr.net/npm/@platform/widget@latest/dist/widget.umd.js
https://cdn.jsdelivr.net/npm/@platform/widget@latest/dist/style.css
```

**Option 2: CloudFlare R2 (Custom Domain)**
```bash
# Upload to R2 bucket after build
aws s3 sync dist/ s3://platform-cdn/widget/ --profile cloudflare
# Configure custom domain: cdn.platform.com
```

**Option 3: Vercel Edge Network (Monorepo Integration)**
```javascript
// vercel.json
{
  "routes": [
    {
      "src": "/widget/(.*)",
      "dest": "/apps/widget-sdk/dist/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }
  ]
}
```

**CDN Integration Example**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Platform Widget Example</title>
  <link rel="stylesheet" href="https://cdn.platform.com/widget/style.css">
</head>
<body>
  <div id="platform-widget"></div>

  <script src="https://cdn.platform.com/widget/widget.umd.js"></script>
  <script>
    new window.PlatformWidget('platform-widget', {
      apiUrl: 'https://api.platform.com',
      token: 'your-api-token',
      theme: 'auto',
      position: 'bottom-right',
      primaryColor: '#3B82F6',
    });
  </script>
</body>
</html>
```

### Day 7-8: Documentation

**Objective**: Create comprehensive documentation

**Files to Create**:

1. **`apps/widget-sdk/README.md`** (Complete guide):
```markdown
# Platform Widget SDK

Embeddable AI assistant widget for any website.

## Features

- 🎨 Customizable themes (light, dark, auto)
- 🔒 Shadow DOM isolation (no style conflicts)
- 📦 Tiny bundle size (<100KB gzipped)
- 🚀 CDN + NPM distribution
- ⚡ Real-time chat with WebSocket
- 🤖 AI-powered responses with RAG
- 📱 Mobile-responsive design
- ♿ WCAG 2.1 AA accessibility

## Installation

### Via NPM

\`\`\`bash
npm install @platform/widget
# or
pnpm add @platform/widget
# or
yarn add @platform/widget
\`\`\`

### Via CDN

\`\`\`html
<link rel="stylesheet" href="https://cdn.platform.com/widget/style.css">
<script src="https://cdn.platform.com/widget/widget.umd.js"></script>
\`\`\`

## Quick Start

### HTML/JavaScript

\`\`\`html
<!DOCTYPE html>
<html>
<body>
  <div id="platform-widget"></div>

  <script src="https://cdn.platform.com/widget/widget.umd.js"></script>
  <script>
    const widget = new window.PlatformWidget('platform-widget', {
      apiUrl: 'https://api.your-domain.com',
      token: 'your-api-token',
      theme: 'auto',
      position: 'bottom-right',
    });
  </script>
</body>
</html>
\`\`\`

### React

\`\`\`tsx
import { useEffect, useRef } from 'react';
import PlatformWidget from '@platform/widget';

export function App() {
  const widgetRef = useRef<PlatformWidget | null>(null);

  useEffect(() => {
    widgetRef.current = new PlatformWidget('platform-widget', {
      apiUrl: process.env.REACT_APP_API_URL,
      token: process.env.REACT_APP_WIDGET_TOKEN,
      theme: 'auto',
      position: 'bottom-right',
    });

    return () => widgetRef.current?.destroy();
  }, []);

  return <div id="platform-widget" />;
}
\`\`\`

### Vue 3

\`\`\`vue
<template>
  <div id="platform-widget"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import PlatformWidget from '@platform/widget';

let widget = null;

onMounted(() => {
  widget = new PlatformWidget('platform-widget', {
    apiUrl: import.meta.env.VITE_API_URL,
    token: import.meta.env.VITE_WIDGET_TOKEN,
    theme: 'auto',
    position: 'bottom-right',
  });
});

onUnmounted(() => {
  widget?.destroy();
});
</script>
\`\`\`

### Angular

\`\`\`typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import PlatformWidget from '@platform/widget';

@Component({
  selector: 'app-root',
  template: '<div id="platform-widget"></div>',
})
export class AppComponent implements OnInit, OnDestroy {
  private widget: PlatformWidget | null = null;

  ngOnInit() {
    this.widget = new PlatformWidget('platform-widget', {
      apiUrl: environment.apiUrl,
      token: environment.widgetToken,
      theme: 'auto',
      position: 'bottom-right',
    });
  }

  ngOnDestroy() {
    this.widget?.destroy();
  }
}
\`\`\`

## Configuration

\`\`\`typescript
interface WidgetConfig {
  // Required
  apiUrl: string;           // Your Platform API URL

  // Optional
  token?: string;           // Authentication token
  theme?: 'light' | 'dark' | 'auto';  // Default: 'auto'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';  // Default: 'bottom-right'
  zIndex?: number;          // Default: 999999
  primaryColor?: string;    // Default: '#3B82F6'
  locale?: string;          // Default: 'en'
}
\`\`\`

## API Reference

### Constructor

\`\`\`typescript
new PlatformWidget(containerId: string, config: WidgetConfig)
\`\`\`

### Methods

\`\`\`typescript
widget.open()   // Open chat window
widget.close()  // Close chat window
widget.destroy() // Cleanup and remove widget
\`\`\`

## Examples

See `/examples` directory for complete working examples:
- `/examples/html` - Vanilla HTML/JS
- `/examples/react` - React integration
- `/examples/vue` - Vue 3 integration
- `/examples/angular` - Angular integration
- `/examples/wordpress` - WordPress plugin

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- iOS Safari: Last 2 versions
- Android Chrome: Last 2 versions

## License

MIT License - see LICENSE file for details
\`\`\`

2. **Create `/apps/widget-sdk/examples/` directory**:
   - `/html/index.html` - Vanilla JS example
   - `/react/App.tsx` - React example
   - `/vue/App.vue` - Vue example
   - `/angular/app.component.ts` - Angular example
   - `/wordpress/platform-widget.php` - WordPress plugin

### Day 8-9: Production Polish

**Objective**: Final optimizations and production readiness

**Tasks**:

1. **Error Handling**:
   - Graceful fallbacks for API failures
   - Retry logic with exponential backoff
   - User-friendly error messages

2. **Loading States**:
   - Skeleton loaders for initial load
   - Spinner during API calls
   - Progressive enhancement

3. **Accessibility**:
   - ARIA labels for all interactive elements
   - Keyboard navigation (Tab, Esc, Enter)
   - Screen reader announcements
   - Focus management

4. **Performance**:
   - Lazy load video calling features
   - Debounce user input
   - Virtualize long message lists
   - Image optimization

5. **Analytics** (Optional):
   - Track widget open/close events
   - Monitor message sent/received
   - Error tracking with Sentry

**Validation**:
- [ ] Lighthouse score >90 (Performance, Accessibility, Best Practices)
- [ ] WCAG 2.1 AA compliance
- [ ] Works on all supported browsers
- [ ] No console errors in production

### Day 9-10: Testing & Deployment

**Objective**: Comprehensive testing and NPM publish

**Tasks**:

1. **Manual Testing Checklist**:
   - [ ] Widget loads on clean HTML page
   - [ ] Shadow DOM isolates styles
   - [ ] Chat messages send/receive correctly
   - [ ] Theme switching works
   - [ ] Position changes apply correctly
   - [ ] Mobile responsive (320px - 768px)
   - [ ] Keyboard navigation complete
   - [ ] Screen reader compatible

2. **Cross-Browser Testing**:
   - [ ] Chrome (latest)
   - [ ] Firefox (latest)
   - [ ] Safari (latest)
   - [ ] Edge (latest)
   - [ ] Mobile Safari (iOS 15+)
   - [ ] Mobile Chrome (Android 11+)

3. **Bundle Analysis**:
```bash
pnpm build
npx vite-bundle-visualizer

# Check:
# - Total size <100KB gzipped
# - No duplicate dependencies
# - Tree shaking working correctly
```

4. **Publish to NPM**:
```bash
# Test publish
npm publish --dry-run

# Actual publish (requires npm login)
npm login
npm publish --access public

# Verify on NPM
https://www.npmjs.com/package/@platform/widget
```

5. **CDN Deployment**:
```bash
# Upload to CDN (CloudFlare R2 example)
aws s3 sync dist/ s3://platform-cdn/widget/ --profile cloudflare

# Verify CDN URLs
curl -I https://cdn.platform.com/widget/widget.umd.js
# Should return 200 OK with appropriate cache headers
```

---

## 📊 Success Metrics

### Bundle Size Targets

| File | Raw Size | Gzipped | Status |
|------|----------|---------|--------|
| widget.umd.js | <200KB | <60KB | ⏳ |
| widget.es.js | <200KB | <60KB | ⏳ |
| style.css | <30KB | <8KB | ⏳ |
| **Total** | **<230KB** | **<68KB** | ⏳ |

### Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Lighthouse Performance | >90 | ⏳ |
| Lighthouse Accessibility | >95 | ⏳ |
| First Contentful Paint | <1.5s | ⏳ |
| Time to Interactive | <3s | ⏳ |
| Cumulative Layout Shift | <0.1 | ⏳ |

### Quality Targets

| Metric | Target | Status |
|--------|--------|--------|
| TypeScript Errors | 0 | ✅ |
| Build Warnings | 0 | ⏳ |
| Console Errors | 0 | ⏳ |
| WCAG Compliance | AA | ⏳ |
| Browser Support | 95%+ | ⏳ |

---

## 🚀 Post-Phase 7: Production Deployment

### Infrastructure Setup

1. **CDN Configuration**:
   - CloudFlare R2 or Vercel Edge
   - Custom domain: `cdn.platform.com`
   - Cache headers: 1 year for immutable assets
   - Versioned URLs for cache busting

2. **NPM Registry**:
   - Publish to public npm registry
   - Configure automated publishing via GitHub Actions
   - Semantic versioning (semver)

3. **Documentation Site**:
   - Create `docs.platform.com/widget`
   - Interactive playground
   - Live examples
   - API reference

### Monitoring

1. **Usage Analytics**:
   - Widget installs tracking
   - Daily active widgets
   - Message volume

2. **Error Tracking**:
   - Sentry integration
   - Error rate monitoring
   - Performance regression alerts

3. **CDN Metrics**:
   - Bandwidth usage
   - Request volume
   - Cache hit rate

---

## 🎓 Lessons Learned (To Be Updated)

### Best Practices

1. **Shadow DOM**:
   - Prevents style conflicts completely
   - Requires inline CSS or CSS injection
   - CSS variables for customization

2. **Bundle Size**:
   - Tree shaking critical for <100KB target
   - Lazy loading for optional features
   - Terser minification essential

3. **Distribution**:
   - NPM for developers
   - CDN for non-technical users
   - Both formats (UMD + ESM) for compatibility

### Common Pitfalls

1. **Shadow DOM Events**:
   - Events don't bubble out of Shadow DOM by default
   - Use composed: true for custom events

2. **Focus Management**:
   - Shadow DOM requires explicit focus handling
   - Tab trapping within widget window

3. **Third-Party Styles**:
   - Cannot use external stylesheets in Shadow DOM
   - Must inline or inject CSS programmatically

---

## 📚 Documentation Checklist

- [ ] README.md with installation and quick start
- [ ] API reference documentation
- [ ] Configuration options guide
- [ ] Framework integration examples (React, Vue, Angular)
- [ ] WordPress plugin example
- [ ] Troubleshooting guide
- [ ] Contributing guide
- [ ] Changelog (CHANGELOG.md)
- [ ] License file (LICENSE)
- [ ] Security policy (SECURITY.md)

---

## 🏁 Phase 7 Completion Criteria

### Code

- [ ] Widget SDK builds successfully (<100KB gzipped)
- [ ] Shadow DOM implementation working
- [ ] All framework examples tested
- [ ] Zero TypeScript errors
- [ ] Zero console errors in production

### Distribution

- [ ] Published to NPM registry
- [ ] CDN deployment configured
- [ ] Versioned releases (semver)
- [ ] Automated publishing pipeline

### Documentation

- [ ] Complete README.md
- [ ] API reference
- [ ] Framework integration guides
- [ ] Live examples deployed

### Quality

- [ ] Lighthouse scores >90
- [ ] WCAG 2.1 AA compliance
- [ ] Cross-browser testing complete
- [ ] Mobile responsive verified

### Operations

- [ ] Monitoring configured
- [ ] Error tracking active
- [ ] Analytics setup
- [ ] CDN performance metrics

---

## 📖 Next Steps After Phase 7

### Production Launch

1. **Marketing Site Update**:
   - Add widget showcase
   - Customer testimonials
   - Integration guides

2. **Developer Relations**:
   - Blog post announcement
   - Tutorial videos
   - Community support forum

3. **Customer Onboarding**:
   - Setup wizard
   - Onboarding emails
   - Success metrics dashboard

### Future Enhancements

1. **Advanced Features**:
   - File attachments
   - Voice messages
   - Co-browsing
   - Screen sharing

2. **Customization**:
   - Custom branding
   - White-label option
   - Advanced theming

3. **Integrations**:
   - CRM integrations (Salesforce, HubSpot)
   - Ticketing systems (Zendesk, Freshdesk)
   - Analytics platforms (Google Analytics, Mixpanel)

---

**Ready to Begin**: Phase 7 Widget SDK development can start immediately. All prerequisites met. ✅
