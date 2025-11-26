/**
 * Embeddable Widget Module
 *
 * Configurable widget supporting chat and screen share modes
 * with seamless context preservation.
 */

export { EmbeddableWidget, default } from './EmbeddableWidget';
export { ChatMode } from './ChatMode';
export { VideoMode } from './VideoMode';
export { TransitionOverlay } from './TransitionOverlay';
export {
  EmbeddableWidgetProvider,
  useEmbeddableWidget,
  type AIPersonality,
  type Widget,
  type WidgetSettings,
  type WidgetMode,
  type EmbeddableWidgetContextValue,
} from './EmbeddableWidgetContext';
export { useWidgetConfig } from './hooks/useWidgetConfig';
export { useSessionManager } from './hooks/useSessionManager';
