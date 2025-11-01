-- Phase 12 Week 5-6: CRM Integrations (Salesforce, HubSpot, Zendesk)
-- Bi-directional sync with conflict resolution

-- ==================== CRM CONNECTIONS ====================

CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- CRM provider
  provider TEXT NOT NULL CHECK (provider IN ('salesforce', 'hubspot', 'zendesk')),

  -- Connection status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'disconnected', 'error', 'pending')),

  -- OAuth credentials (encrypted)
  credentials JSONB NOT NULL,

  -- Sync configuration
  sync_config JSONB NOT NULL,

  -- Connection metadata
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'failed')),
  sync_error_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  metadata JSONB
);

-- ==================== CRM FIELD MAPPINGS ====================

CREATE TABLE IF NOT EXISTS crm_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,

  -- Field mapping
  platform_field TEXT NOT NULL,
  crm_field TEXT NOT NULL,
  crm_object_type TEXT NOT NULL,

  -- Mapping configuration
  direction TEXT NOT NULL CHECK (direction IN ('platform_to_crm', 'crm_to_platform', 'bidirectional')),

  transformation_rules JSONB,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==================== CRM SYNC STATE ====================

CREATE TABLE IF NOT EXISTS crm_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,

  -- Entity mapping
  platform_entity_type TEXT NOT NULL,
  platform_entity_id UUID NOT NULL,
  crm_entity_type TEXT NOT NULL,
  crm_entity_id TEXT NOT NULL,

  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  platform_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  crm_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Conflict detection
  has_conflict BOOLEAN NOT NULL DEFAULT false,
  conflict_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==================== CRM SYNC LOGS ====================

CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,

  -- Sync operation
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'sync')),
  direction TEXT NOT NULL CHECK (direction IN ('platform_to_crm', 'crm_to_platform')),

  -- Entity details
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  -- Sync result
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  error_code TEXT,

  -- Data snapshot
  data_before JSONB,
  data_after JSONB,

  -- Performance metrics
  duration_ms INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,

  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  metadata JSONB
);

-- ==================== CRM WEBHOOKS ====================

CREATE TABLE IF NOT EXISTS crm_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,

  -- Webhook configuration
  provider TEXT NOT NULL CHECK (provider IN ('salesforce', 'hubspot', 'zendesk')),
  event_type TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  secret TEXT NOT NULL,

  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_received_at TIMESTAMP WITH TIME ZONE,
  total_received INTEGER NOT NULL DEFAULT 0,
  total_processed INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  metadata JSONB
);

-- ==================== INDEXES ====================

-- CRM connections
CREATE INDEX idx_crm_connections_tenant_id ON crm_connections(tenant_id);
CREATE INDEX idx_crm_connections_provider ON crm_connections(provider);
CREATE INDEX idx_crm_connections_status ON crm_connections(status);

-- Field mappings
CREATE INDEX idx_crm_field_mappings_connection_id ON crm_field_mappings(connection_id);
CREATE INDEX idx_crm_field_mappings_platform_field ON crm_field_mappings(platform_field);
CREATE INDEX idx_crm_field_mappings_is_active ON crm_field_mappings(is_active) WHERE is_active = true;

-- Sync state
CREATE INDEX idx_crm_sync_state_connection_id ON crm_sync_state(connection_id);
CREATE INDEX idx_crm_sync_state_platform_entity ON crm_sync_state(platform_entity_type, platform_entity_id);
CREATE INDEX idx_crm_sync_state_crm_entity ON crm_sync_state(crm_entity_type, crm_entity_id);
CREATE INDEX idx_crm_sync_state_has_conflict ON crm_sync_state(has_conflict) WHERE has_conflict = true;
CREATE INDEX idx_crm_sync_state_last_synced ON crm_sync_state(last_synced_at DESC);

-- Sync logs
CREATE INDEX idx_crm_sync_logs_connection_id ON crm_sync_logs(connection_id);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);
CREATE INDEX idx_crm_sync_logs_synced_at ON crm_sync_logs(synced_at DESC);
CREATE INDEX idx_crm_sync_logs_entity ON crm_sync_logs(entity_type, entity_id);

-- Webhooks
CREATE INDEX idx_crm_webhooks_connection_id ON crm_webhooks(connection_id);
CREATE INDEX idx_crm_webhooks_provider ON crm_webhooks(provider);
CREATE INDEX idx_crm_webhooks_is_active ON crm_webhooks(is_active) WHERE is_active = true;

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_webhooks ENABLE ROW LEVEL SECURITY;

-- CRM connections policies
CREATE POLICY crm_connections_tenant_isolation ON crm_connections
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Field mappings inherit tenant from connection
CREATE POLICY crm_field_mappings_tenant_isolation ON crm_field_mappings
  FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections WHERE tenant_id = get_current_tenant_id()
    )
  );

-- Sync state inherit tenant from connection
CREATE POLICY crm_sync_state_tenant_isolation ON crm_sync_state
  FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections WHERE tenant_id = get_current_tenant_id()
    )
  );

-- Sync logs inherit tenant from connection
CREATE POLICY crm_sync_logs_tenant_isolation ON crm_sync_logs
  FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections WHERE tenant_id = get_current_tenant_id()
    )
  );

-- Webhooks inherit tenant from connection
CREATE POLICY crm_webhooks_tenant_isolation ON crm_webhooks
  FOR ALL
  USING (
    connection_id IN (
      SELECT id FROM crm_connections WHERE tenant_id = get_current_tenant_id()
    )
  );

-- Force RLS
ALTER TABLE crm_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE crm_field_mappings FORCE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_state FORCE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE crm_webhooks FORCE ROW LEVEL SECURITY;
