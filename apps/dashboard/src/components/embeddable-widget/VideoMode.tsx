/**
 * VideoMode Component
 *
 * LiveKit screen share interface for the unified widget.
 * Uses @livekit/components-react for real WebRTC connection.
 * Shows screen preview, live transcript, and controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';
import { Button } from '@platform/ui';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useDataChannel,
  useConnectionState,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { ConnectionState, Track, RoomEvent, type LocalTrackPublication } from 'livekit-client';
import { useEmbeddableWidget } from './EmbeddableWidgetContext';

interface VideoModeProps {
  onEnd: () => void;
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface AgentMessage {
  type: 'agent_message';
  content: string;
  timestamp: number;
  is_final: boolean;
}

/**
 * Inner component that uses LiveKit hooks (must be inside LiveKitRoom)
 */
function VideoModeInner({ onEnd }: VideoModeProps) {
  const { personality } = useEmbeddableWidget();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();

  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState<LocalTrackPublication | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // Listen for agent messages via data channel
  const { message: dataMessage } = useDataChannel('agent.chat');

  // Process incoming agent messages
  useEffect(() => {
    if (dataMessage) {
      try {
        const decoded = new TextDecoder().decode(dataMessage.payload);
        const parsed = JSON.parse(decoded) as AgentMessage;

        if (parsed.type === 'agent_message' && parsed.content) {
          setTranscript(prev => [
            ...prev,
            {
              id: `agent-${Date.now()}`,
              speaker: 'assistant',
              text: parsed.content,
              timestamp: new Date(parsed.timestamp * 1000),
            },
          ]);
        }
      } catch (e) {
        // Handle plain text messages
        const text = new TextDecoder().decode(dataMessage.payload);
        if (text.trim()) {
          setTranscript(prev => [
            ...prev,
            {
              id: `agent-${Date.now()}`,
              speaker: 'assistant',
              text: text,
              timestamp: new Date(),
            },
          ]);
        }
      }
    }
  }, [dataMessage]);

  // Auto-scroll transcript
  useEffect(() => {
    const transcriptEl = document.getElementById('transcript-container');
    if (transcriptEl) {
      transcriptEl.scrollTop = transcriptEl.scrollHeight;
    }
  }, [transcript]);

  // Start screen share automatically when connected
  useEffect(() => {
    const startScreenShare = async () => {
      if (connectionState === ConnectionState.Connected && !isScreenSharing && localParticipant) {
        try {
          // Enable screen share
          const track = await localParticipant.setScreenShareEnabled(true, {
            audio: true, // Include tab audio if available
            video: true,
            contentHint: 'detail', // Optimize for screen content
          });

          if (track) {
            setIsScreenSharing(true);
            console.log('Screen share started successfully');
          }
        } catch (error) {
          console.error('Failed to start screen share:', error);
          // User may have cancelled the screen picker
        }
      }
    };

    startScreenShare();
  }, [connectionState, localParticipant, isScreenSharing]);

  // Track screen share track changes
  useEffect(() => {
    if (!localParticipant) return;

    const handleTrackPublished = (publication: LocalTrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        setScreenTrack(publication);
        setIsScreenSharing(true);
      }
    };

    const handleTrackUnpublished = (publication: LocalTrackPublication) => {
      if (publication.source === Track.Source.ScreenShare) {
        setScreenTrack(null);
        setIsScreenSharing(false);
      }
    };

    localParticipant.on('localTrackPublished', handleTrackPublished);
    localParticipant.on('localTrackUnpublished', handleTrackUnpublished);

    // Check for existing screen share
    const existingScreenShare = Array.from(localParticipant.trackPublications.values())
      .find(t => t.source === Track.Source.ScreenShare);
    if (existingScreenShare) {
      setScreenTrack(existingScreenShare);
      setIsScreenSharing(true);
    }

    return () => {
      localParticipant.off('localTrackPublished', handleTrackPublished);
      localParticipant.off('localTrackUnpublished', handleTrackUnpublished);
    };
  }, [localParticipant]);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    if (!localParticipant) return;

    try {
      await localParticipant.setMicrophoneEnabled(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Failed to toggle mic:', error);
    }
  }, [localParticipant, isMuted]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return;

    try {
      await localParticipant.setScreenShareEnabled(!isScreenSharing);
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
    }
  }, [localParticipant, isScreenSharing]);

  // Handle end
  const handleEnd = useCallback(async () => {
    if (localParticipant) {
      // Stop screen share
      await localParticipant.setScreenShareEnabled(false);
      await localParticipant.setMicrophoneEnabled(false);
    }

    // Disconnect from room
    room?.disconnect();
    onEnd();
  }, [localParticipant, room, onEnd]);

  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting ||
                       connectionState === ConnectionState.Reconnecting;

  return (
    <div className="flex flex-col h-full">
      {/* Audio renderer for agent voice */}
      <RoomAudioRenderer />

      {/* Screen Share Preview */}
      <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden relative min-h-[200px]">
        {isConnecting ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-slate-500 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-300 text-sm">Connecting...</p>
            </div>
          </div>
        ) : isConnected ? (
          <>
            {/* Screen share preview */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isScreenSharing ? (
                <div className="text-center">
                  <Monitor className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <p className="text-slate-300 text-sm">Screen is being shared</p>
                  <p className="text-green-400 text-xs mt-1">
                    AI Agent is watching your screen
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <MonitorOff className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">Screen share stopped</p>
                  <button
                    onClick={toggleScreenShare}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
                  >
                    Share Screen
                  </button>
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
                <span className="text-white text-xs">
                  AI: {personality.name}
                </span>
              </div>
            )}

            {/* Mic status */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full">
              {isMuted ? (
                <>
                  <MicOff className="w-3 h-3 text-red-400" />
                  <span className="text-red-400 text-xs">Muted</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-green-400" />
                  <span className="text-green-400 text-xs">Mic On</span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-400 text-sm">Disconnected</p>
            </div>
          </div>
        )}
      </div>

      {/* Live Transcript */}
      <div className="h-32 border-t">
        <div className="px-3 py-2 border-b bg-muted/50">
          <span className="text-xs font-medium text-muted-foreground">
            Live Transcript
          </span>
        </div>
        <div id="transcript-container" className="h-[calc(100%-32px)] overflow-y-auto">
          <div className="p-3 space-y-2">
            {transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isConnected
                  ? 'Speak or share your screen. AI will respond...'
                  : 'Connecting...'}
              </p>
            ) : (
              transcript.map((entry) => (
                <div key={entry.id} className="text-sm">
                  <span className={entry.speaker === 'user' ? 'text-primary' : 'text-foreground'}>
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
          onClick={toggleMic}
          disabled={!isConnected}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button
          variant={isScreenSharing ? 'outline' : 'secondary'}
          size="icon"
          onClick={toggleScreenShare}
          disabled={!isConnected}
          title={isScreenSharing ? 'Stop sharing' : 'Start sharing'}
        >
          {isScreenSharing ? (
            <Monitor className="h-4 w-4" />
          ) : (
            <MonitorOff className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="destructive"
          onClick={handleEnd}
          className="px-6"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          End
        </Button>
      </div>
    </div>
  );
}

/**
 * VideoMode wrapper - provides LiveKit context
 */
export function VideoMode({ onEnd }: VideoModeProps) {
  const { livekitToken, livekitUrl, roomName } = useEmbeddableWidget();

  // Missing configuration error
  if (!livekitToken || !livekitUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive text-sm">Missing LiveKit configuration</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onEnd}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={true}
      video={false}  // Don't auto-enable camera
      audio={true}   // Enable microphone by default
      onDisconnected={onEnd}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          screenShareEncoding: {
            maxBitrate: 3_000_000, // 3 Mbps for screen share
            maxFramerate: 15,
          },
        },
      }}
    >
      <VideoModeInner onEnd={onEnd} />
    </LiveKitRoom>
  );
}
