/**
 * LiveKit Router (Phase 5 - Week 2)
 * Room management and access token generation endpoints
 */

import { internalError } from '@platform/shared';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/**
 * LiveKit configuration from environment
 */
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

/**
 * RoomServiceClient for managing rooms
 */
const roomClient =
  LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
    ? new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    : null;

/**
 * Input validation schemas
 */
const createRoomSchema = z.object({
  roomName: z.string().min(1, 'Room name required').max(100, 'Room name too long'),
  metadata: z.record(z.unknown()).optional(),
});

const joinRoomSchema = z.object({
  roomName: z.string().min(1, 'Room name required'),
  participantName: z.string().min(1, 'Participant name required').max(100, 'Name too long'),
});

const deleteRoomSchema = z.object({
  roomName: z.string().min(1, 'Room name required'),
});

/**
 * LiveKit router
 */
export const livekitRouter = router({
  /**
   * Create new LiveKit room
   */
  createRoom: protectedProcedure.input(createRoomSchema).mutation(async ({ ctx, input }) => {
    if (!roomClient) {
      throw internalError({
        message:
          'LiveKit not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET environment variables.',
      });
    }

    try {
      // Encode tenant in room name for isolation
      const fullRoomName = `tenant_${ctx.tenantId}_${input.roomName}`;

      const room = await roomClient.createRoom({
        name: fullRoomName,
        emptyTimeout: 300, // Close room after 5 minutes if empty
        maxParticipants: 10, // Adjust based on plan
        metadata: JSON.stringify({
          tenantId: ctx.tenantId,
          ...input.metadata,
        }),
      });

      return {
        roomName: room.name,
        roomSid: room.sid,
        createdAt: Number(room.creationTime), // Convert BigInt to number for JSON serialization
      };
    } catch (error) {
      throw internalError({
        message: 'Failed to create room',
        // Don't pass error object directly - it may contain BigInt values
        cause: error instanceof Error ? { message: error.message } : undefined,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Generate access token to join room (PUBLIC - no authentication required)
   * Room name already contains tenant prefix from creation
   */
  joinRoom: publicProcedure.input(joinRoomSchema).mutation(async ({ input }) => {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw internalError({
        message:
          'LiveKit not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.',
      });
    }

    try {
      // Room name already has tenant prefix (tenant_{tenantId}_{roomName})
      // No need to add prefix again - just use the provided room name
      const fullRoomName = input.roomName;

      // Generate access token for anonymous participant
      const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: input.participantName,
        name: input.participantName,
        // No tenant/user metadata for anonymous participants
        metadata: JSON.stringify({
          anonymous: true,
        }),
      });

      // Grant full room permissions
      token.addGrant({
        room: fullRoomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return {
        token: await token.toJwt(),
        roomName: fullRoomName,
        livekitUrl: LIVEKIT_URL || '',
      };
    } catch (error) {
      throw internalError({
        message: 'Failed to join room',
        // Don't pass error object directly - it may contain BigInt values
        cause: error instanceof Error ? { message: error.message } : undefined,
        logLevel: 'error',
      });
    }
  }),

  /**
   * List active rooms for tenant
   */
  listRooms: protectedProcedure.query(async ({ ctx }) => {
    if (!roomClient) {
      throw internalError({
        message: 'LiveKit not configured',
      });
    }

    try {
      const rooms = await roomClient.listRooms();

      // Filter rooms by tenant prefix
      const tenantRooms = rooms.filter((room) => room.name?.startsWith(`tenant_${ctx.tenantId}_`));

      return {
        rooms: tenantRooms.map((room) => ({
          roomName: room.name?.replace(`tenant_${ctx.tenantId}_`, ''), // Display name (no prefix)
          fullRoomName: room.name, // Full name with tenant prefix (for joining)
          roomSid: room.sid,
          numParticipants: room.numParticipants,
          createdAt: Number(room.creationTime), // Convert BigInt to number for JSON serialization
          metadata: room.metadata ? JSON.parse(room.metadata) : undefined,
        })),
      };
    } catch (error) {
      throw internalError({
        message: 'Failed to list rooms',
        // Don't pass error object directly - it may contain BigInt values
        cause: error instanceof Error ? { message: error.message } : undefined,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Delete room
   */
  deleteRoom: protectedProcedure.input(deleteRoomSchema).mutation(async ({ ctx, input }) => {
    if (!roomClient) {
      throw internalError({
        message: 'LiveKit not configured',
      });
    }

    try {
      // Construct full room name with tenant prefix
      const fullRoomName = `tenant_${ctx.tenantId}_${input.roomName}`;

      await roomClient.deleteRoom(fullRoomName);

      return { success: true };
    } catch (error) {
      throw internalError({
        message: 'Failed to delete room',
        // Don't pass error object directly - it may contain BigInt values
        cause: error instanceof Error ? { message: error.message } : undefined,
        logLevel: 'error',
      });
    }
  }),
});
