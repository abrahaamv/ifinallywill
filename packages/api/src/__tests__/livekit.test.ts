/**
 * LiveKit Service Tests
 * Validates room management and token generation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveKitService, createLiveKitService, getLiveKitService } from '../services/livekit';
import type { CreateRoomOptions, TokenOptions } from '../services/livekit';

// Mock livekit-server-sdk
vi.mock('livekit-server-sdk', () => ({
  AccessToken: vi.fn().mockImplementation(() => ({
    addGrant: vi.fn(),
    toJwt: vi.fn().mockReturnValue('mock-jwt-token'),
  })),
  RoomServiceClient: vi.fn().mockImplementation(() => ({
    createRoom: vi.fn(),
    listRooms: vi.fn(),
    deleteRoom: vi.fn(),
    updateRoomMetadata: vi.fn(),
    listParticipants: vi.fn(),
    removeParticipant: vi.fn(),
    mutePublishedTrack: vi.fn(),
  })),
}));

// Mock logger
vi.mock('@platform/shared', () => ({
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('LiveKitService', () => {
  let service: LiveKitService;
  let mockClient: any;

  beforeEach(() => {
    const { RoomServiceClient } = require('livekit-server-sdk');
    service = new LiveKitService({
      url: 'wss://test.livekit.cloud',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    });
    mockClient = RoomServiceClient.mock.results[RoomServiceClient.mock.results.length - 1].value;
    vi.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create room with tenant isolation', async () => {
      const mockRoom = {
        name: 'tenant_tenant-123_meeting-room',
        sid: 'RM_abc123',
        numParticipants: 0,
        creationTime: BigInt(Date.now()),
        metadata: JSON.stringify({ tenantId: 'tenant-123' }),
      };

      mockClient.createRoom.mockResolvedValue(mockRoom);

      const options: CreateRoomOptions = {
        roomName: 'meeting-room',
        tenantId: 'tenant-123',
        maxParticipants: 5,
      };

      const result = await service.createRoom(options);

      expect(mockClient.createRoom).toHaveBeenCalledWith({
        name: 'tenant_tenant-123_meeting-room',
        emptyTimeout: 300,
        maxParticipants: 5,
        metadata: JSON.stringify({
          tenantId: 'tenant-123',
        }),
      });

      expect(result.fullRoomName).toBe('tenant_tenant-123_meeting-room');
      expect(result.roomName).toBe('meeting-room');
      expect(result.roomSid).toBe('RM_abc123');
    });

    it('should use default empty timeout and max participants', async () => {
      const mockRoom = {
        name: 'tenant_tenant-123_test',
        sid: 'RM_def456',
        numParticipants: 0,
        creationTime: BigInt(Date.now()),
        metadata: '{}',
      };

      mockClient.createRoom.mockResolvedValue(mockRoom);

      const options: CreateRoomOptions = {
        roomName: 'test',
        tenantId: 'tenant-123',
      };

      await service.createRoom(options);

      expect(mockClient.createRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          emptyTimeout: 300,
          maxParticipants: 10,
        })
      );
    });

    it('should include custom metadata', async () => {
      const mockRoom = {
        name: 'tenant_tenant-123_custom',
        sid: 'RM_ghi789',
        numParticipants: 0,
        creationTime: BigInt(Date.now()),
        metadata: JSON.stringify({
          tenantId: 'tenant-123',
          sessionId: 'session-xyz',
        }),
      };

      mockClient.createRoom.mockResolvedValue(mockRoom);

      const options: CreateRoomOptions = {
        roomName: 'custom',
        tenantId: 'tenant-123',
        metadata: {
          sessionId: 'session-xyz',
        },
      };

      await service.createRoom(options);

      expect(mockClient.createRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: JSON.stringify({
            tenantId: 'tenant-123',
            sessionId: 'session-xyz',
          }),
        })
      );
    });
  });

  describe('generateToken', () => {
    it('should generate access token with permissions', async () => {
      const { AccessToken } = require('livekit-server-sdk');
      const mockToken = {
        addGrant: vi.fn(),
        toJwt: vi.fn().mockReturnValue('generated-token'),
      };

      AccessToken.mockImplementation(() => mockToken);

      const options: TokenOptions = {
        roomName: 'tenant_tenant-123_room',
        participantIdentity: 'user-456',
        participantName: 'John Doe',
        tenantId: 'tenant-123',
        userId: 'user-456',
      };

      const token = await service.generateToken(options);

      expect(AccessToken).toHaveBeenCalledWith('test-api-key', 'test-api-secret', {
        identity: 'user-456',
        name: 'John Doe',
        metadata: JSON.stringify({
          tenantId: 'tenant-123',
          userId: 'user-456',
        }),
      });

      expect(mockToken.addGrant).toHaveBeenCalledWith({
        room: 'tenant_tenant-123_room',
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      expect(token).toBe('generated-token');
    });

    it('should respect custom permission flags', async () => {
      const { AccessToken } = require('livekit-server-sdk');
      const mockToken = {
        addGrant: vi.fn(),
        toJwt: vi.fn().mockReturnValue('token'),
      };

      AccessToken.mockImplementation(() => mockToken);

      const options: TokenOptions = {
        roomName: 'room',
        participantIdentity: 'observer',
        participantName: 'Observer',
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
      };

      await service.generateToken(options);

      expect(mockToken.addGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          canPublish: false,
          canSubscribe: true,
          canPublishData: false,
        })
      );
    });

    it('should include custom metadata in token', async () => {
      const { AccessToken } = require('livekit-server-sdk');
      const mockToken = {
        addGrant: vi.fn(),
        toJwt: vi.fn().mockReturnValue('token'),
      };

      AccessToken.mockImplementation(() => mockToken);

      const options: TokenOptions = {
        roomName: 'room',
        participantIdentity: 'user',
        participantName: 'User',
        metadata: {
          role: 'moderator',
          sessionId: 'abc',
        },
      };

      await service.generateToken(options);

      expect(AccessToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          metadata: JSON.stringify({
            role: 'moderator',
            sessionId: 'abc',
          }),
        })
      );
    });
  });

  describe('listRooms', () => {
    it('should list all rooms when no tenant filter', async () => {
      const mockRooms = [
        {
          name: 'tenant_tenant-123_room1',
          sid: 'RM_1',
          numParticipants: 2,
          creationTime: BigInt(Date.now()),
          metadata: '{}',
        },
        {
          name: 'tenant_tenant-456_room2',
          sid: 'RM_2',
          numParticipants: 1,
          creationTime: BigInt(Date.now()),
          metadata: '{}',
        },
      ];

      mockClient.listRooms.mockResolvedValue(mockRooms);

      const result = await service.listRooms();

      expect(result).toHaveLength(2);
      expect(result[0]?.roomName).toBe('tenant_tenant-123_room1');
      expect(result[1]?.roomName).toBe('tenant_tenant-456_room2');
    });

    it('should filter rooms by tenant ID', async () => {
      const mockRooms = [
        {
          name: 'tenant_tenant-123_room1',
          sid: 'RM_1',
          numParticipants: 2,
          creationTime: BigInt(Date.now()),
          metadata: '{}',
        },
        {
          name: 'tenant_tenant-456_room2',
          sid: 'RM_2',
          numParticipants: 1,
          creationTime: BigInt(Date.now()),
          metadata: '{}',
        },
      ];

      mockClient.listRooms.mockResolvedValue(mockRooms);

      const result = await service.listRooms('tenant-123');

      expect(result).toHaveLength(1);
      expect(result[0]?.fullRoomName).toBe('tenant_tenant-123_room1');
      expect(result[0]?.roomName).toBe('room1');
    });

    it('should parse room metadata', async () => {
      const mockRooms = [
        {
          name: 'tenant_tenant-123_room',
          sid: 'RM_1',
          numParticipants: 0,
          creationTime: BigInt(Date.now()),
          metadata: JSON.stringify({ sessionId: 'session-xyz' }),
        },
      ];

      mockClient.listRooms.mockResolvedValue(mockRooms);

      const result = await service.listRooms('tenant-123');

      expect(result[0]?.metadata).toEqual({ sessionId: 'session-xyz' });
    });
  });

  describe('getRoom', () => {
    it('should get room by full name', async () => {
      const mockRooms = [
        {
          name: 'tenant_tenant-123_room',
          sid: 'RM_abc',
          numParticipants: 3,
          creationTime: BigInt(Date.now()),
          metadata: '{}',
        },
      ];

      mockClient.listRooms.mockResolvedValue(mockRooms);

      const result = await service.getRoom('tenant_tenant-123_room', 'tenant-123');

      expect(mockClient.listRooms).toHaveBeenCalledWith(['tenant_tenant-123_room']);
      expect(result).not.toBeNull();
      expect(result?.roomName).toBe('room');
      expect(result?.fullRoomName).toBe('tenant_tenant-123_room');
    });

    it('should return null when room not found', async () => {
      mockClient.listRooms.mockResolvedValue([]);

      const result = await service.getRoom('nonexistent-room');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockClient.listRooms.mockRejectedValue(new Error('Network error'));

      const result = await service.getRoom('room');

      expect(result).toBeNull();
    });
  });

  describe('deleteRoom', () => {
    it('should delete room by full name', async () => {
      mockClient.deleteRoom.mockResolvedValue(undefined);

      await service.deleteRoom('tenant_tenant-123_room');

      expect(mockClient.deleteRoom).toHaveBeenCalledWith('tenant_tenant-123_room');
    });

    it('should build full name from short name and tenant ID', async () => {
      mockClient.deleteRoom.mockResolvedValue(undefined);

      await service.deleteRoom('room', 'tenant-123');

      expect(mockClient.deleteRoom).toHaveBeenCalledWith('tenant_tenant-123_room');
    });
  });

  describe('updateRoomMetadata', () => {
    it('should update room metadata', async () => {
      mockClient.updateRoomMetadata.mockResolvedValue(undefined);

      const metadata = {
        status: 'active',
        participants: 5,
      };

      await service.updateRoomMetadata('tenant_tenant-123_room', metadata);

      expect(mockClient.updateRoomMetadata).toHaveBeenCalledWith(
        'tenant_tenant-123_room',
        JSON.stringify(metadata)
      );
    });
  });

  describe('listParticipants', () => {
    it('should list participants in room', async () => {
      const mockParticipants = [
        { identity: 'user-1', name: 'User 1' },
        { identity: 'user-2', name: 'User 2' },
      ];

      mockClient.listParticipants.mockResolvedValue(mockParticipants);

      const result = await service.listParticipants('tenant_tenant-123_room');

      expect(mockClient.listParticipants).toHaveBeenCalledWith('tenant_tenant-123_room');
      expect(result).toEqual(mockParticipants);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from room', async () => {
      mockClient.removeParticipant.mockResolvedValue(undefined);

      await service.removeParticipant('tenant_tenant-123_room', 'user-456');

      expect(mockClient.removeParticipant).toHaveBeenCalledWith(
        'tenant_tenant-123_room',
        'user-456'
      );
    });
  });

  describe('mutePublishedTrack', () => {
    it('should mute participant track', async () => {
      mockClient.mutePublishedTrack.mockResolvedValue(undefined);

      await service.mutePublishedTrack('room', 'user-123', 'TR_audio', true);

      expect(mockClient.mutePublishedTrack).toHaveBeenCalledWith(
        'room',
        'user-123',
        'TR_audio',
        true
      );
    });

    it('should unmute participant track', async () => {
      mockClient.mutePublishedTrack.mockResolvedValue(undefined);

      await service.mutePublishedTrack('room', 'user-123', 'TR_audio', false);

      expect(mockClient.mutePublishedTrack).toHaveBeenCalledWith(
        'room',
        'user-123',
        'TR_audio',
        false
      );
    });
  });

  describe('Factory functions', () => {
    it('createLiveKitService should create service from environment', () => {
      const originalEnv = { ...process.env };
      process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';
      process.env.LIVEKIT_API_KEY = 'key';
      process.env.LIVEKIT_API_SECRET = 'secret';

      const service = createLiveKitService();

      expect(service).not.toBeNull();
      expect(service).toBeInstanceOf(LiveKitService);

      process.env = originalEnv;
    });

    it('createLiveKitService should return null when not configured', () => {
      const originalEnv = { ...process.env };
      delete process.env.LIVEKIT_URL;
      delete process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_SECRET;

      const service = createLiveKitService();

      expect(service).toBeNull();

      process.env = originalEnv;
    });

    it('getLiveKitService should return singleton instance', () => {
      const originalEnv = { ...process.env };
      process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';
      process.env.LIVEKIT_API_KEY = 'key';
      process.env.LIVEKIT_API_SECRET = 'secret';

      const service1 = getLiveKitService();
      const service2 = getLiveKitService();

      expect(service1).toBe(service2);

      process.env = originalEnv;
    });
  });
});
