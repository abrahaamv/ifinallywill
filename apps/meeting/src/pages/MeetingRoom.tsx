/**
 * Meeting Room Page with LiveKit Integration (Phase 5 - Week 2)
 * Real video/audio/screen sharing with AI assistant
 */

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useDataChannel,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '@livekit/components-styles';
import { Button } from '@platform/ui';
import { trpc } from '../utils/trpc';

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: Date;
}

export function MeetingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // tRPC queries and mutations
  const listRooms = trpc.livekit.listRooms.useQuery();
  const joinRoom = trpc.livekit.joinRoom.useMutation();

  // Request access token on mount
  useEffect(() => {
    const requestToken = async () => {
      // Validate room ID from URL
      if (!roomId) {
        setError('Room ID is required');
        setIsLoading(false);
        navigate('/');
        return;
      }

      try {
        // Wait for room list to load
        if (listRooms.isLoading) {
          return;
        }

        // Check if room exists in LiveKit
        const rooms = listRooms.data?.rooms || [];
        const roomExists = rooms.some(
          (room) => room.fullRoomName === roomId || room.roomName === roomId
        );

        if (!roomExists) {
          setError(`Room "${roomId}" does not exist or has been deleted`);
          setIsLoading(false);
          return;
        }

        // Get participant name from session storage or use default
        const participantName = sessionStorage.getItem('displayName') || 'Guest';

        // Join room via tRPC API (uses full room name with tenant prefix)
        const result = await joinRoom.mutateAsync({
          roomName: roomId,
          participantName,
        });

        setToken(result.token);
        setLivekitUrl(result.livekitUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to join room:', err);
        setError(err instanceof Error ? err.message : 'Failed to join meeting room');
        setIsLoading(false);
      }
    };

    requestToken();
  }, [roomId, navigate, listRooms.isLoading, listRooms.data, joinRoom]);

  // Handle connection errors
  const handleError = (error: Error) => {
    console.error('LiveKit connection error:', error);
    setError('Connection failed. Please try again.');
  };

  // Handle leaving room
  const handleLeave = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <span className="text-lg">Joining meeting...</span>
        </div>
      </div>
    );
  }

  if (error || !token || !livekitUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <svg
            className="h-16 w-16 text-destructive mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-500 mb-4">{error || 'Failed to load meeting'}</p>
          <p className="text-sm text-muted-foreground mb-6">
            LiveKit requires environment variables to be configured. See PHASE_5_WEEK_2_READINESS.md
            for setup instructions.
          </p>
          <Button onClick={() => navigate('/')}>Return to Lobby</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Meeting: {roomId}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="text-white border-white hover:bg-gray-800"
        >
          {isChatOpen ? 'Hide Chat' : 'Show Chat'}
        </Button>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 flex">
        <div className={`flex-1 ${isChatOpen ? 'pr-80' : ''} transition-all`}>
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl}
            connect={true}
            onError={handleError}
            onDisconnected={handleLeave}
            audio={true}
            video={true}
            screen={true}
          >
            {/* Video Grid */}
            <VideoGrid />

            {/* Audio Renderer */}
            <RoomAudioRenderer />

            {/* Chat Data Channel Handler */}
            <ChatHandler setMessages={setMessages} />

            {/* Control Bar */}
            <ControlBar />
          </LiveKitRoom>
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <ChatPanel messages={messages} onClose={() => setIsChatOpen(false)} />
        )}
      </div>
    </div>
  );
}

/**
 * Video Grid Component
 * Displays all participants in grid layout
 */
function VideoGrid() {
  // Subscribe to all video and screen share tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 180px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

/**
 * Chat Data Channel Handler
 * Listens for data messages from AI agent
 */
function ChatHandler({
  setMessages,
}: {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  // Subscribe to data channel messages
  useDataChannel((message) => {
    try {
      const text = new TextDecoder().decode(message.payload);
      const sender = message.from?.identity || 'AI Assistant';

      setMessages((prev) => [
        ...prev,
        {
          sender,
          content: text,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Failed to decode message:', error);
    }
  });

  return null;
}

/**
 * Chat Panel Component
 * Displays AI agent messages in sidebar
 */
function ChatPanel({
  messages,
  onClose,
}: {
  messages: ChatMessage[];
  onClose: () => void;
}) {
  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Assistant Chat</h2>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300"
          aria-label="Close chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-2">AI assistant messages will appear here</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  {message.sender}
                </span>
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Voice responses are preferred. Text messages appear here as fallback.
        </p>
      </div>
    </div>
  );
}
