/**
 * Room Page
 * Live meeting interface with video grid, controls, AI chat
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Input } from '@platform/ui';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [displayName] = useState(sessionStorage.getItem('displayName') || 'Guest');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; timestamp: Date }>>([]);

  useEffect(() => {
    // Check if user came from lobby
    if (!sessionStorage.getItem('displayName')) {
      navigate('/');
    }
  }, [navigate]);

  const handleLeaveRoom = () => {
    sessionStorage.removeItem('displayName');
    navigate('/');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: displayName,
      text: chatMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setChatMessage('');

    // TODO: Send message via WebSocket in Phase 5
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Meeting Room</h1>
            <p className="text-sm text-muted-foreground">Room ID: {roomId}</p>
          </div>
          <Badge variant="secondary">1 Participant</Badge>
        </div>

        <Button variant="destructive" onClick={handleLeaveRoom}>
          Leave Meeting
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <div className="video-grid video-grid-1 h-full">
            {/* Participant Video */}
            <Card className="relative overflow-hidden">
              <div className="flex h-full items-center justify-center bg-muted">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-4xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Participant Name Overlay */}
              <div className="absolute bottom-4 left-4">
                <Badge variant="secondary">{displayName} (You)</Badge>
              </div>

              {/* Muted Indicator */}
              {isMuted && (
                <div className="absolute bottom-4 right-4">
                  <div className="rounded-full bg-destructive p-2">
                    <svg className="h-5 w-5 text-destructive-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-l border-border bg-card">
            <Card className="flex h-full flex-col rounded-none border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Chat & AI Assistant</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                {/* Messages */}
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center">
                      <div className="text-muted-foreground">
                        <svg className="mx-auto mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">Start a conversation or ask the AI assistant</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-sm font-semibold">{msg.sender}</span>
                          <span className="text-xs text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="border-t border-border p-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message or ask AI..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                    />
                    <Button type="submit" size="icon">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center space-x-4 border-t border-border bg-card px-6 py-4">
        {/* Microphone */}
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="h-12 w-12"
        >
          {isMuted ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </Button>

        {/* Camera */}
        <Button
          variant={isVideoOff ? 'destructive' : 'secondary'}
          size="icon"
          onClick={() => setIsVideoOff(!isVideoOff)}
          className="h-12 w-12"
        >
          {isVideoOff ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </Button>

        {/* Screen Share */}
        <Button
          variant={isScreenSharing ? 'default' : 'secondary'}
          size="icon"
          onClick={() => setIsScreenSharing(!isScreenSharing)}
          className="h-12 w-12"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </Button>

        {/* Chat Toggle */}
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowChat(!showChat)}
          className="h-12 w-12"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
