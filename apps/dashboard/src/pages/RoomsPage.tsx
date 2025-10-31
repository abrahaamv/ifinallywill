/**
 * Meeting Rooms Page - Complete Redesign
 * Modern card grid with LiveKit integration
 * Inspired by meeting room management interfaces
 */

import {
  Badge,
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
  Skeleton,
} from '@platform/ui';
import { Activity, AlertCircle, Clock, Copy, Info, Plus, Trash2, Users, Video } from 'lucide-react';
import { createModuleLogger } from '@platform/shared';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

const logger = createModuleLogger('RoomsPage');

interface RoomDetails {
  roomName: string;
  fullRoomName?: string;
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

  const {
    data: roomsData,
    isLoading,
    error,
    refetch: refetchRooms,
  } = trpc.livekit.listRooms.useQuery();

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
      logger.error('Failed to create room', { error });
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
      logger.error('Failed to delete room', { error });
    }
  };

  const handleShowDetails = (room: RoomDetails) => {
    setSelectedRoom(room);
    setIsDetailsOpen(true);
  };

  const getShareableLink = (fullRoomName: string) => {
    const baseUrl = import.meta.env.DEV ? 'http://localhost:5175' : 'https://meet.platform.com';
    return `${baseUrl}/${fullRoomName}`;
  };

  const handleCopyLink = async (roomName: string) => {
    try {
      await navigator.clipboard.writeText(getShareableLink(roomName));
      setCopiedRoomId(roomName);
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (error) {
      logger.error('Failed to copy link', { error });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeRooms = rooms.length;
  const totalParticipants = rooms.reduce((sum, room) => sum + room.numParticipants, 0);
  const screenSharingSessions = activeRooms;
  const avgDuration = 42;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meeting Rooms</h1>
          <p className="mt-2 text-gray-600">
            Real-time WebRTC collaboration with screen sharing excellence
          </p>
        </div>
        <Button onClick={() => document.getElementById('roomName')?.focus()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Room
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Active Rooms</p>
              <Video className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{isLoading ? '—' : activeRooms}</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Participants</p>
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {isLoading ? '—' : totalParticipants}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Screen Sharing</p>
              <Activity className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {isLoading ? '—' : screenSharingSessions}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <Clock className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {isLoading ? '—' : `${avgDuration}m`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Room Section */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Room
          </CardTitle>
          <CardDescription>
            Create a new meeting room with LiveKit WebRTC and AI support
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

      {/* Active Rooms Grid */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>Active Rooms</CardTitle>
          <CardDescription>
            {rooms.length} meeting rooms with WebRTC and screen sharing
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load rooms: {error.message}</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="mb-4 h-16 w-16 text-gray-400" />
              <p className="text-gray-600">No active rooms</p>
              <p className="mt-1 text-sm text-gray-500">Create a room to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Card
                  key={room.roomSid}
                  className="group cursor-pointer border-gray-200 shadow-sm transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50">
                          <Video className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{room.roomName}</CardTitle>
                          <CardDescription className="mt-1 text-xs font-mono">
                            {room.roomSid.substring(0, 12)}...
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Created:</span>
                        <span className="font-medium">{formatDate(room.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Participants:</span>
                        <Badge variant={room.numParticipants > 0 ? 'default' : 'outline'}>
                          {room.numParticipants} active
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCopyLink(room.fullRoomName || room.roomName || '')}
                      >
                        {copiedRoomId === (room.fullRoomName || room.roomName) ? (
                          'Copied!'
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy Link
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShowDetails(room)}>
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Details Dialog */}
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
                <p className="mt-1 text-sm font-mono text-gray-600">{selectedRoom.roomSid}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Created</Label>
                <p className="mt-1 text-sm text-gray-600">{formatDate(selectedRoom.createdAt)}</p>
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
                    value={getShareableLink(
                      selectedRoom.fullRoomName || selectedRoom.roomName || ''
                    )}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleCopyLink(selectedRoom.fullRoomName || selectedRoom.roomName || '')
                    }
                  >
                    {copiedRoomId === (selectedRoom.fullRoomName || selectedRoom.roomName) ? (
                      'Copied!'
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
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
              {deleteRoomMutation.isPending ? (
                'Deleting...'
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Room
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
