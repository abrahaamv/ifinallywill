/**
 * Lobby Page
 * Pre-meeting setup: room selection, device testing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Label } from '@platform/ui';
import { trpc } from '../utils/trpc';

export function LobbyPage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create room mutation
  const createRoom = trpc.livekit.createRoom.useMutation();

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !displayName) return;

    // Store display name in session storage
    sessionStorage.setItem('displayName', displayName);

    // Navigate to room
    navigate(`/room/${roomId}`);
  };

  const handleCreateRoom = async () => {
    setError(null);

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setIsCreating(true);

    try {
      // Generate room ID
      const newRoomId = `room-${Date.now()}`;

      // Create room via tRPC
      await createRoom.mutateAsync({
        roomName: newRoomId,
        metadata: {
          createdBy: displayName.trim(),
        },
      });

      // Store display name in session storage
      sessionStorage.setItem('displayName', displayName.trim());

      // Navigate to room
      navigate(`/room/${newRoomId}`);
    } catch (err) {
      console.error('Failed to create room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
              <CardDescription>
                Enter a room ID to join an existing meeting
              </CardDescription>
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

          {/* Create New Room */}
          <Card>
            <CardHeader>
              <CardTitle>Create Meeting</CardTitle>
              <CardDescription>
                Start a new meeting room with AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newDisplayName">Display Name</Label>
                <Input
                  id="newDisplayName"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold">Features Included:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center">
                    <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    HD video and audio
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Screen sharing
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Real-time AI chat
                  </li>
                  <li className="flex items-center">
                    <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Meeting transcription
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex-col space-y-4">
              {error && (
                <div className="w-full rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <Button
                type="button"
                className="w-full"
                onClick={handleCreateRoom}
                disabled={!displayName || isCreating}
              >
                {isCreating ? 'Creating Room...' : 'Create New Room'}
              </Button>
            </CardFooter>
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
                <h4 className="mb-2 font-semibold">1. Join or Create</h4>
                <p className="text-sm text-muted-foreground">
                  Enter a room ID to join an existing meeting, or create a new room.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">2. Allow Permissions</h4>
                <p className="text-sm text-muted-foreground">
                  Grant camera and microphone access when prompted by your browser.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">3. Start Meeting</h4>
                <p className="text-sm text-muted-foreground">
                  Collaborate with AI assistance for real-time insights and support.
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
