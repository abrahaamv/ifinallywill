-- Migration: Add LiveKit and AI personality fields to sessions
-- Supports unified widget transition from chat to video mode

-- Add livekit_room_name for video sessions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS livekit_room_name TEXT;

-- Add ai_personality_id to preserve personality during transitions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS ai_personality_id UUID REFERENCES ai_personalities(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_livekit_room ON sessions(livekit_room_name) WHERE livekit_room_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_personality ON sessions(ai_personality_id);

-- Comments
COMMENT ON COLUMN sessions.livekit_room_name IS 'LiveKit room name for video/screen share sessions';
COMMENT ON COLUMN sessions.ai_personality_id IS 'AI personality used during this session (captured at transition time)';
