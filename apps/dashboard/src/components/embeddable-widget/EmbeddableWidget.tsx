/**
 * EmbeddableWidget Component
 *
 * Main container for the embeddable AI assistant widget.
 * Supports seamless mode switching between chat and screen share.
 * This is what customers will see when they embed the widget on their sites.
 */

import { useState, useCallback } from 'react';
import { MessageSquare, Monitor, X, Minimize2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, cn } from '@platform/ui';
import { useWidgetConfig } from './hooks/useWidgetConfig';
import { useSessionManager } from './hooks/useSessionManager';
import {
  EmbeddableWidgetProvider,
  type WidgetMode,
  type EmbeddableWidgetContextValue,
} from './EmbeddableWidgetContext';
import { ChatMode } from './ChatMode';
import { VideoMode } from './VideoMode';
import { TransitionOverlay } from './TransitionOverlay';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('EmbeddableWidget');

interface EmbeddableWidgetProps {
  widgetId: string;
  isPreview?: boolean;
  defaultMinimized?: boolean;
  showDeveloperInfo?: boolean;
  className?: string;
}

export function EmbeddableWidget({
  widgetId,
  isPreview = false,
  defaultMinimized = true,
  showDeveloperInfo = false,
  className,
}: EmbeddableWidgetProps) {
  const [mode, setMode] = useState<WidgetMode>('chat');
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  // Fetch widget config and personality
  const { widget, personality, isLoading, error } = useWidgetConfig(widgetId);

  // Session management
  const {
    sessionId,
    setSessionId,
  } = useSessionManager(widgetId);

  // Handle screen share button click (placeholder - video coming soon)
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
    // Note: Messages from video session are persisted automatically
  }, []);

  // Build context value
  const contextValue: EmbeddableWidgetContextValue = {
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
    transitionToVideo: handleShareScreen,
    endScreenShare: handleEndScreenShare,
  };

  // Get theme colors from widget settings
  const primaryColor = widget?.settings?.primaryColor || '#6366f1';
  const position = widget?.settings?.position || 'bottom-right';

  // Minimized state - just show the toggle button
  if (isMinimized && !isPreview) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className={cn(
          'fixed z-50 w-14 h-14 rounded-full shadow-lg',
          position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6',
          className
        )}
        style={{ backgroundColor: primaryColor }}
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </Button>
    );
  }

  // Error state
  if (error && !isPreview) {
    return (
      <Card
        className={cn(
          'fixed z-50 w-80',
          position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6',
          className
        )}
      >
        <CardContent className="p-4">
          <p className="text-destructive text-sm">Failed to load widget</p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading && !isPreview) {
    return (
      <Card
        className={cn(
          'fixed z-50 w-96 h-[500px]',
          position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6',
          className
        )}
      >
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <EmbeddableWidgetProvider value={contextValue}>
      <Card
        className={cn(
          'z-50 w-96 h-[500px] flex flex-col shadow-xl',
          !isPreview && 'fixed',
          !isPreview && (position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'),
          isPreview && 'relative',
          className
        )}
      >
        {/* Header */}
        <CardHeader className="flex-none p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mode === 'video' ? (
                <Monitor className="h-5 w-5 text-primary" />
              ) : (
                <MessageSquare className="h-5 w-5 text-primary" />
              )}
              <div>
                <h3 className="font-medium text-sm">
                  {personality?.name || widget?.name || 'AI Assistant'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {mode === 'video' ? 'Screen Share Active' : 'Chat'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isPreview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
              {!isPreview && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
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
              showDeveloperInfo={showDeveloperInfo}
            />
          )}

          {mode === 'video' && <VideoMode onEnd={handleEndScreenShare} />}
        </CardContent>
      </Card>
    </EmbeddableWidgetProvider>
  );
}

export default EmbeddableWidget;
