import { TRPCError } from '@trpc/server';
/**
 * LiveKit Service (Phase 5 - Week 2)
 * Room management and access token generation
 */
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
/**
 * LiveKit configuration from environment
 */
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn(
    'LiveKit environment variables not configured. LiveKit features will be unavailable.'
  );
}
/**
 * RoomServiceClient for managing rooms
 */
const roomClient =
  LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
    ? new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    : null;
/**
 * Generate access token for room participant
 *
 * @param roomName - Room identifier (include tenant prefix for isolation)
 * @param participantName - User display name
 * @param participantMetadata - Optional metadata (e.g., user ID, role)
 * @returns JWT access token
 */
export async function generateAccessToken(roomName, participantName, participantMetadata) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'LiveKit not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.',
    });
  }
  try {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
      name: participantName,
      metadata: participantMetadata ? JSON.stringify(participantMetadata) : undefined,
    });
    // Grant full room permissions (adjust for production)
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return await token.toJwt();
  } catch (error) {
    console.error('Failed to generate access token:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to generate LiveKit access token',
      cause: error,
    });
  }
}
/**
 * Create LiveKit room
 *
 * @param roomName - Room identifier (must be unique)
 * @param tenantId - Tenant ID for isolation
 * @param metadata - Optional room metadata
 */
export async function createRoom(roomName, tenantId, metadata) {
  if (!roomClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'LiveKit not configured',
    });
  }
  try {
    // Encode tenant in room name for isolation
    const fullRoomName = `tenant_${tenantId}_${roomName}`;
    const room = await roomClient.createRoom({
      name: fullRoomName,
      emptyTimeout: 300, // Close room after 5 minutes if empty
      maxParticipants: 10, // Adjust based on plan
      metadata: JSON.stringify({
        tenantId,
        ...metadata,
      }),
    });
    return {
      roomName: room.name,
      sid: room.sid,
      createdAt: room.creationTime,
    };
  } catch (error) {
    console.error('Failed to create room:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create LiveKit room',
      cause: error,
    });
  }
}
/**
 * List active rooms for tenant
 *
 * @param tenantId - Tenant ID for filtering
 */
export async function listTenantRooms(tenantId) {
  if (!roomClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'LiveKit not configured',
    });
  }
  try {
    const rooms = await roomClient.listRooms();
    // Filter rooms by tenant prefix
    const tenantRooms = rooms.filter((room) => room.name?.startsWith(`tenant_${tenantId}_`));
    return tenantRooms.map((room) => ({
      roomName: room.name,
      sid: room.sid,
      numParticipants: room.numParticipants,
      createdAt: room.creationTime,
      metadata: room.metadata ? JSON.parse(room.metadata) : undefined,
    }));
  } catch (error) {
    console.error('Failed to list rooms:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to list LiveKit rooms',
      cause: error,
    });
  }
}
/**
 * Delete room
 *
 * @param roomName - Full room name (including tenant prefix)
 */
export async function deleteRoom(roomName) {
  if (!roomClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'LiveKit not configured',
    });
  }
  try {
    await roomClient.deleteRoom(roomName);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete room:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete LiveKit room',
      cause: error,
    });
  }
}
//# sourceMappingURL=livekit.js.map
