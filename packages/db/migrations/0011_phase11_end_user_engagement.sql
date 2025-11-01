-- Migration 0011: Phase 11 End User Engagement & Survey System
-- Add tables for end user verification, surveys, problem tracking, and escalations

-- ============================================================================
-- 1. End Users Table (Separate from Tenant Admin Users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS end_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact information (user chooses phone OR email)
  phone_number VARCHAR(20), -- E.164 format: +15555551234
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMPTZ,

  email VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,

  -- Identity (optional)
  name VARCHAR(255),
  external_id VARCHAR(255), -- Tenant's CRM ID for the user

  -- Consent flags (GDPR/CCPA compliance)
  consent_sms BOOLEAN DEFAULT false,
  consent_email BOOLEAN DEFAULT false,
  consent_calls BOOLEAN DEFAULT false,
  consented_at TIMESTAMPTZ,

  -- Abuse prevention
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,

  -- Device fingerprinting (from FingerprintJS)
  device_fingerprint VARCHAR(255),

  -- Source tracking (for landing page leads)
  source VARCHAR(50) DEFAULT 'widget', -- 'widget', 'landing_demo'
  is_potential_tenant BOOLEAN DEFAULT false, -- Landing page leads

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_phone CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$'),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT at_least_one_contact CHECK (phone_number IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_end_users_tenant ON end_users(tenant_id);
CREATE INDEX idx_end_users_phone ON end_users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_end_users_email ON end_users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_end_users_external_id ON end_users(tenant_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_end_users_blocked ON end_users(is_blocked) WHERE is_blocked = true;
CREATE INDEX idx_end_users_source ON end_users(source, is_potential_tenant);
CREATE INDEX idx_end_users_device ON end_users(device_fingerprint) WHERE device_fingerprint IS NOT NULL;

COMMENT ON TABLE end_users IS 'Phase 11: End user contacts (separate from tenant admin users)';
COMMENT ON COLUMN end_users.phone_number IS 'E.164 format phone number';
COMMENT ON COLUMN end_users.external_id IS 'Tenant CRM ID for this end user';
COMMENT ON COLUMN end_users.device_fingerprint IS 'FingerprintJS visitor ID for abuse prevention';
COMMENT ON COLUMN end_users.is_potential_tenant IS 'Landing page demo user who might become a tenant';

-- ============================================================================
-- 2. Link Sessions to End Users
-- ============================================================================
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS end_user_id UUID REFERENCES end_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false; -- Landing page demo sessions

CREATE INDEX idx_sessions_end_user ON sessions(end_user_id) WHERE end_user_id IS NOT NULL;
CREATE INDEX idx_sessions_demo ON sessions(is_demo) WHERE is_demo = true;

COMMENT ON COLUMN sessions.end_user_id IS 'Link session to end user (widget/landing visitors)';
COMMENT ON COLUMN sessions.is_demo IS 'Landing page demo session (time-limited)';

-- ============================================================================
-- 3. Survey Responses Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  end_user_id UUID REFERENCES end_users(id) ON DELETE SET NULL,
  resolution_id UUID, -- Will reference resolutions table from Phase 10 (if exists)

  -- Survey method
  survey_method VARCHAR(20) NOT NULL, -- 'in_widget', 'ai_call', 'sms_link', 'email_link'
  fallback_attempts INTEGER DEFAULT 0, -- 0-3 (in_widget, call, sms, email)

  -- Questions & answers
  problem_solved BOOLEAN, -- Was your problem solved?
  experience_rating INTEGER, -- 1-5 stars
  would_recommend BOOLEAN, -- Would you recommend to a friend?
  feedback_text TEXT,

  -- Refusal tracking
  refused_to_rate BOOLEAN DEFAULT false, -- User clicked "Later" button

  -- Metadata
  responded_at TIMESTAMPTZ,
  call_duration_seconds INTEGER, -- For AI voice surveys
  call_answered BOOLEAN, -- Did user answer the call?
  call_recording_url TEXT, -- Optional recording
  survey_completed BOOLEAN DEFAULT false, -- Did user complete full survey?

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rating CHECK (experience_rating BETWEEN 1 AND 5 OR experience_rating IS NULL),
  CONSTRAINT valid_method CHECK (survey_method IN ('in_widget', 'ai_call', 'sms_link', 'email_link'))
);

CREATE INDEX idx_survey_responses_tenant ON survey_responses(tenant_id);
CREATE INDEX idx_survey_responses_session ON survey_responses(session_id);
CREATE INDEX idx_survey_responses_end_user ON survey_responses(end_user_id);
CREATE INDEX idx_survey_responses_method ON survey_responses(survey_method);
CREATE INDEX idx_survey_responses_completed ON survey_responses(survey_completed);
CREATE INDEX idx_survey_responses_rating ON survey_responses(experience_rating) WHERE experience_rating IS NOT NULL;
CREATE INDEX idx_survey_responses_problem_solved ON survey_responses(problem_solved) WHERE problem_solved IS NOT NULL;

COMMENT ON TABLE survey_responses IS 'Phase 11: Multi-tier survey responses (in-widget, AI call, SMS, email)';
COMMENT ON COLUMN survey_responses.fallback_attempts IS 'Number of fallback attempts (0=in_widget, 1=AI call, 2=SMS, 3=email)';
COMMENT ON COLUMN survey_responses.refused_to_rate IS 'User clicked Later button instead of rating';

-- ============================================================================
-- 4. Unresolved Problems Table (Semantic Deduplication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS unresolved_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Problem identification (semantic similarity)
  problem_description TEXT NOT NULL,
  problem_embedding vector(1024), -- Voyage Multimodal-3 embedding
  problem_hash VARCHAR(64) NOT NULL, -- SHA256 hash of normalized description

  -- Tracking
  first_session_id UUID REFERENCES sessions(id),
  last_session_id UUID REFERENCES sessions(id),
  affected_user_count INTEGER DEFAULT 1, -- Number of users with this problem
  attempt_count INTEGER DEFAULT 1, -- Total attempts across all users

  -- Status
  status VARCHAR(20) DEFAULT 'unresolved', -- 'unresolved', 'rag_updated', 'resolved'

  -- AI-generated solution (awaiting approval)
  generated_solution_draft TEXT, -- Markdown format
  generated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Knowledge base integration
  knowledge_document_id UUID REFERENCES knowledge_documents(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unresolved_problems_tenant ON unresolved_problems(tenant_id);
CREATE INDEX idx_unresolved_problems_status ON unresolved_problems(status);
CREATE INDEX idx_unresolved_problems_hash ON unresolved_problems(tenant_id, problem_hash);
CREATE INDEX idx_unresolved_problems_knowledge_doc ON unresolved_problems(knowledge_document_id) WHERE knowledge_document_id IS NOT NULL;

-- Vector similarity index for semantic deduplication
CREATE INDEX idx_unresolved_problems_embedding ON unresolved_problems
USING ivfflat (problem_embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON TABLE unresolved_problems IS 'Phase 11: Semantic problem deduplication to prevent duplicate RAG content';
COMMENT ON COLUMN unresolved_problems.problem_embedding IS 'Voyage Multimodal-3 embedding for semantic similarity';
COMMENT ON COLUMN unresolved_problems.problem_hash IS 'SHA256 hash for exact match deduplication';
COMMENT ON COLUMN unresolved_problems.affected_user_count IS 'Number of unique users encountering this problem';

-- ============================================================================
-- 5. Blocked Users Per Problem
-- ============================================================================
CREATE TABLE IF NOT EXISTS unresolved_problem_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES unresolved_problems(id) ON DELETE CASCADE,
  end_user_id UUID NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,

  first_blocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified_when_resolved BOOLEAN DEFAULT false,

  UNIQUE(problem_id, end_user_id)
);

CREATE INDEX idx_unresolved_problem_users_end_user ON unresolved_problem_users(end_user_id);
CREATE INDEX idx_unresolved_problem_users_problem ON unresolved_problem_users(problem_id);

COMMENT ON TABLE unresolved_problem_users IS 'Phase 11: Track which end users are blocked by which unresolved problems';
COMMENT ON COLUMN unresolved_problem_users.notified_when_resolved IS 'Whether user should be notified when problem is resolved';

-- ============================================================================
-- 6. Escalations Table (Human Agent Handoff)
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  end_user_id UUID REFERENCES end_users(id) ON DELETE SET NULL,

  -- Escalation type and reason
  escalation_type VARCHAR(50) DEFAULT 'ai_failure',
    -- 'ai_failure', 'time_exceeded', 'duplicate_problem', 'user_request'
  reason TEXT, -- Escalation reason/description
  problem_id UUID REFERENCES unresolved_problems(id) ON DELETE SET NULL, -- Associated problem

  -- Timing
  within_service_hours BOOLEAN DEFAULT true,
  scheduled_followup_at TIMESTAMPTZ,

  -- Human agent assignment
  human_agent_id UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ, -- When agent was assigned
  human_agent_joined_at TIMESTAMPTZ,
  meeting_url TEXT, -- meet.platform.com/{token}
  meeting_token VARCHAR(32), -- Token for meeting URL
  meeting_duration_seconds INTEGER, -- Duration of meeting

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT, -- Notes from agent about resolution

  -- Metadata
  escalation_metadata JSONB, -- Session duration, attempt count, problem description, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_escalation_type CHECK (escalation_type IN ('ai_failure', 'time_exceeded', 'duplicate_problem', 'user_request'))
);

CREATE INDEX idx_escalations_tenant ON escalations(tenant_id);
CREATE INDEX idx_escalations_session ON escalations(session_id);
CREATE INDEX idx_escalations_type ON escalations(escalation_type);
CREATE INDEX idx_escalations_scheduled ON escalations(scheduled_followup_at)
  WHERE scheduled_followup_at IS NOT NULL;
CREATE INDEX idx_escalations_human_agent ON escalations(human_agent_id)
  WHERE human_agent_id IS NOT NULL;
CREATE INDEX idx_escalations_unresolved ON escalations(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE escalations IS 'Phase 11: Human agent escalation tracking and meeting URL generation';
COMMENT ON COLUMN escalations.meeting_url IS 'Generated LiveKit meeting URL for human agent handoff';
COMMENT ON COLUMN escalations.within_service_hours IS 'Whether escalation occurred during configured service hours';

-- ============================================================================
-- 7. Tenant Configuration (AI Personalities Extended)
-- ============================================================================
ALTER TABLE ai_personalities
  -- End user verification requirements
  ADD COLUMN IF NOT EXISTS require_end_user_phone BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_end_user_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_both_contacts BOOLEAN DEFAULT false, -- Require phone AND email

  -- Survey settings
  ADD COLUMN IF NOT EXISTS enable_post_conversation_survey BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS survey_method_priority JSONB DEFAULT '["in_widget", "ai_call", "sms_link", "email_link"]',
  ADD COLUMN IF NOT EXISTS survey_delay_minutes INTEGER DEFAULT 5, -- Wait 5 minutes after conversation

  -- Human agent escalation
  ADD COLUMN IF NOT EXISTS enable_human_escalation BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS service_hours JSONB, -- {"monday": {"start": "08:00", "end": "16:00", "timezone": "America/New_York"}, ...}
  ADD COLUMN IF NOT EXISTS escalation_phone VARCHAR(20), -- Optional: call this number if no agent available

  -- Problem tracking
  ADD COLUMN IF NOT EXISTS enable_problem_blocking BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS similarity_threshold DECIMAL(3,2) DEFAULT 0.85, -- For semantic deduplication

  -- LiveKit session abuse prevention
  ADD COLUMN IF NOT EXISTS require_text_chat_first BOOLEAN DEFAULT true, -- Gather context before LiveKit
  ADD COLUMN IF NOT EXISTS min_messages_before_video INTEGER DEFAULT 3, -- Minimum chat messages before video call
  ADD COLUMN IF NOT EXISTS max_demo_duration_seconds INTEGER DEFAULT 300; -- 5 minutes for landing page demos

-- Indexes for tenant configuration
CREATE INDEX idx_ai_personalities_survey_enabled
  ON ai_personalities(enable_post_conversation_survey)
  WHERE enable_post_conversation_survey = true;
CREATE INDEX idx_ai_personalities_escalation_enabled
  ON ai_personalities(enable_human_escalation)
  WHERE enable_human_escalation = true;

COMMENT ON COLUMN ai_personalities.require_text_chat_first IS 'Phase 11: Require chat messages before expensive LiveKit video call';
COMMENT ON COLUMN ai_personalities.similarity_threshold IS 'Phase 11: Cosine similarity threshold for problem deduplication (0.85 = 85% similar)';

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE end_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE unresolved_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE unresolved_problem_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- Force RLS for all operations
ALTER TABLE end_users FORCE ROW LEVEL SECURITY;
ALTER TABLE survey_responses FORCE ROW LEVEL SECURITY;
ALTER TABLE unresolved_problems FORCE ROW LEVEL SECURITY;
ALTER TABLE unresolved_problem_users FORCE ROW LEVEL SECURITY;
ALTER TABLE escalations FORCE ROW LEVEL SECURITY;

-- End users policies
CREATE POLICY end_users_tenant_isolation ON end_users
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Survey responses policies
CREATE POLICY survey_responses_tenant_isolation ON survey_responses
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Unresolved problems policies
CREATE POLICY unresolved_problems_tenant_isolation ON unresolved_problems
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Unresolved problem users policies (via problem table)
CREATE POLICY unresolved_problem_users_tenant_isolation ON unresolved_problem_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM unresolved_problems
      WHERE unresolved_problems.id = unresolved_problem_users.problem_id
      AND unresolved_problems.tenant_id = get_current_tenant_id()
    )
  );

-- Escalations policies
CREATE POLICY escalations_tenant_isolation ON escalations
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ============================================================================
-- Triggers for Updated Timestamps
-- ============================================================================

-- Update end_users updated_at on modification
CREATE OR REPLACE FUNCTION update_end_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_end_users_timestamp
  BEFORE UPDATE ON end_users
  FOR EACH ROW
  EXECUTE FUNCTION update_end_users_timestamp();

-- Update unresolved_problems updated_at on modification
CREATE OR REPLACE FUNCTION update_unresolved_problems_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_unresolved_problems_timestamp
  BEFORE UPDATE ON unresolved_problems
  FOR EACH ROW
  EXECUTE FUNCTION update_unresolved_problems_timestamp();
