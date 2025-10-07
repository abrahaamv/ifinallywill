# Phase 5 Week 2 Readiness - LiveKit Integration & Real-Time AI Chat

**Phase Duration**: January 13-17, 2025 (5 days)
**Prerequisites**: Phase 5 Week 1 complete (RAG system implemented)
**Critical Dependencies**: LiveKit Cloud credentials, Python 3.11+, Backend API running

---

## 1. Phase Completion Summary (Phase 5 Week 1)

### ✅ Achievements Delivered

**RAG System Foundation (100% Complete)**:
- ✅ Hybrid retrieval architecture (semantic 70% + keyword 30%)
- ✅ Knowledge package with type-safe interfaces
- ✅ Chat router RAG integration with metadata tracking
- ✅ Dashboard UI displaying RAG metrics (chunks, processing time, relevance)
- ✅ Mock data workflow validated end-to-end
- ✅ All builds passing, zero TypeScript errors
- ✅ Performance: <5ms RAG processing with mock data

**Quality Metrics**:
- Build success rate: 100%
- Type safety: 100% (strict mode)
- Test coverage: 0% (tests pending Phase 5 Week 3)
- Documentation: Comprehensive phase documentation created

**Known Limitations**:
- Database schema not yet implemented (Phase 2 pending)
- RAG uses mock data instead of real embeddings
- AI router integration pending (Phase 5 Week 2-3)

### 🎯 Readiness Status for Week 2

**Infrastructure**:
- ✅ Turborepo monorepo configured
- ✅ Development servers running (ports 5173-5176, 3001-3002)
- ✅ Type-safe tRPC API framework
- ❌ Database schema (Phase 2 pending)
- ❌ LiveKit credentials (must obtain before Week 2)

**Code Foundation**:
- ✅ Chat router with RAG integration
- ✅ Frontend chat UI with metadata display
- ✅ Knowledge package with RAG types
- ❌ LiveKit backend integration (Week 2 task)
- ❌ Python LiveKit agent (Week 2 task)

---

## 2. Phase Objectives (Week 2: LiveKit Integration)

### Primary Goals (All Must Complete)

**Goal 1: LiveKit Backend Integration** (Days 1-2)
- Set up LiveKit Cloud account and obtain credentials
- Create LiveKit room management service
- Implement room creation/joining with tenant isolation
- Add participant management and access tokens
- Test room lifecycle (create, join, leave, close)

**Goal 2: Frontend WebRTC Integration** (Days 2-3)
- Install and configure LiveKit React components
- Create meeting page with video/audio controls
- Implement screen sharing functionality
- Add participant list and UI state management
- Test multi-participant video calls

**Goal 3: Python LiveKit Agent Foundation** (Days 3-4)
- Set up Python virtual environment with LiveKit SDK
- Create base agent with room connection
- Implement 1 FPS screen capture for cost optimization
- Add basic voice transcription with Deepgram
- Test agent joining rooms and receiving media

**Goal 4: Backend-Agent Integration** (Day 5)
- Establish HTTP communication between backend and agent
- Pass tenant context and room metadata to agent
- Implement agent health checks and monitoring
- Test end-to-end flow: user joins → agent joins → media flows

### Success Criteria

**Week 2 Complete When**:
- ✅ User can create LiveKit room from dashboard
- ✅ User can join room with video/audio/screen sharing
- ✅ Python agent joins room automatically
- ✅ Agent receives 1 FPS screen capture frames
- ✅ Agent transcribes voice input (basic)
- ✅ Backend tracks room sessions and participants
- ✅ All TypeScript builds pass
- ✅ Python agent runs without errors

**Quality Gates**:
- Video call latency <300ms (measured in LiveKit dashboard)
- Agent join time <5 seconds after room creation
- Screen capture at exactly 1 FPS (validated with logs)
- Zero memory leaks in 30-minute test session
- Graceful handling of network disconnections

---

## 3. Pre-Phase Setup (CRITICAL - Do Before Coding)

### 3.1 LiveKit Cloud Account Setup

**Step 1: Create LiveKit Cloud Account**
```bash
# 1. Go to https://cloud.livekit.io/
# 2. Sign up for account
# 3. Create new project: "platform-dev"
# 4. Note project URL (e.g., wss://platform-dev-xxxxx.livekit.cloud)
```

**Step 2: Generate API Keys**
```bash
# In LiveKit Cloud Console:
# 1. Go to Settings → Keys
# 2. Create new API key pair
# 3. Copy API Key and API Secret (shown once only!)
# 4. Save securely - you'll need these for .env
```

**Budget Consideration** (from CLAUDE.md warning):
- Development: Build plan OK for testing ($0-99/month)
- **Production**: Enterprise plan required ($5K-10K+/month minimum)
  - 40-100 worker pool (4 cores + 8GB RAM each)
  - Cold starts unacceptable for production
  - Budget approval needed before production deployment

### 3.2 Environment Variables

**Add to Root `.env` File**:
```bash
# LiveKit Configuration (Phase 5 Week 2)
LIVEKIT_URL=wss://platform-dev-xxxxx.livekit.cloud
LIVEKIT_API_KEY=your_api_key_from_console
LIVEKIT_API_SECRET=your_api_secret_from_console

# Python Agent Configuration
AGENT_PORT=8080
AGENT_BASE_URL=http://localhost:8080

# Deepgram Configuration (for voice transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key

# Backend API URL (for agent to fetch context)
BACKEND_API_URL=http://localhost:3001
```

**Obtain Deepgram API Key**:
```bash
# 1. Go to https://deepgram.com/
# 2. Sign up for free account ($200 credit)
# 3. Create new API key in console
# 4. Copy key to .env
```

**Security Notes**:
- ⚠️ Never commit `.env` file (already in .gitignore)
- ⚠️ Use separate credentials for dev/staging/production
- ⚠️ Rotate API keys every 90 days minimum
- ⚠️ Store production secrets in vault (e.g., AWS Secrets Manager)

### 3.3 Python Environment Setup

**Install Python 3.11+ with pyenv** (Recommended):
```bash
# Install pyenv (if not installed)
curl https://pyenv.run | bash

# Install Python 3.11
pyenv install 3.11.0
pyenv local 3.11.0

# Verify version
python --version  # Should show 3.11.0 or higher
```

**Create Virtual Environment**:
```bash
cd livekit-agent

# Create venv
python -m venv venv

# Activate venv
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# Verify activation (should show venv path)
which python
```

**Install Core Dependencies**:
```bash
# Install LiveKit SDK
pip install livekit livekit-agents livekit-plugins-deepgram

# Install utilities
pip install python-dotenv httpx pydantic

# Install development tools
pip install pytest pytest-asyncio black ruff mypy

# Freeze dependencies
pip freeze > requirements.txt
```

### 3.4 TypeScript Package Dependencies

**Install LiveKit Frontend SDK**:
```bash
# In root directory
pnpm add @livekit/components-react @livekit/components-styles livekit-client --filter @platform/meeting

# Verify installation
pnpm list @livekit/components-react --filter @platform/meeting
```

**Install LiveKit Backend SDK**:
```bash
pnpm add livekit-server-sdk --filter @platform/api

# Verify installation
pnpm list livekit-server-sdk --filter @platform/api
```

### 3.5 Development Server Checklist

**Before Starting Week 2 Implementation**:
```bash
# ✅ Check all services running
pnpm dev  # Starts all apps (ports 5173-5176) + API (3001) + Realtime (3002)

# ✅ Verify PostgreSQL + Redis running (Phase 2 when implemented)
# pnpm db:up  # Currently not needed (no database schema yet)

# ✅ Check Python agent can start (after venv setup)
cd livekit-agent
source venv/bin/activate
python -c "import livekit; print('LiveKit SDK ready')"

# ✅ Verify environment variables loaded
node -e "console.log(process.env.LIVEKIT_URL)"  # Should show URL
python -c "import os; print(os.getenv('LIVEKIT_API_KEY'))"  # Should show key

# ✅ Test LiveKit credentials
curl -X POST "https://platform-dev-xxxxx.livekit.cloud/rtc/validate" \
  -H "Authorization: Bearer YOUR_API_KEY"
# Should return 200 OK (or specific validation response)
```

---

## 4. Implementation Guides (Code Templates)

### 4.1 LiveKit Service (Backend - Day 1)

**Create `packages/api/src/services/livekit.ts`**:
```typescript
/**
 * LiveKit Service (Phase 5 - Week 2)
 * Room management and access token generation
 */

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { TRPCError } from '@trpc/server';

/**
 * LiveKit configuration from environment
 */
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('LiveKit environment variables not configured');
}

/**
 * RoomServiceClient for managing rooms
 */
const roomClient = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

/**
 * Generate access token for room participant
 *
 * @param roomName - Room identifier (include tenant prefix for isolation)
 * @param participantName - User display name
 * @param participantMetadata - Optional metadata (e.g., user ID, role)
 * @returns JWT access token
 */
export async function generateAccessToken(
  roomName: string,
  participantName: string,
  participantMetadata?: Record<string, unknown>
): Promise<string> {
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
export async function createRoom(
  roomName: string,
  tenantId: string,
  metadata?: Record<string, unknown>
) {
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
export async function listTenantRooms(tenantId: string) {
  try {
    const rooms = await roomClient.listRooms();

    // Filter rooms by tenant prefix
    const tenantRooms = rooms.filter((room) =>
      room.name?.startsWith(`tenant_${tenantId}_`)
    );

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
export async function deleteRoom(roomName: string) {
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
```

**Key Implementation Notes**:
- **Tenant Isolation**: Room names prefixed with `tenant_${tenantId}_` to prevent cross-tenant access
- **Access Token**: JWT with room permissions (can be restricted by role in production)
- **Room Timeout**: Rooms auto-close after 5 minutes of being empty (configurable)
- **Metadata**: Store tenant context and custom data in room metadata

### 4.2 LiveKit tRPC Router (Backend - Day 1)

**Create `packages/api-contract/src/routers/livekit.ts`**:
```typescript
/**
 * LiveKit Router (Phase 5 - Week 2)
 * Room management and access token generation endpoints
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';
import {
  generateAccessToken,
  createRoom,
  listTenantRooms,
  deleteRoom,
} from '../../../api/src/services/livekit';

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
  createRoom: protectedProcedure
    .input(createRoomSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const room = await createRoom(
          input.roomName,
          ctx.tenantId,
          input.metadata
        );

        return {
          roomName: room.roomName,
          roomSid: room.sid,
          createdAt: room.createdAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error('Failed to create LiveKit room:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create room',
          cause: error,
        });
      }
    }),

  /**
   * Generate access token to join room
   */
  joinRoom: protectedProcedure
    .input(joinRoomSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Construct full room name with tenant prefix
        const fullRoomName = `tenant_${ctx.tenantId}_${input.roomName}`;

        // Generate access token
        const token = await generateAccessToken(
          fullRoomName,
          input.participantName,
          {
            userId: ctx.userId,
            tenantId: ctx.tenantId,
          }
        );

        return {
          token,
          roomName: fullRoomName,
          livekitUrl: process.env.LIVEKIT_URL || '',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error('Failed to generate access token:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to join room',
          cause: error,
        });
      }
    }),

  /**
   * List active rooms for tenant
   */
  listRooms: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const rooms = await listTenantRooms(ctx.tenantId);

        return {
          rooms: rooms.map((room) => ({
            roomName: room.roomName.replace(`tenant_${ctx.tenantId}_`, ''), // Remove prefix for display
            roomSid: room.sid,
            numParticipants: room.numParticipants,
            createdAt: room.createdAt,
            metadata: room.metadata,
          })),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error('Failed to list rooms:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list rooms',
          cause: error,
        });
      }
    }),

  /**
   * Delete room
   */
  deleteRoom: protectedProcedure
    .input(deleteRoomSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Construct full room name with tenant prefix
        const fullRoomName = `tenant_${ctx.tenantId}_${input.roomName}`;

        await deleteRoom(fullRoomName);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error('Failed to delete room:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete room',
          cause: error,
        });
      }
    }),
});
```

**Export from `packages/api-contract/src/router.ts`**:
```typescript
import { livekitRouter } from './routers/livekit';

export const appRouter = router({
  // ... existing routers
  livekit: livekitRouter,  // ADD THIS LINE
});
```

### 4.3 Meeting Page Frontend (Days 2-3)

**Create `apps/meeting/src/pages/MeetingRoom.tsx`**:
```typescript
/**
 * Meeting Room Page (Phase 5 - Week 2)
 * LiveKit video/audio/screen sharing interface
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { trpc } from '../utils/trpc';
import { Button } from '@platform/ui';
import { Loader2 } from 'lucide-react';

export function MeetingRoom() {
  const { roomName } = useParams<{ roomName: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join room mutation
  const joinRoom = trpc.livekit.joinRoom.useMutation();

  // Request access token on mount
  useEffect(() => {
    const requestToken = async () => {
      if (!roomName) {
        setError('Room name is required');
        setIsLoading(false);
        return;
      }

      try {
        const result = await joinRoom.mutateAsync({
          roomName,
          participantName: 'User', // TODO: Get from auth context
        });

        setToken(result.token);
        setLivekitUrl(result.livekitUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to join room:', err);
        setError('Failed to join meeting room');
        setIsLoading(false);
      }
    };

    requestToken();
  }, [roomName]);

  // Handle connection errors
  const handleError = (error: Error) => {
    console.error('LiveKit connection error:', error);
    setError('Connection failed. Please try again.');
  };

  // Handle leaving room
  const handleLeave = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Joining meeting...</span>
      </div>
    );
  }

  if (error || !token || !livekitUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">{error || 'Failed to load meeting'}</p>
        <Button onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold">Meeting: {roomName}</h1>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1">
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

          {/* Control Bar */}
          <ControlBar />
        </LiveKitRoom>
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
```

**Key Frontend Implementation Notes**:
- **LiveKitRoom**: Main container handling connection and state
- **GridLayout**: Automatic responsive grid for video tiles
- **useTracks**: Subscribe to camera and screen share tracks
- **ControlBar**: Pre-built controls (mic, camera, screen share, leave)
- **RoomAudioRenderer**: Plays audio from all participants
- **Error Handling**: Graceful fallback for connection failures

### 4.4 Python LiveKit Agent Foundation (Days 3-4)

**Create `livekit-agent/agent.py`**:
```python
"""
LiveKit Agent (Phase 5 - Week 2)
Multi-modal AI agent with 1 FPS screen capture optimization
"""

import asyncio
import os
from typing import Optional
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    Agent,
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.plugins import deepgram

# Load environment variables
load_dotenv()

# Configuration
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
    raise ValueError("LiveKit credentials not configured")


class PlatformAgent(Agent):
    """AI agent for platform with cost-optimized screen capture"""

    def __init__(self):
        super().__init__()
        self.room: Optional[rtc.Room] = None
        self.screen_capture_task: Optional[asyncio.Task] = None
        self.last_frame_time = 0.0
        self.frame_interval = 1.0  # 1 FPS for cost optimization

    async def on_participant_connected(self, participant: rtc.RemoteParticipant):
        """Handle new participant joining room"""
        print(f"Participant connected: {participant.identity}")

    async def on_track_subscribed(
        self,
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        """Handle track subscription (video, audio, screen share)"""
        print(f"Track subscribed: {track.kind} from {participant.identity}")

        if track.kind == rtc.TrackKind.KIND_VIDEO:
            # Start screen capture processing
            if publication.source == rtc.TrackSource.SOURCE_SCREEN_SHARE:
                print("Screen share track detected - starting 1 FPS capture")
                self.screen_capture_task = asyncio.create_task(
                    self._process_screen_frames(track)
                )
        elif track.kind == rtc.TrackKind.KIND_AUDIO:
            # Start voice transcription
            print("Audio track detected - starting transcription")
            asyncio.create_task(self._process_audio(track))

    async def _process_screen_frames(self, track: rtc.VideoTrack):
        """
        Process screen share frames at 1 FPS
        Cost optimization: 96% reduction vs 30 FPS
        """
        video_stream = rtc.VideoStream(track)

        async for frame in video_stream:
            current_time = asyncio.get_event_loop().time()

            # Throttle to 1 FPS
            if current_time - self.last_frame_time < self.frame_interval:
                continue

            self.last_frame_time = current_time

            # TODO Phase 5 Week 3: Send frame to vision AI
            # - Convert frame to image format
            # - Maintain temporal context (last 5 frames)
            # - Send to Gemini Flash 2.5 for analysis

            print(f"Captured frame at {current_time:.2f}s (1 FPS)")

    async def _process_audio(self, track: rtc.AudioTrack):
        """Process voice audio with Deepgram transcription"""
        if not DEEPGRAM_API_KEY:
            print("Warning: Deepgram API key not configured")
            return

        # Create Deepgram STT instance
        stt = deepgram.STT(api_key=DEEPGRAM_API_KEY)

        audio_stream = rtc.AudioStream(track)

        async for event in stt.stream(audio_stream):
            if event.alternatives:
                text = event.alternatives[0].transcript
                if text.strip():
                    print(f"Transcription: {text}")

                    # TODO Phase 5 Week 3: Send to AI for response
                    # - Combine with screen context
                    # - Use cost-optimized AI routing
                    # - Generate and speak response


async def entrypoint(ctx: JobContext):
    """Agent entrypoint called when joining room"""
    print(f"Agent joining room: {ctx.room.name}")

    # Create agent instance
    agent = PlatformAgent()
    agent.room = ctx.room

    # Connect to room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    print(f"Agent connected to room: {ctx.room.name}")
    print(f"Room metadata: {ctx.room.metadata}")

    # Keep agent alive
    await asyncio.Future()


if __name__ == "__main__":
    # Run agent with CLI
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
            ws_url=LIVEKIT_URL,
        )
    )
```

**Create `livekit-agent/requirements.txt`**:
```txt
livekit==0.17.0
livekit-agents==0.9.0
livekit-plugins-deepgram==0.6.0
python-dotenv==1.0.0
httpx==0.27.0
pydantic==2.6.0
```

**Run Agent**:
```bash
cd livekit-agent
source venv/bin/activate
python agent.py dev  # Development mode with auto-reload
```

**Key Agent Implementation Notes**:
- **1 FPS Screen Capture**: Throttles frames to 1 per second (96% cost reduction vs 30 FPS)
- **Deepgram STT**: Real-time voice transcription
- **Track Subscription**: Automatically subscribes to screen share and audio tracks
- **Async Processing**: Non-blocking frame and audio processing
- **Development Mode**: `dev` flag enables auto-reload on code changes

---

## 5. Success Criteria (Week-by-Week Validation)

### Week 2 Day 1-2: Backend Integration ✅

**Validation Commands**:
```bash
# Build backend packages
pnpm build --filter @platform/api --filter @platform/api-contract

# Type check
pnpm typecheck --filter @platform/api --filter @platform/api-contract

# Start API server
pnpm dev:api

# Test room creation (use Postman or curl)
curl -X POST http://localhost:3001/trpc/livekit.createRoom \
  -H "Content-Type: application/json" \
  -d '{"roomName": "test-room"}'
```

**Expected Outcomes**:
- ✅ No TypeScript compilation errors
- ✅ LiveKit service initializes without errors
- ✅ Room creation returns valid room SID
- ✅ Access token generation succeeds
- ✅ Room list query returns empty array (no rooms yet)

**Troubleshooting**:
- **Error: "LiveKit credentials not configured"** → Check `.env` file has LIVEKIT_* variables
- **Error: "Failed to create room"** → Verify LiveKit Cloud account active and API keys valid
- **Error: "Module not found: livekit-server-sdk"** → Run `pnpm install`

### Week 2 Day 2-3: Frontend Integration ✅

**Validation Commands**:
```bash
# Build meeting app
pnpm build --filter @platform/meeting

# Type check
pnpm typecheck --filter @platform/meeting

# Start meeting app
pnpm dev:meeting

# Open in browser
open http://localhost:5175/room/test-room
```

**Expected Outcomes**:
- ✅ Meeting page loads without errors
- ✅ "Joining meeting..." loader appears briefly
- ✅ Video tiles appear in grid layout
- ✅ Control bar shows mic/camera/screen share buttons
- ✅ Clicking "Leave" navigates to dashboard

**Manual Testing Checklist**:
- [ ] Click "Enable Camera" → Camera video appears in tile
- [ ] Click "Enable Microphone" → Microphone indicator shows activity
- [ ] Click "Share Screen" → Screen share prompt appears
- [ ] Open in second browser tab → Second participant tile appears
- [ ] Click "Leave Meeting" → Disconnects and returns to dashboard

**Troubleshooting**:
- **Error: "Failed to join meeting room"** → Check backend API running and room exists
- **Camera not working** → Browser permissions denied - grant camera access
- **No video tiles** → Check LiveKit URL correct in `.env`
- **Control bar missing** → Import `@livekit/components-styles` CSS

### Week 2 Day 3-4: Python Agent Foundation ✅

**Validation Commands**:
```bash
# Activate venv
cd livekit-agent
source venv/bin/activate

# Run agent in dev mode
python agent.py dev

# Expected output:
# "Starting agent worker..."
# "Waiting for room assignment..."
```

**Test Agent Joining Room**:
```bash
# In another terminal:
# 1. Start frontend meeting app (pnpm dev:meeting)
# 2. Open http://localhost:5175/room/test-room
# 3. Join room

# Agent terminal should show:
# "Agent joining room: tenant_xxx_test-room"
# "Agent connected to room: tenant_xxx_test-room"
```

**Expected Outcomes**:
- ✅ Agent starts without Python errors
- ✅ Agent automatically joins room when user joins
- ✅ Agent logs "Participant connected" for each user
- ✅ Agent logs "Track subscribed" for audio/video tracks
- ✅ Screen share triggers "Screen share track detected"

**Manual Testing Checklist**:
- [ ] Start agent → No import errors
- [ ] User joins room → Agent logs participant connection
- [ ] User enables camera → Agent logs video track subscription
- [ ] User enables mic → Agent logs audio track subscription
- [ ] User shares screen → Agent logs "starting 1 FPS capture"
- [ ] Agent terminal shows "Captured frame at Xs (1 FPS)" every second

**Troubleshooting**:
- **Error: "ModuleNotFoundError: No module named 'livekit'"** → Run `pip install -r requirements.txt`
- **Error: "LiveKit credentials not configured"** → Check `.env` file in `livekit-agent/` directory
- **Agent not joining room** → Verify LIVEKIT_URL, API_KEY, API_SECRET correct
- **No frame capture logs** → Ensure screen share active and track subscribed

### Week 2 Day 5: End-to-End Integration ✅

**Full Integration Test**:
```bash
# Terminal 1: Start all services
pnpm dev

# Terminal 2: Start Python agent
cd livekit-agent
source venv/bin/activate
python agent.py dev

# Terminal 3: Monitor logs
tail -f packages/api/logs/api.log  # If logging configured
```

**Complete User Flow Test**:
1. Open dashboard → http://localhost:5174
2. Click "Start Meeting" button (create room via tRPC)
3. Join meeting room → http://localhost:5175/room/{roomName}
4. Enable camera and microphone
5. Start screen sharing
6. Verify agent joins automatically
7. Speak into microphone → Verify Deepgram transcription logs
8. Check agent logs show 1 FPS screen capture

**Success Indicators**:
- ✅ User can create room from dashboard
- ✅ User can join room with video/audio
- ✅ Agent joins room within 5 seconds
- ✅ Screen share triggers 1 FPS capture (verified in logs)
- ✅ Voice transcription appears in agent logs
- ✅ No memory leaks after 30-minute session
- ✅ Network disconnect handled gracefully

**Performance Metrics**:
```bash
# Check LiveKit Cloud dashboard:
# - Video call latency: <300ms target
# - Agent join time: <5 seconds target
# - Screen capture rate: Exactly 1 FPS
# - No dropped frames in 10-minute test
```

---

## 6. Critical Path Dependencies

### Must Complete in Order

**Day 1 Morning: Environment Setup** (BLOCKING)
- ❗ Obtain LiveKit Cloud credentials
- ❗ Obtain Deepgram API key
- ❗ Configure `.env` file
- ❗ Install Python 3.11+ and create venv
- ❗ Install LiveKit frontend/backend SDKs

**Day 1 Afternoon: Backend Foundation** (BLOCKING)
- ❗ Create LiveKit service with room management
- ❗ Create LiveKit tRPC router
- ❗ Test room creation and token generation
- ❗ Validate tenant isolation with multiple rooms

**Day 2: Frontend Integration** (DEPENDS ON: Backend complete)
- Install LiveKit React components
- Create meeting room page
- Test video/audio/screen share UI

**Day 3: Agent Foundation** (DEPENDS ON: Backend + Frontend complete)
- Set up Python venv with dependencies
- Create base agent with room connection
- Test agent joining rooms automatically

**Day 4: Media Processing** (DEPENDS ON: Agent foundation complete)
- Implement 1 FPS screen capture throttling
- Add Deepgram voice transcription
- Validate frame rate and transcription accuracy

**Day 5: Integration Testing** (DEPENDS ON: All components complete)
- End-to-end user flow testing
- Performance metrics validation
- Error handling and edge cases

### Parallel Work Opportunities

**Can Work Simultaneously**:
- Backend LiveKit service + tRPC router (same person)
- Frontend meeting UI + Python agent setup (different people)
- Documentation + implementation (different people)

**Cannot Parallelize**:
- Environment setup → Must complete first
- Backend → Must complete before frontend testing
- Agent foundation → Must complete before media processing

---

## 7. Implementation Notes (Workarounds & Best Practices)

### 7.1 Known Limitations

**Database Schema Not Implemented (Phase 2 Pending)**:
- **Impact**: Cannot persist meeting sessions or track usage in database
- **Workaround**: Use in-memory tracking during development
- **Timeline**: Phase 2 (Weeks 2-4) will add database schema
- **Future**: Store meeting sessions, participant logs, cost events in PostgreSQL

**Auth.js Not Integrated (Phase 3 Pending)**:
- **Impact**: No real user authentication, using placeholder user names
- **Workaround**: Hard-code participant names as "User" for testing
- **Timeline**: Phase 3 (Weeks 5-7) will add Auth.js authentication
- **Future**: Get user identity from authenticated session context

**AI Integration Pending (Phase 5 Week 3)**:
- **Impact**: Agent captures frames/audio but doesn't send to AI yet
- **Workaround**: Log captured data to console for validation
- **Timeline**: Phase 5 Week 3 will integrate AI routing
- **Future**: Send screen context + voice to Gemini Flash 2.5 + GPT-4o-mini

### 7.2 Cost Optimization Strategies

**1 FPS Screen Capture** (96% Cost Reduction):
```python
# CORRECT: Throttle to 1 FPS
async for frame in video_stream:
    current_time = asyncio.get_event_loop().time()
    if current_time - self.last_frame_time < 1.0:  # 1 second interval
        continue
    self.last_frame_time = current_time
    process_frame(frame)  # Only 1 frame per second

# WRONG: Process all frames (30 FPS typical)
async for frame in video_stream:
    process_frame(frame)  # 30x higher cost!
```

**Validate Frame Rate**:
```python
# Add timing metrics
frame_count = 0
start_time = asyncio.get_event_loop().time()

async for frame in video_stream:
    # ... throttling logic ...
    frame_count += 1
    elapsed = asyncio.get_event_loop().time() - start_time
    fps = frame_count / elapsed if elapsed > 0 else 0
    print(f"Current FPS: {fps:.2f}")  # Should be ~1.0 FPS
```

### 7.3 Security Best Practices

**Tenant Isolation in Room Names**:
```typescript
// CORRECT: Include tenant prefix
const fullRoomName = `tenant_${tenantId}_${roomName}`;

// WRONG: No tenant isolation (security risk!)
const fullRoomName = roomName;  // ❌ Cross-tenant access possible
```

**Access Token Scoping**:
```typescript
// CORRECT: Grant only necessary permissions
token.addGrant({
  room: roomName,
  roomJoin: true,
  canPublish: true,      // User can publish video/audio
  canSubscribe: true,    // User can view others
  canPublishData: true,  // User can send messages
});

// WRONG: Grant admin permissions (security risk!)
token.addGrant({
  roomAdmin: true,  // ❌ Can kick participants, end room
});
```

**Environment Variable Validation**:
```typescript
// CORRECT: Fail fast if credentials missing
if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  throw new Error('LiveKit environment variables not configured');
}

// WRONG: Silent failure with undefined
const roomClient = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
// ❌ Fails at runtime with cryptic error
```

### 7.4 Debugging Tips

**Enable LiveKit Debug Logs** (Frontend):
```typescript
import { setLogLevel, LogLevel } from 'livekit-client';

// In development only
if (process.env.NODE_ENV === 'development') {
  setLogLevel(LogLevel.debug);
}
```

**Enable LiveKit Debug Logs** (Python Agent):
```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Monitor LiveKit Cloud Dashboard**:
- Go to https://cloud.livekit.io/projects/your-project/rooms
- View active rooms, participants, tracks in real-time
- Check bandwidth usage and quality metrics
- Debug connection issues with WebRTC stats

**Common Issues and Solutions**:

| Issue | Symptom | Solution |
|-------|---------|----------|
| Camera permission denied | No video tile appears | Grant browser camera/mic permissions |
| Agent not joining | No "Agent connected" log | Check LIVEKIT_URL, API_KEY, API_SECRET |
| No screen capture logs | Agent connected but no frames | Verify screen share active and track subscribed |
| Transcription empty | Audio track subscribed but no text | Check DEEPGRAM_API_KEY configured |
| High latency (>500ms) | Video stutters or lags | Check network connection, reduce resolution |
| Memory leak | Agent memory grows over time | Ensure proper cleanup of streams/tasks |

### 7.5 Performance Optimization

**Frontend Optimization**:
```typescript
// Use GridLayout for automatic responsive grid
<GridLayout tracks={tracks} style={{ height: 'calc(100vh - 180px)' }}>
  <ParticipantTile />
</GridLayout>

// Pre-built ControlBar (optimized)
<ControlBar />

// Manual controls (more overhead)
// ❌ Avoid unless custom styling needed
```

**Agent Optimization**:
```python
# CORRECT: Async processing (non-blocking)
asyncio.create_task(self._process_screen_frames(track))
asyncio.create_task(self._process_audio(track))

# WRONG: Blocking processing
# ❌ Blocks event loop, causes lag
await self._process_screen_frames(track)
await self._process_audio(track)
```

---

## 8. Validation & Quality Gates

### 8.1 TypeScript Compilation

**Run Before Every Commit**:
```bash
# Type check all packages
pnpm typecheck

# Expected output:
# @platform/api:typecheck: OK
# @platform/api-contract:typecheck: OK
# @platform/meeting:typecheck: OK
# ... all packages pass
```

**Zero Tolerance for Type Errors**:
- ❌ No `// @ts-ignore` comments (except for intentional future implementation)
- ❌ No `any` types without documentation
- ✅ Use `as any` with comment explaining why (e.g., type incompatibility)

### 8.2 Code Quality

**Linting and Formatting**:
```bash
# Run Biome linter
pnpm lint

# Auto-fix issues
pnpm lint --write

# Expected output:
# ✔ All files formatted correctly
# ✔ No linting errors
```

**Code Review Checklist**:
- [ ] No hardcoded credentials or secrets
- [ ] Environment variables validated at startup
- [ ] Error handling for all async operations
- [ ] Proper cleanup of resources (streams, tasks)
- [ ] Comments for non-obvious logic
- [ ] Type safety with explicit interfaces
- [ ] Tenant isolation enforced in room names

### 8.3 Testing Checklist

**Manual Testing Required** (No automated tests yet):
```
Phase 5 Week 2 Testing:
[ ] User can create room from dashboard
[ ] User can join room with video/audio
[ ] User can share screen
[ ] Agent joins room automatically within 5 seconds
[ ] Agent logs show 1 FPS screen capture (every 1 second)
[ ] Voice transcription appears in agent logs
[ ] Multiple users can join same room
[ ] Leaving room cleans up connections properly
[ ] Browser refresh rejoins room successfully
[ ] Network disconnect recovers gracefully
[ ] 30-minute session completes without errors
[ ] LiveKit dashboard shows expected metrics
```

**Performance Validation**:
```bash
# Run 10-minute stress test
# 1. Join room with 3 participants
# 2. Enable camera, mic, screen share on all
# 3. Monitor for 10 minutes

# Expected metrics (check LiveKit dashboard):
# - Video latency: <300ms
# - Agent join time: <5 seconds
# - Screen capture rate: 1.0 FPS (±0.1)
# - No memory leaks (stable memory usage)
# - No dropped frames
# - Clean disconnection on leave
```

### 8.4 Build Verification

**Full Build Test**:
```bash
# Clean build from scratch
pnpm clean
pnpm install
pnpm build

# Expected output:
# @platform/shared:build: OK
# @platform/ui:build: OK
# @platform/db:build: OK
# @platform/api:build: OK
# @platform/api-contract:build: OK
# @platform/meeting:build: OK
# ... all packages build successfully

# Verify build time (should use Turbo cache)
# First build: 15-25 seconds
# Cached build: 3-8 seconds
```

### 8.5 Python Agent Validation

**Agent Health Check**:
```bash
# Start agent
cd livekit-agent
source venv/bin/activate
python agent.py dev

# Verify startup sequence:
# 1. ✅ "Starting agent worker..."
# 2. ✅ No import errors
# 3. ✅ "Waiting for room assignment..."
# 4. ✅ No warnings about missing API keys

# Test agent connection
# 1. Join room from frontend
# 2. Verify agent logs:
#    ✅ "Agent joining room: tenant_xxx_room"
#    ✅ "Agent connected to room: tenant_xxx_room"
#    ✅ "Participant connected: User"
```

**Agent Resource Monitoring**:
```bash
# Monitor CPU and memory usage
ps aux | grep python

# Expected steady state:
# CPU: 5-15% (spikes to 30% during frame processing)
# Memory: 100-200MB (should not grow over time)

# Monitor for 30 minutes:
watch -n 10 'ps aux | grep python'
# Memory should remain stable (no leaks)
```

### 8.6 Documentation Validation

**Documentation Checklist**:
- [ ] All new code has JSDoc/docstring comments
- [ ] README updated if new commands added
- [ ] `.env.example` updated with new variables
- [ ] Implementation notes added for workarounds
- [ ] Known limitations documented
- [ ] Performance metrics recorded

**Phase Documentation**:
- [ ] Create `phase-5-week-2-implementation.md` at end of week
- [ ] Update `README.md` with Week 2 completion date
- [ ] Update `docs/guides/roadmap.md` with achievements
- [ ] Commit all changes following workflow

---

## 9. Emergency Protocols

### 9.1 LiveKit Connection Issues

**Symptom**: Unable to connect to LiveKit Cloud

**Diagnosis**:
```bash
# Test LiveKit credentials
curl -X POST "${LIVEKIT_URL}/rtc/validate" \
  -H "Authorization: Bearer ${LIVEKIT_API_KEY}"

# Expected: 200 OK response
```

**Solutions**:
1. **Invalid credentials** → Regenerate API keys in LiveKit Cloud Console
2. **Network firewall** → Check corporate firewall allows WebSocket connections
3. **CORS issues** → Verify LiveKit URL correct (wss:// protocol)
4. **Account suspended** → Check LiveKit Cloud billing status

### 9.2 Python Agent Crashes

**Symptom**: Agent process exits unexpectedly

**Diagnosis**:
```bash
# Check Python error logs
python agent.py dev 2>&1 | tee agent.log

# Common errors:
# - ImportError: Missing dependency
# - ValueError: Missing environment variable
# - ConnectionError: Can't reach LiveKit
```

**Solutions**:
1. **Missing dependencies** → `pip install -r requirements.txt`
2. **Environment variables** → Check `.env` file in `livekit-agent/` directory
3. **Version conflicts** → `pip install --upgrade livekit livekit-agents`
4. **Memory leak** → Restart agent, add memory monitoring

### 9.3 Video Quality Issues

**Symptom**: Laggy video or no video tiles

**Diagnosis**:
```typescript
// Enable LiveKit debug logs
import { setLogLevel, LogLevel } from 'livekit-client';
setLogLevel(LogLevel.debug);

// Check browser console for errors
```

**Solutions**:
1. **Low bandwidth** → Reduce video resolution in LiveKit settings
2. **Track not published** → Verify `canPublish: true` in access token
3. **Browser incompatibility** → Test in Chrome/Firefox (Safari has issues)
4. **TURN server needed** → Check LiveKit Cloud TURN configuration

### 9.4 Transcription Not Working

**Symptom**: No transcription logs from Deepgram

**Diagnosis**:
```python
# Check Deepgram API key
print(f"Deepgram key configured: {bool(DEEPGRAM_API_KEY)}")

# Check audio track subscribed
print(f"Audio track subscribed: {track.kind == rtc.TrackKind.KIND_AUDIO}")
```

**Solutions**:
1. **Invalid API key** → Regenerate Deepgram API key
2. **Audio track not subscribed** → Enable microphone in frontend
3. **Network issues** → Check Deepgram service status
4. **Quota exceeded** → Check Deepgram account credits ($200 free)

---

## 10. Week 2 Success Checklist

### Before Starting Week 2

```
Setup Checklist:
[ ] LiveKit Cloud account created
[ ] LiveKit API keys generated and saved
[ ] Deepgram API key obtained
[ ] `.env` file configured with all variables
[ ] Python 3.11+ installed
[ ] Python venv created and activated
[ ] LiveKit SDKs installed (frontend + backend + Python)
[ ] All development servers running
[ ] Environment variables validated
```

### End of Week 2 Deliverables

```
Implementation Checklist:
[ ] LiveKit service created (room management)
[ ] LiveKit tRPC router implemented
[ ] Meeting page frontend with video grid
[ ] Control bar with mic/camera/screen share
[ ] Python agent with room connection
[ ] 1 FPS screen capture implemented
[ ] Deepgram voice transcription working
[ ] Tenant isolation enforced in room names
[ ] All TypeScript builds passing
[ ] Python agent runs without errors
```

### End-to-End Validation

```
Testing Checklist:
[ ] User creates room from dashboard
[ ] User joins room with video/audio/screen share
[ ] Agent joins room within 5 seconds
[ ] Agent logs show 1 FPS screen capture
[ ] Voice transcription appears in agent logs
[ ] Multiple users can join same room
[ ] 30-minute session completes without errors
[ ] Performance metrics validated (<300ms latency)
[ ] LiveKit Cloud dashboard shows expected metrics
[ ] No memory leaks in agent
```

### Documentation Complete

```
Documentation Checklist:
[ ] phase-5-week-2-implementation.md created
[ ] All code has JSDoc/docstring comments
[ ] Implementation notes for workarounds added
[ ] Known limitations documented
[ ] Performance metrics recorded
[ ] README.md updated with Week 2 completion
[ ] docs/guides/roadmap.md updated
[ ] Git commit following workflow
```

---

## 11. Next Steps After Week 2

**Phase 5 Week 3 Preview** (AI Integration):
- Integrate Gemini Flash 2.5 for screen context analysis
- Integrate GPT-4o-mini for LLM conversations
- Combine vision + voice + text for multi-modal AI
- Implement cost-optimized AI routing
- Add knowledge base RAG queries from agent
- Generate and speak AI responses

**Phase 5 Week 4 Preview** (Optimization):
- Add unit tests for LiveKit service
- Add integration tests for agent
- Performance optimization and profiling
- Error handling and edge cases
- Production deployment preparation

**Phase 6 Preview** (Real-time Features):
- WebSocket chat integration
- Redis Streams for message broadcasting
- Typing indicators and presence
- File sharing and attachments
- Screen annotation tools

---

## 12. Support and Resources

### Official Documentation
- **LiveKit Docs**: https://docs.livekit.io/
- **LiveKit React Components**: https://docs.livekit.io/reference/components/react/
- **LiveKit Python SDK**: https://docs.livekit.io/reference/server-sdk/python/
- **Deepgram Docs**: https://developers.deepgram.com/docs

### Project Documentation
- `docs/guides/roadmap.md` - Implementation roadmap
- `docs/reference/livekit-agent-implementation.md` - Agent reference
- `docs/implementation/WORKFLOW.md` - Phase transition workflow
- `CLAUDE.md` - Project overview and commands

### Troubleshooting
- **LiveKit Community**: https://livekit.io/community
- **GitHub Issues**: Check project repository for known issues
- **LiveKit Dashboard**: Monitor real-time metrics and logs
- **Browser DevTools**: Network tab for WebSocket connections

---

**Document Version**: 1.0
**Last Updated**: January 10, 2025
**Next Review**: Phase 5 Week 2 completion (January 17, 2025)
