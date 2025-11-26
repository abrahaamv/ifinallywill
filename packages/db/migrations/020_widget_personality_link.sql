-- Migration: Add AI personality link to widgets table
-- Allows widgets to be configured with a specific AI personality

-- Add ai_personality_id column to widgets
ALTER TABLE widgets
ADD COLUMN IF NOT EXISTS ai_personality_id UUID REFERENCES ai_personalities(id) ON DELETE SET NULL;

-- Create index for personality lookup
CREATE INDEX IF NOT EXISTS idx_widgets_personality ON widgets(ai_personality_id);

-- Comment documenting the change
COMMENT ON COLUMN widgets.ai_personality_id IS 'Optional AI personality override for this widget. Falls back to tenant default if null.';
