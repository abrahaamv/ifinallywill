/**
 * Widget Context
 *
 * Provides shared state for the embeddable AI assistant widget.
 * Used by both chat and video modes.
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface AIPersonality {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  temperature: number;
  maxTokens: number | null;
  preferredModel: string | null;
  isDefault: boolean;
}

export interface WidgetSettings {
  theme: 'light' | 'dark' | 'auto';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
  enableScreenShare?: boolean;
  screenSharePrompt?: string;
}

export interface WidgetConfig {
  id: string;
  name: string;
  domainWhitelist: string[];
  settings: WidgetSettings | null;
  aiPersonalityId: string | null;
  isActive: boolean;
}

export type WidgetMode = 'chat' | 'video' | 'transitioning';

export interface WidgetContextValue {
  // Widget configuration
  widget: WidgetConfig | null;
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

  // API configuration
  apiUrl: string;
  apiKey: string;

  // Actions
  transitionToVideo: () => Promise<void>;
  endScreenShare: () => void;
}

const WidgetContext = createContext<WidgetContextValue | null>(null);

export function WidgetProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WidgetContextValue;
}) {
  return (
    <WidgetContext.Provider value={value}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgetContext() {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error('useWidgetContext must be used within WidgetProvider');
  }
  return context;
}
