/**
 * LiveKit Service Layer (Phase 5 - Week 2)
 *
 * Service layer for LiveKit SDK integration with:
 * - Room management (create, delete, list)
 * - Access token generation with custom claims
 * - Webhook handling for agent events
 * - Error handling and logging
 */

import { createModuleLogger } from '@platform/shared';
import { AccessToken, type Room, RoomServiceClient } from 'livekit-server-sdk';

const logger = createModuleLogger('livekit-service');

/**
 * LiveKit configuration
 */
export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Room creation options
 */
export interface CreateRoomOptions {
  roomName: string;
  tenantId: string;
  maxParticipants?: number;
  emptyTimeout?: number; // Seconds before room closes when empty
  metadata?: Record<string, unknown>;
}

/**
 * Token generation options
 */
export interface TokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}

/**
 * Room information
 */
export interface RoomInfo {
  roomName: string;
  fullRoomName: string;
  roomSid: string;
  numParticipants: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * LiveKit service class
 */
export class LiveKitService {
  private client: RoomServiceClient;
  private config: LiveKitConfig;

  constructor(config: LiveKitConfig) {
    this.config = config;
    this.client = new RoomServiceClient(config.url, config.apiKey, config.apiSecret);
  }

  /**
   * Create new LiveKit room with tenant isolation
   *
   * Room naming convention: tenant_{tenantId}_{roomName}
   * This ensures tenant isolation at the LiveKit level
   */
  async createRoom(options: CreateRoomOptions): Promise<RoomInfo> {
    const fullRoomName = `tenant_${options.tenantId}_${options.roomName}`;

    const room = await this.client.createRoom({
      name: fullRoomName,
      emptyTimeout: options.emptyTimeout || 300, // 5 minutes default
      maxParticipants: options.maxParticipants || 10,
      metadata: JSON.stringify({
        tenantId: options.tenantId,
        ...options.metadata,
      }),
    });

    return this.mapRoomToInfo(room, options.tenantId);
  }

  /**
   * Generate access token for room participant
   *
   * Tokens contain custom claims for tenant and user identification
   * These claims are accessible in the LiveKit agent via metadata
   */
  async generateToken(options: TokenOptions): Promise<string> {
    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity: options.participantIdentity,
      name: options.participantName,
      // Store tenant/user metadata in token claims
      metadata: JSON.stringify({
        tenantId: options.tenantId,
        userId: options.userId,
        ...options.metadata,
      }),
    });

    // Grant room permissions
    token.addGrant({
      room: options.roomName,
      roomJoin: true,
      canPublish: options.canPublish !== undefined ? options.canPublish : true,
      canSubscribe: options.canSubscribe !== undefined ? options.canSubscribe : true,
      canPublishData: options.canPublishData !== undefined ? options.canPublishData : true,
    });

    return token.toJwt();
  }

  /**
   * List all active rooms (optionally filtered by tenant)
   */
  async listRooms(tenantId?: string): Promise<RoomInfo[]> {
    const rooms = await this.client.listRooms();

    // Filter by tenant if specified
    const filtered = tenantId
      ? rooms.filter((room) => room.name?.startsWith(`tenant_${tenantId}_`))
      : rooms;

    return filtered.map((room) => this.mapRoomToInfo(room, tenantId));
  }

  /**
   * Get room information by name
   */
  async getRoom(fullRoomName: string, tenantId?: string): Promise<RoomInfo | null> {
    try {
      const rooms = await this.client.listRooms([fullRoomName]);

      if (rooms.length === 0) {
        return null;
      }

      const room = rooms[0];
      if (!room) {
        return null;
      }

      return this.mapRoomToInfo(room, tenantId);
    } catch (error) {
      logger.error('Failed to get room', { error, fullRoomName });
      return null;
    }
  }

  /**
   * Delete room by name
   *
   * Accepts either full room name (tenant_{tenantId}_{roomName})
   * or short name with tenant ID provided
   */
  async deleteRoom(roomName: string, tenantId?: string): Promise<void> {
    const fullRoomName = roomName.startsWith('tenant_')
      ? roomName
      : `tenant_${tenantId}_${roomName}`;

    await this.client.deleteRoom(fullRoomName);
  }

  /**
   * Update room metadata
   */
  async updateRoomMetadata(fullRoomName: string, metadata: Record<string, unknown>): Promise<void> {
    await this.client.updateRoomMetadata(fullRoomName, JSON.stringify(metadata));
  }

  /**
   * Get room participants
   */
  async listParticipants(fullRoomName: string) {
    return this.client.listParticipants(fullRoomName);
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(fullRoomName: string, participantIdentity: string): Promise<void> {
    await this.client.removeParticipant(fullRoomName, participantIdentity);
  }

  /**
   * Mute participant's track
   */
  async mutePublishedTrack(
    fullRoomName: string,
    participantIdentity: string,
    trackSid: string,
    muted: boolean
  ): Promise<void> {
    await this.client.mutePublishedTrack(fullRoomName, participantIdentity, trackSid, muted);
  }

  /**
   * Convert LiveKit Room to RoomInfo
   */
  private mapRoomToInfo(room: Room, tenantId?: string): RoomInfo {
    const fullRoomName = room.name || '';

    // Extract display name (remove tenant prefix)
    let displayName = fullRoomName;
    if (tenantId && fullRoomName.startsWith(`tenant_${tenantId}_`)) {
      displayName = fullRoomName.replace(`tenant_${tenantId}_`, '');
    }

    return {
      roomName: displayName,
      fullRoomName,
      roomSid: room.sid,
      numParticipants: room.numParticipants,
      createdAt: Number(room.creationTime), // Convert BigInt to number
      metadata: room.metadata ? JSON.parse(room.metadata) : undefined,
    };
  }
}

/**
 * Factory function to create LiveKitService from environment
 */
export function createLiveKitService(): LiveKitService | null {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    logger.warn(
      'LiveKit not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET environment variables.'
    );
    return null;
  }

  return new LiveKitService({ url, apiKey, apiSecret });
}

/**
 * Singleton instance (lazy-loaded)
 */
let livekitServiceInstance: LiveKitService | null | undefined;

/**
 * Get singleton LiveKitService instance
 */
export function getLiveKitService(): LiveKitService | null {
  if (livekitServiceInstance === undefined) {
    livekitServiceInstance = createLiveKitService();
  }
  return livekitServiceInstance;
}
