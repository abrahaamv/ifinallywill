/**
 * EmbeddableWidget Context
 *
 * Provides shared state for the embeddable AI assistant widget.
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface AIPersonality {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  temperature: number;
  maxTokens: number | null;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  preferredModel: string | null;
  isDefault: boolean;
}

export interface WidgetSettings {
  theme: 'light' | 'dark' | 'auto';
  position: 'bottom-right' | 'bottom-left';
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
  enableScreenShare?: boolean;
  screenSharePrompt?: string;
}

export interface Widget {
  id: string;
  name: string;
  domainWhitelist: string[];
  settings: WidgetSettings | null;
  aiPersonalityId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WidgetMode = 'chat' | 'video' | 'transitioning';

export interface EmbeddableWidgetContextValue {
  // Widget configuration
  widget: Widget | null;
  personality: AIPersonality | null;
  isLoading: boolean;

  // Session state
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  // Mode management
  mode: WidgetMode;
  setMode: (mode: WidgetMode) => void;

  // LiveKit state
  livekitToken: string | null;
  setLivekitToken: (token: string | null) => void;
  livekitUrl: string | null;
  roomName: string | null;

  // Actions
  transitionToVideo: () => Promise<void>;
  endScreenShare: () => void;
}

const EmbeddableWidgetContext = createContext<EmbeddableWidgetContextValue | null>(null);

export function EmbeddableWidgetProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: EmbeddableWidgetContextValue;
}) {
  return (
    <EmbeddableWidgetContext.Provider value={value}>
      {children}
    </EmbeddableWidgetContext.Provider>
  );
}

export function useEmbeddableWidget() {
  const context = useContext(EmbeddableWidgetContext);
  if (!context) {
    throw new Error('useEmbeddableWidget must be used within EmbeddableWidgetProvider');
  }
  return context;
}
