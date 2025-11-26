-- Migration 018: Phase 12 Enterprise Schema Additions
-- Add metadata column to tenants and ticketing fields to escalations
-- Version: 018
-- Date: 2025-11-25

-- ==================== ADD METADATA TO TENANTS ====================

-- Add metadata JSONB column for enterprise integrations
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN tenants.metadata IS 'Phase 12: Enterprise integrations metadata (ticketing, CRM, SSO, etc.)';

-- ==================== ADD TICKETING FIELDS TO ESCALATIONS ====================

-- Add ticketing integration fields to escalations table
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE escalations ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

COMMENT ON COLUMN escalations.subject IS 'Ticket subject line for ticketing integrations';
COMMENT ON COLUMN escalations.description IS 'Full problem description for tickets';
COMMENT ON COLUMN escalations.category IS 'Problem category for classification';
COMMENT ON COLUMN escalations.subcategory IS 'Problem subcategory for detailed classification';

-- ==================== INDEXES FOR NEW COLUMNS ====================

-- Index on category for filtering escalations
CREATE INDEX IF NOT EXISTS idx_escalations_category ON escalations(category);

-- Index on metadata for JSONB queries
CREATE INDEX IF NOT EXISTS idx_tenants_metadata ON tenants USING GIN (metadata);

-- ==================== VERIFY CHANGES ====================

DO $$
BEGIN
    RAISE NOTICE 'Migration 018: Phase 12 Enterprise Schema Additions completed';
    RAISE NOTICE 'Added: tenants.metadata (JSONB)';
    RAISE NOTICE 'Added: escalations.subject (TEXT)';
    RAISE NOTICE 'Added: escalations.description (TEXT)';
    RAISE NOTICE 'Added: escalations.category (VARCHAR(100))';
    RAISE NOTICE 'Added: escalations.subcategory (VARCHAR(100))';
END $$;
