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
  useRoomContext,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '@livekit/components-styles';
import { Button, Input } from '@platform/ui';
import { trpc } from '../utils/trpc';

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: Date;
  type: 'voice' | 'text'; // Track if from voice transcription or text input
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
    // Skip if already has token or is currently loading from a previous request
    if (token || joinRoom.isPending) {
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, listRooms.isLoading, listRooms.data]);

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

            {/* Chat Panel - Must be inside LiveKitRoom to access room context */}
            {isChatOpen && (
              <ChatPanel
                messages={messages}
                setMessages={setMessages}
                onClose={() => setIsChatOpen(false)}
              />
            )}

            {/* Control Bar */}
            <ControlBar />
          </LiveKitRoom>
        </div>
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
 * Listens for data messages from AI agent with JSON support and topic filtering
 */
function ChatHandler({
  setMessages,
}: {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  // Subscribe to data channel messages with topic filtering
  useDataChannel((message) => {
    try {
      // Filter by topic - only process agent.chat messages
      // @ts-ignore - topic property exists but not in types
      const messageTopic = message.topic || '';

      if (messageTopic !== 'agent.chat') {
        // Not an agent chat message, ignore
        console.debug('Ignoring message with topic:', messageTopic);
        return;
      }

      const text = new TextDecoder().decode(message.payload);

      // Try to parse as JSON first (new structured format)
      try {
        const data = JSON.parse(text);

        // Handle structured message format
        if (data.type === 'agent_message') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'AI Assistant',
              content: data.content,
              timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
              type: 'voice', // Agent messages are voice transcriptions
            },
          ]);
          console.log('Received agent message:', data.content.substring(0, 50) + '...');
        } else if (data.type === 'vision_insight') {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'AI Vision',
              content: data.content,
              timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
              type: 'voice',
            },
          ]);
        } else {
          console.warn('Unknown message type:', data.type);
        }
      } catch (jsonError) {
        // Not JSON, treat as plain text (backward compatibility)
        const sender = message.from?.identity || 'AI Assistant';
        setMessages((prev) => [
          ...prev,
          {
            sender,
            content: text,
            timestamp: new Date(),
            type: 'voice',
          },
        ]);
        console.log('Received plain text message (fallback)');
      }
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });

  return null;
}

/**
 * Chat Panel Component
 * Live transcription + text input for AI interaction
 */
function ChatPanel({
  messages,
  setMessages,
  onClose,
}: {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onClose: () => void;
}) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const room = useRoomContext();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const messageContent = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      // Add user message to transcript
      const userMessage: ChatMessage = {
        sender: 'You',
        content: messageContent,
        timestamp: new Date(),
        type: 'text',
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send message to room via data channel (AI agent will receive and respond with voice)
      const encoder = new TextEncoder();
      const data = encoder.encode(messageContent);
      await room.localParticipant.publishData(data, { reliable: true });

      setIsSending(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSending(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Transcript & Chat</h2>
          <p className="text-xs text-gray-400">Live conversation</p>
        </div>
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

      {/* Messages / Transcript */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Start talking or type a message below</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`space-y-1 ${
                message.sender === 'You' ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold">
                  {message.sender}
                  {message.type === 'voice' && ' 🎤'}
                </span>
                <span>{message.timestamp.toLocaleTimeString()}</span>
              </div>
              <div
                className={`inline-block max-w-[85%] rounded-lg p-3 ${
                  message.sender === 'You'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Text Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type a message to AI..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !inputText.trim()}>
              {isSending ? '...' : 'Send'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            AI will respond with voice. Your message appears in transcript.
          </p>
        </form>
      </div>
    </div>
  );
}
