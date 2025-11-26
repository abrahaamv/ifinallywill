/**
 * VideoMode Component
 *
 * LiveKit screen share interface for the widget.
 * Shows screen preview, live transcript, and controls.
 */

import { useState, useEffect } from 'react';
import { Button } from '@platform/ui';
import { useWidgetContext } from './WidgetContext';

// Note: In production, import LiveKit components:
// import { LiveKitRoom, VideoTrack, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react';

interface VideoModeProps {
  onEnd: () => void;
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function VideoMode({ onEnd }: VideoModeProps) {
  const { livekitToken, livekitUrl, roomName, personality, widget } = useWidgetContext();
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(true);
  const [transcript] = useState<TranscriptEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const primaryColor = widget?.settings?.primaryColor || '#6366f1';

  // Simulated connection (replace with actual LiveKit connection)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnd = () => {
    setIsConnected(false);
    setIsScreenSharing(false);
    onEnd();
  };

  if (!livekitToken || !livekitUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Missing LiveKit configuration</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Screen Share Preview */}
      <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden relative min-h-[200px]">
        {isConnected ? (
          <>
            {/* In production, this would be the LiveKit VideoTrack component */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isScreenSharing ? (
                <div className="text-center">
                  <svg className="h-16 w-16 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-300 text-sm">Screen is being shared</p>
                  <p className="text-slate-500 text-xs mt-1">Room: {roomName}</p>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="h-16 w-16 text-slate-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p className="text-slate-400 text-sm">Screen share paused</p>
                </div>
              )}
            </div>

            {/* Connection indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white text-xs">Connected</span>
            </div>

            {/* AI personality indicator */}
            {personality && (
              <div className="absolute top-4 right-4 bg-slate-800/80 px-3 py-1.5 rounded-full">
                <span className="text-white text-xs">AI: {personality.name}</span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-slate-500 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-300 text-sm">Connecting...</p>
            </div>
          </div>
        )}
      </div>

      {/* Live Transcript */}
      <div className="h-32 border-t">
        <div className="px-3 py-2 border-b bg-muted/50">
          <span className="text-xs font-medium text-muted-foreground">Live Transcript</span>
        </div>
        <div className="h-[calc(100%-32px)] overflow-y-auto">
          <div className="p-3 space-y-2">
            {transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Transcript will appear here...
              </p>
            ) : (
              transcript.map((entry) => (
                <div key={entry.id} className="text-sm">
                  <span style={{ color: entry.speaker === 'user' ? primaryColor : 'inherit' }}>
                    {entry.speaker === 'user' ? 'You' : personality?.name || 'AI'}:
                  </span>{' '}
                  <span className="text-muted-foreground">{entry.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4 border-t">
        <Button
          variant={isMuted ? 'destructive' : 'outline'}
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </Button>

        <Button
          variant={isScreenSharing ? 'outline' : 'secondary'}
          size="icon"
          onClick={() => setIsScreenSharing(!isScreenSharing)}
          title={isScreenSharing ? 'Stop sharing' : 'Resume sharing'}
        >
          {isScreenSharing ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </Button>

        <Button
          variant="destructive"
          onClick={handleEnd}
          className="px-6"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
          End Screen Share
        </Button>
      </div>
    </div>
  );
}
