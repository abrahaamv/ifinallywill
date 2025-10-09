/**
 * Rooms Page
 * Create and manage LiveKit meeting rooms
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@platform/ui';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

interface RoomDetails {
  roomName: string;
  roomSid: string;
  numParticipants: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export function RoomsPage() {
  const [roomName, setRoomName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  // tRPC queries and mutations
  const { data: roomsData, refetch: refetchRooms } = trpc.livekit.listRooms.useQuery();
  const createRoomMutation = trpc.livekit.createRoom.useMutation();
  const deleteRoomMutation = trpc.livekit.deleteRoom.useMutation();

  const rooms = roomsData?.rooms || [];

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    try {
      await createRoomMutation.mutateAsync({
        roomName: roomName.trim(),
      });

      setRoomName('');
      await refetchRooms();
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleDeleteRoom = async (roomName: string) => {
    if (!confirm(`Are you sure you want to delete room "${roomName}"?`)) {
      return;
    }

    try {
      await deleteRoomMutation.mutateAsync({ roomName });
      await refetchRooms();
      setIsDetailsOpen(false);
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  const handleShowDetails = (room: RoomDetails) => {
    setSelectedRoom(room);
    setIsDetailsOpen(true);
  };

  const getShareableLink = (roomName: string) => {
    return `https://meet.platform.com/room/${roomName}`;
  };

  const handleCopyLink = async (roomName: string) => {
    try {
      await navigator.clipboard.writeText(getShareableLink(roomName));
      setCopiedRoomId(roomName);
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meeting Rooms</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage LiveKit meeting rooms for your organization
        </p>
      </div>

      {/* Create Room Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Room</CardTitle>
          <CardDescription>
            Create a new meeting room and share the link with participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRoom} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                placeholder="e.g., team-standup, client-demo"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={createRoomMutation.isPending || !roomName.trim()}>
              {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
            </Button>
          </form>
          {createRoomMutation.error && (
            <p className="text-sm text-red-600 mt-2">{createRoomMutation.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Active Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Rooms ({rooms.length})</CardTitle>
          <CardDescription>Manage your organization's meeting rooms</CardDescription>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No active rooms</p>
              <p className="text-sm mt-2">Create a room to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Room Name</th>
                    <th className="text-left py-3 px-4 font-medium">Room ID</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-left py-3 px-4 font-medium">Participants</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr
                      key={room.roomSid}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{room.roomName}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                        {room.roomSid.substring(0, 12)}...
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(room.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                          {room.numParticipants} active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(room.roomName || '')}
                        >
                          {copiedRoomId === room.roomName ? 'Copied!' : 'Copy Link'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShowDetails(room)}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Details</DialogTitle>
            <DialogDescription>View and manage room information</DialogDescription>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Room Name</Label>
                <p className="mt-1 text-sm">{selectedRoom.roomName}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Room ID</Label>
                <p className="mt-1 text-sm font-mono text-muted-foreground">
                  {selectedRoom.roomSid}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Created</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(selectedRoom.createdAt)}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Participants</Label>
                <p className="mt-1 text-sm">
                  {selectedRoom.numParticipants} active participant
                  {selectedRoom.numParticipants !== 1 ? 's' : ''}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Shareable Link</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    readOnly
                    value={getShareableLink(selectedRoom.roomName || '')}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(selectedRoom.roomName || '')}
                  >
                    {copiedRoomId === selectedRoom.roomName ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this link with participants to join the meeting
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRoom && handleDeleteRoom(selectedRoom.roomName || '')}
              disabled={deleteRoomMutation.isPending}
            >
              {deleteRoomMutation.isPending ? 'Deleting...' : 'Delete Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
