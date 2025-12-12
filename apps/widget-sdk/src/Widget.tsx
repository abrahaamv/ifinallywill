/**
 * AI Assistant Widget
 *
 * Embeddable chat + screen share widget with Shadow DOM isolation.
 * Supports customizable theming, position, and LiveKit integration.
 *
 * IMPORTANT: apiUrl must be explicitly provided by the customer.
 * This should point to your deployed tRPC API endpoint.
 * Example: https://api.yourdomain.com/trpc
 */

import { useState, useCallback, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader } from '@platform/ui';
import { createModuleLogger } from './utils/logger';
import { createWidgetTRPCClient } from './utils/trpc';
import {
  WidgetProvider,
  type WidgetContextValue,
  type WidgetConfig,
  type AIPersonality,
  type WidgetMode,
} from './components/WidgetContext';
import { ChatMode } from './components/ChatMode';
import { VideoMode } from './components/VideoMode';
import { TransitionOverlay } from './components/TransitionOverlay';

const logger = createModuleLogger('Widget');

interface WidgetProps {
  /** API key for authentication (required) */
  apiKey: string;
  /** Backend API URL - must be explicitly provided (required) */
  apiUrl: string;
  /** Widget ID to load configuration (optional - for fetching server config) */
  widgetId?: string;
  /** Widget position on the page */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';
  /** Start minimized */
  defaultMinimized?: boolean;
  /** Primary color for branding (override) */
  primaryColor?: string;
  /** Widget title (override) */
  title?: string;
  /** Input placeholder text (override) */
  placeholder?: string;
  /** Initial greeting message (override) */
  greeting?: string;
}

export function Widget({
  apiKey,
  apiUrl,
  widgetId,
  position = 'bottom-right',
  theme = 'auto',
  defaultMinimized = true,
  primaryColor: propPrimaryColor,
  title: propTitle,
  placeholder: _propPlaceholder,
  greeting: propGreeting,
}: WidgetProps) {
  const [mode, setMode] = useState<WidgetMode>('chat');
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  // Widget and personality state
  const [widget, setWidget] = useState<WidgetConfig | null>(null);
  const [personality, setPersonality] = useState<AIPersonality | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create tRPC client
  const trpcClient = createWidgetTRPCClient(apiKey, apiUrl);

  // Fetch widget configuration on mount (only if widgetId is provided)
  useEffect(() => {
    if (!widgetId) {
      // No widgetId - use props directly, create a minimal widget config
      setWidget({
        id: 'prop-based-widget',
        name: propTitle || 'AI Assistant',
        domainWhitelist: [],
        settings: {
          theme: theme as 'light' | 'dark' | 'auto',
          position: position as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
          greeting: propGreeting,
          primaryColor: propPrimaryColor,
          enableScreenShare: false,
        },
        aiPersonalityId: null,
        isActive: true,
      });
      setIsLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        const result = await trpcClient.widgets.getWithPersonality.query({ widgetId });

        if (result.widget) {
          setWidget({
            id: result.widget.id,
            name: result.widget.name,
            domainWhitelist: result.widget.domainWhitelist || [],
            settings: result.widget.settings,
            aiPersonalityId: result.widget.aiPersonalityId,
            isActive: result.widget.isActive,
          });
        }

        if (result.personality) {
          setPersonality(result.personality);
        }
      } catch (err) {
        logger.error('Failed to fetch widget config', { error: err });
        setError('Failed to load widget configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [widgetId, trpcClient, propTitle, propGreeting, propPrimaryColor, theme, position]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Handle screen share transition (Placeholder - WebRTC integration coming soon)
  const handleShareScreen = useCallback(async () => {
    if (!sessionId) {
      logger.error('No active session for screen share');
      return;
    }

    // Video functionality placeholder - Janus Gateway integration coming soon
    logger.info('Video feature coming soon', { sessionId });
    // For now, just show a message via mode change
    setMode('chat');
  }, [sessionId]);

  // Handle end screen share
  const handleEndScreenShare = useCallback(() => {
    setLivekitToken(null);
    setLivekitUrl(null);
    setRoomName(null);
    setMode('chat');
  }, []);

  // Build context value
  const contextValue: WidgetContextValue = {
    widget,
    personality,
    isLoading,
    sessionId,
    setSessionId,
    mode,
    setMode,
    livekitToken,
    setLivekitToken,
    livekitUrl,
    roomName,
    apiUrl,
    apiKey,
    transitionToVideo: handleShareScreen,
    endScreenShare: handleEndScreenShare,
  };

  // Get styling from widget settings (prop overrides take precedence)
  const primaryColor = propPrimaryColor || widget?.settings?.primaryColor || '#6366f1';
  const widgetPosition = position || widget?.settings?.position || 'bottom-right';
  const displayTitle = propTitle || personality?.name || widget?.name || 'AI Assistant';

  const positionClasses: Record<string, string> = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  // Minimized state - show toggle button
  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed z-50 w-14 h-14 rounded-full shadow-2xl"
        style={{
          backgroundColor: primaryColor,
          ...(widgetPosition === 'bottom-right'
            ? { bottom: '1rem', right: '1rem' }
            : { bottom: '1rem', left: '1rem' }),
        }}
      >
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </Button>
    );
  }

  // Error state
  if (error) {
    return (
      <Card
        className={`fixed z-50 w-80 ${positionClasses[widgetPosition]}`}
      >
        <CardContent className="p-4">
          <p className="text-destructive text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setIsMinimized(true)}
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card
        className={`fixed z-50 w-96 h-[500px] ${positionClasses[widgetPosition]}`}
      >
        <CardContent className="flex items-center justify-center h-full">
          <div
            className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
            style={{ borderColor: `${primaryColor} transparent ${primaryColor} ${primaryColor}` }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <WidgetProvider value={contextValue}>
      <Card
        className={`fixed z-50 w-96 h-[500px] flex flex-col shadow-2xl ${positionClasses[widgetPosition]}`}
      >
        {/* Header */}
        <CardHeader className="flex-none p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mode === 'video' ? (
                <svg className="h-5 w-5" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              )}
              <div>
                <h3 className="font-medium text-sm">
                  {displayTitle}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {mode === 'video' ? 'Screen Share Active' : 'Chat'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(true)}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(true)}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 p-0 relative overflow-hidden">
          {mode === 'transitioning' && <TransitionOverlay />}

          {mode === 'chat' && (
            <ChatMode
              onSessionCreated={setSessionId}
              onShareScreen={handleShareScreen}
              showShareButton={widget?.settings?.enableScreenShare ?? false}
            />
          )}

          {mode === 'video' && <VideoMode onEnd={handleEndScreenShare} />}
        </CardContent>
      </Card>
    </WidgetProvider>
  );
}

export default Widget;
