/**
 * Platform Widget SDK Public API
 * Phase 7 - NPM Package Entry Point
 *
 * @example
 * // ES Module
 * import { PlatformWidget } from '@platform/widget-sdk';
 * const widget = new PlatformWidget('my-widget', {
 *   apiKey: 'your-api-key',
 *   tenantId: 'your-tenant-id',
 *   position: 'bottom-right',
 *   theme: 'auto',
 * });
 *
 * @example
 * // UMD (via CDN)
 * <script src="https://cdn.jsdelivr.net/npm/@platform/widget-sdk@latest/dist/widget-sdk.umd.js"></script>
 * <script>
 *   const widget = new PlatformWidget('my-widget', { ... });
 * </script>
 */

// Main Shadow DOM wrapper (recommended)
export { PlatformWidget } from './PlatformWidget';
export { PlatformWidget as default } from './PlatformWidget';

// React component (for React projects)
export { Widget } from './Widget';

// Component exports
export { ChatMode } from './components/ChatMode';
export { VideoMode } from './components/VideoMode';
export { TransitionOverlay } from './components/TransitionOverlay';
export {
  WidgetProvider,
  useWidgetContext,
  type WidgetContextValue,
  type WidgetConfig as WidgetContextConfig,
  type AIPersonality,
  type WidgetSettings,
  type WidgetMode,
} from './components/WidgetContext';

// TypeScript types
export type {
  WidgetConfig,
  Message,
  WidgetAPI,
} from './types';

// Version
export const VERSION = '1.0.0';
