# Widget SDK - Vue 3 Integration Guide

Complete guide for integrating the Platform Widget SDK into Vue 3 applications (Composition API).

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [TypeScript Support](#typescript-support)
- [Composition API Patterns](#composition-api-patterns)
- [Pinia Integration](#pinia-integration)
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

### Single File Component (Composition API)

```vue
<template>
  <div>
    <h1>My Vue Application</h1>
    <div id="widget-container"></div>
  </div>
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
  primaryColor: '#6366f1',
  title: 'AI Assistant',
};

onMounted(() => {
  widget.value = new PlatformWidget('widget-container', config);
});

onBeforeUnmount(() => {
  widget.value?.destroy();
});
</script>
```

### Options API (Vue 2 Compatible)

```vue
<template>
  <div id="widget-container"></div>
</template>

<script>
import { PlatformWidget } from '@platform/widget-sdk';

export default {
  name: 'WidgetComponent',
  data() {
    return {
      widget: null,
    };
  },
  mounted() {
    this.widget = new PlatformWidget('widget-container', {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
    });
  },
  beforeUnmount() {
    this.widget?.destroy();
  },
};
</script>
```

## TypeScript Support

### Typed Component

```vue
<script setup lang="ts">
import { ref, type Ref } from 'vue';
import type {
  WidgetConfig,
  Message,
  WidgetAPI,
} from '@platform/widget-sdk';
import { PlatformWidget } from '@platform/widget-sdk';

interface Props {
  apiKey: string;
  tenantId: string;
  theme?: 'light' | 'dark' | 'auto';
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'auto',
});

const widget: Ref<PlatformWidget | undefined> = ref();

const config: WidgetConfig = {
  apiKey: props.apiKey,
  tenantId: props.tenantId,
  position: 'bottom-right',
  theme: props.theme,
  primaryColor: '#6366f1',
};

onMounted(() => {
  widget.value = new PlatformWidget('widget-container', config);
});

onBeforeUnmount(() => {
  widget.value?.destroy();
});
</script>

<template>
  <div id="widget-container"></div>
</template>
```

## Composition API Patterns

### Composable Hook (Reusable Logic)

Create a reusable composable for widget management:

```typescript
// composables/useWidget.ts
import { ref, onMounted, onBeforeUnmount, watch, type Ref } from 'vue';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig, WidgetAPI } from '@platform/widget-sdk';

export function useWidget(config: Ref<WidgetConfig> | WidgetConfig) {
  const widget: Ref<PlatformWidget | undefined> = ref();
  const isOpen = ref(false);
  const containerId = `widget-${Date.now()}`;

  onMounted(() => {
    const initialConfig = unref(config);
    widget.value = new PlatformWidget(containerId, initialConfig);
  });

  onBeforeUnmount(() => {
    widget.value?.destroy();
  });

  // Watch for config changes
  if (isRef(config)) {
    watch(config, (newConfig) => {
      widget.value?.updateConfig(newConfig);
    }, { deep: true });
  }

  const open = () => {
    widget.value?.open();
    isOpen.value = true;
  };

  const close = () => {
    widget.value?.close();
    isOpen.value = false;
  };

  const toggle = () => {
    if (widget.value?.isOpen()) {
      close();
    } else {
      open();
    }
  };

  return {
    widget,
    isOpen,
    containerId,
    open,
    close,
    toggle,
  };
}
```

### Usage in Component

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useWidget } from '@/composables/useWidget';
import type { WidgetConfig } from '@platform/widget-sdk';

const config = ref<WidgetConfig>({
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
  position: 'bottom-right',
  theme: 'auto',
});

const { containerId, open, close, toggle, isOpen } = useWidget(config);

const changeTheme = (newTheme: 'light' | 'dark' | 'auto') => {
  config.value = { ...config.value, theme: newTheme };
};
</script>

<template>
  <div>
    <div class="controls">
      <button @click="open">Open Widget</button>
      <button @click="close">Close Widget</button>
      <button @click="toggle">Toggle Widget</button>

      <button @click="changeTheme('light')">Light Theme</button>
      <button @click="changeTheme('dark')">Dark Theme</button>
      <button @click="changeTheme('auto')">Auto Theme</button>
    </div>

    <div :id="containerId"></div>

    <p>Widget is {{ isOpen ? 'open' : 'closed' }}</p>
  </div>
</template>
```

### Reactive Configuration

Update widget configuration reactively:

```vue
<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useWidget } from '@/composables/useWidget';

const config = reactive({
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
  position: 'bottom-right' as const,
  theme: 'auto' as 'light' | 'dark' | 'auto',
  primaryColor: '#6366f1',
  title: 'AI Assistant',
});

const { containerId, widget } = useWidget(config);

// Automatically update widget when config changes
watch(config, (newConfig) => {
  widget.value?.updateConfig(newConfig);
}, { deep: true });

const updatePrimaryColor = (color: string) => {
  config.primaryColor = color;
};

const updateTitle = (title: string) => {
  config.title = title;
};
</script>

<template>
  <div>
    <input
      type="color"
      :value="config.primaryColor"
      @input="updatePrimaryColor($event.target.value)"
    />

    <input
      type="text"
      :value="config.title"
      @input="updateTitle($event.target.value)"
    />

    <div :id="containerId"></div>
  </div>
</template>
```

## Pinia Integration

### Store Definition

```typescript
// stores/widget.ts
import { defineStore } from 'pinia';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

export const useWidgetStore = defineStore('widget', {
  state: () => ({
    isOpen: false,
    theme: 'auto' as 'light' | 'dark' | 'auto',
    primaryColor: '#6366f1',
    widgetInstance: null as PlatformWidget | null,
  }),

  actions: {
    initWidget(config: WidgetConfig) {
      this.widgetInstance = new PlatformWidget('pinia-widget-container', {
        ...config,
        theme: this.theme,
        primaryColor: this.primaryColor,
      });
    },

    destroyWidget() {
      this.widgetInstance?.destroy();
      this.widgetInstance = null;
    },

    open() {
      this.widgetInstance?.open();
      this.isOpen = true;
    },

    close() {
      this.widgetInstance?.close();
      this.isOpen = false;
    },

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    updateTheme(theme: 'light' | 'dark' | 'auto') {
      this.theme = theme;
      this.widgetInstance?.updateConfig({ theme });
    },

    updatePrimaryColor(color: string) {
      this.primaryColor = color;
      this.widgetInstance?.updateConfig({ primaryColor: color });
    },
  },

  getters: {
    isInitialized: (state) => state.widgetInstance !== null,
  },
});
```

### Component Usage

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useWidgetStore } from '@/stores/widget';

const widgetStore = useWidgetStore();

onMounted(() => {
  widgetStore.initWidget({
    apiKey: 'your-api-key',
    tenantId: 'your-tenant-id',
    position: 'bottom-right',
  });
});

onBeforeUnmount(() => {
  widgetStore.destroyWidget();
});
</script>

<template>
  <div>
    <div class="controls">
      <button @click="widgetStore.toggle">Toggle Widget</button>

      <select @change="widgetStore.updateTheme($event.target.value)">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>

      <input
        type="color"
        :value="widgetStore.primaryColor"
        @input="widgetStore.updatePrimaryColor($event.target.value)"
      />
    </div>

    <div id="pinia-widget-container"></div>

    <p>Widget {{ widgetStore.isOpen ? 'is open' : 'is closed' }}</p>
  </div>
</template>
```

## Performance Optimization

### Lazy Loading with defineAsyncComponent

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

const WidgetComponent = defineAsyncComponent(() =>
  import('./components/WidgetWrapper.vue')
);
</script>

<template>
  <Suspense>
    <template #default>
      <WidgetComponent
        api-key="your-api-key"
        tenant-id="your-tenant-id"
      />
    </template>

    <template #fallback>
      <div>Loading widget...</div>
    </template>
  </Suspense>
</template>
```

### Memoization with computed

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { WidgetConfig } from '@platform/widget-sdk';

const apiKey = ref('your-api-key');
const tenantId = ref('your-tenant-id');
const theme = ref<'light' | 'dark' | 'auto'>('auto');

// Memoize config to prevent unnecessary updates
const widgetConfig = computed<WidgetConfig>(() => ({
  apiKey: apiKey.value,
  tenantId: tenantId.value,
  position: 'bottom-right',
  theme: theme.value,
  primaryColor: '#6366f1',
}));

const { containerId } = useWidget(widgetConfig);
</script>

<template>
  <div :id="containerId"></div>
</template>
```

## Testing

### Vitest Unit Testing

```typescript
// WidgetWrapper.spec.ts
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformWidget } from '@platform/widget-sdk';
import WidgetWrapper from './WidgetWrapper.vue';

vi.mock('@platform/widget-sdk');

describe('WidgetWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize widget on mount', () => {
    const mockWidget = {
      open: vi.fn(),
      close: vi.fn(),
      destroy: vi.fn(),
    };
    vi.mocked(PlatformWidget).mockImplementation(() => mockWidget as any);

    mount(WidgetWrapper, {
      props: {
        apiKey: 'test-api-key',
        tenantId: 'test-tenant-id',
      },
    });

    expect(PlatformWidget).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        apiKey: 'test-api-key',
        tenantId: 'test-tenant-id',
      })
    );
  });

  it('should destroy widget on unmount', () => {
    const mockDestroy = vi.fn();
    const mockWidget = {
      destroy: mockDestroy,
    };
    vi.mocked(PlatformWidget).mockImplementation(() => mockWidget as any);

    const wrapper = mount(WidgetWrapper, {
      props: {
        apiKey: 'test-api-key',
        tenantId: 'test-tenant-id',
      },
    });

    wrapper.unmount();

    expect(mockDestroy).toHaveBeenCalled();
  });

  it('should update config when props change', async () => {
    const mockUpdateConfig = vi.fn();
    const mockWidget = {
      updateConfig: mockUpdateConfig,
      destroy: vi.fn(),
    };
    vi.mocked(PlatformWidget).mockImplementation(() => mockWidget as any);

    const wrapper = mount(WidgetWrapper, {
      props: {
        apiKey: 'test-api-key',
        tenantId: 'test-tenant-id',
        theme: 'light',
      },
    });

    await wrapper.setProps({ theme: 'dark' });

    expect(mockUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    );
  });
});
```

### E2E Testing with Playwright

```typescript
import { test, expect } from '@playwright/test';

test('vue widget opens and closes correctly', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Click open button
  await page.click('button:has-text("Open Widget")');

  // Verify widget is visible
  const widget = page.locator('#widget-container');
  await expect(widget).toBeVisible();

  // Close widget
  await page.click('button:has-text("Close Widget")');

  // Wait for animation
  await page.waitForTimeout(300);

  // Verify widget is hidden
  await expect(widget).not.toBeVisible();
});

test('vue widget theme changes correctly', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Change theme to dark
  await page.selectOption('select', 'dark');

  // Verify dark theme applied
  const shadowRoot = await page.locator('#widget-container').evaluateHandle(
    (el) => el.shadowRoot
  );

  const themeClass = await shadowRoot.evaluate((root: any) =>
    root.querySelector('[data-theme]')?.getAttribute('data-theme')
  );

  expect(themeClass).toBe('dark');
});
```

## Troubleshooting

### Widget Not Rendering

**Problem**: Container exists but widget doesn't appear.

**Solution**: Ensure Shadow DOM support and proper lifecycle:

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { PlatformWidget } from '@platform/widget-sdk';

const widget = ref<PlatformWidget>();
const error = ref<string>();

onMounted(async () => {
  try {
    // Check Shadow DOM support
    if (!('attachShadow' in Element.prototype)) {
      throw new Error('Shadow DOM not supported in this browser');
    }

    widget.value = new PlatformWidget('widget-container', {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      debug: true, // Enable debug logging
    });

    console.log('Widget initialized:', widget.value.getShadowRoot());
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
    console.error('Widget initialization failed:', err);
  }
});

onBeforeUnmount(() => {
  widget.value?.destroy();
});
</script>

<template>
  <div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else id="widget-container"></div>
  </div>
</template>
```

### Memory Leaks

**Problem**: Widget instances not cleaned up, causing memory leaks.

**Solution**: Ensure proper cleanup in lifecycle hooks:

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref } from 'vue';
import { PlatformWidget } from '@platform/widget-sdk';

const widget = ref<PlatformWidget>();

onMounted(() => {
  widget.value = new PlatformWidget('widget-container', {
    apiKey: 'your-api-key',
    tenantId: 'your-tenant-id',
  });
});

// Use both hooks for safety
onBeforeUnmount(() => {
  console.log('Cleaning up widget...');
  widget.value?.destroy();
  widget.value = undefined;
});

onUnmounted(() => {
  // Failsafe cleanup
  if (widget.value) {
    console.warn('Widget not destroyed in onBeforeUnmount, destroying now');
    widget.value.destroy();
    widget.value = undefined;
  }
});
</script>
```

### Hot Module Replacement (HMR) Issues

**Problem**: Widget state lost during development with HMR.

**Solution**: Implement proper HMR handling:

```typescript
// composables/useWidget.ts
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

export function useWidget(config: WidgetConfig) {
  const widget = ref<PlatformWidget>();
  const containerId = `widget-${Date.now()}`;

  onMounted(() => {
    widget.value = new PlatformWidget(containerId, config);

    // HMR cleanup
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        console.log('HMR: Cleaning up widget');
        widget.value?.destroy();
      });
    }
  });

  onBeforeUnmount(() => {
    widget.value?.destroy();
  });

  return { widget, containerId };
}
```

## Best Practices

1. **Use Composition API**: Prefer Composition API for better TypeScript support and reusability
2. **Create Composables**: Extract widget logic into reusable composables
3. **Proper Cleanup**: Always destroy widget in `onBeforeUnmount` hook
4. **TypeScript**: Use provided type definitions for type safety
5. **Reactive Config**: Use `reactive()` or `ref()` for dynamic configuration
6. **Error Handling**: Wrap initialization in try-catch blocks
7. **Lazy Loading**: Use `defineAsyncComponent` for large applications
8. **Store Integration**: Use Pinia for global widget state management

## Additional Resources

- [Widget SDK API Reference](../reference/widget-sdk.md)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia State Management](https://pinia.vuejs.org/)

## Support

For issues or questions:
- [GitHub Issues](https://github.com/yourusername/platform/issues)
- [Documentation](https://github.com/yourusername/platform/tree/main/docs)
