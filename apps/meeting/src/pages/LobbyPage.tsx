/**
 * Lobby Page
 * Pre-meeting setup: room selection, device testing
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@platform/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LobbyPage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !displayName) return;

    // Store display name in session storage
    sessionStorage.setItem('displayName', displayName);

    // Navigate to room
    navigate(`/${roomId}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">AI Meeting Rooms</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Video conferencing with real-time AI assistance
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Join Existing Room */}
          <Card>
            <CardHeader>
              <CardTitle>Join Meeting</CardTitle>
              <CardDescription>Enter a room ID to join an existing meeting</CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinRoom}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roomId">Room ID</Label>
                  <Input
                    id="roomId"
                    placeholder="room-123456"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={!roomId || !displayName}>
                  Join Meeting
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="mb-2 font-semibold">1. Get Room Link</h4>
                <p className="text-sm text-muted-foreground">
                  Meeting hosts create rooms from the dashboard and share the room ID with you.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">2. Join Meeting</h4>
                <p className="text-sm text-muted-foreground">
                  Enter the room ID and your display name, then grant camera and microphone
                  permissions.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">3. Collaborate</h4>
                <p className="text-sm text-muted-foreground">
                  Enjoy HD video, screen sharing, real-time AI chat, and meeting transcription.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Powered by LiveKit WebRTC •{' '}
            <a href="http://localhost:5174" className="text-primary hover:underline">
              Dashboard
            </a>
            {' • '}
            <a href="http://localhost:5173" className="text-primary hover:underline">
              Home
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
