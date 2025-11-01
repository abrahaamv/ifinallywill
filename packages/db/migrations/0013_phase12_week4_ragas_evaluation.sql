-- Phase 12 Week 4: RAGAS Evaluation Framework
-- RAG quality assurance with faithfulness, relevancy, precision, and recall metrics

-- ==================== RAG EVALUATION RUNS ====================

CREATE TABLE IF NOT EXISTS rag_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Evaluation metadata
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('automated', 'manual', 'regression', 'baseline')),
  config_snapshot JSONB NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Aggregate scores
  avg_faithfulness DECIMAL(5, 4),
  avg_answer_relevancy DECIMAL(5, 4),
  avg_context_precision DECIMAL(5, 4),
  avg_context_recall DECIMAL(5, 4),

  -- Overall metrics
  total_queries INTEGER NOT NULL DEFAULT 0,
  successful_evaluations INTEGER NOT NULL DEFAULT 0,
  failed_evaluations INTEGER NOT NULL DEFAULT 0,

  -- Regression detection
  is_regression TEXT DEFAULT 'no' CHECK (is_regression IN ('no', 'warning', 'critical')),
  baseline_run_id UUID REFERENCES rag_evaluation_runs(id) ON DELETE SET NULL,
  regression_threshold DECIMAL(5, 4) DEFAULT 0.05,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  metadata JSONB
);

-- ==================== RAG EVALUATIONS ====================

CREATE TABLE IF NOT EXISTS rag_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES rag_evaluation_runs(id) ON DELETE CASCADE,

  -- Query and response
  query TEXT NOT NULL,
  retrieved_context JSONB NOT NULL,
  generated_answer TEXT NOT NULL,
  ground_truth TEXT,

  -- RAGAS metrics (0.0 - 1.0 scale)
  faithfulness DECIMAL(5, 4),
  answer_relevancy DECIMAL(5, 4),
  context_precision DECIMAL(5, 4),
  context_recall DECIMAL(5, 4),

  -- Composite score
  composite_score DECIMAL(5, 4),

  -- Detailed analysis
  faithfulness_details JSONB,
  relevancy_details JSONB,
  precision_details JSONB,
  recall_details JSONB,

  -- Performance metrics
  retrieval_time_ms INTEGER,
  generation_time_ms INTEGER,
  total_time_ms INTEGER,

  -- Cost tracking
  evaluation_cost_usd DECIMAL(10, 6),

  -- Status
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,

  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==================== RAG TEST SETS ====================

CREATE TABLE IF NOT EXISTS rag_test_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  test_cases JSONB NOT NULL,

  is_active TEXT NOT NULL DEFAULT 'true',

  -- Usage tracking
  total_runs INTEGER NOT NULL DEFAULT 0,
  last_run_id UUID REFERENCES rag_evaluation_runs(id) ON DELETE SET NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  metadata JSONB
);

-- ==================== RAG QUALITY THRESHOLDS ====================

CREATE TABLE IF NOT EXISTS rag_quality_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Threshold configuration
  min_faithfulness DECIMAL(5, 4) NOT NULL DEFAULT 0.8,
  min_answer_relevancy DECIMAL(5, 4) NOT NULL DEFAULT 0.7,
  min_context_precision DECIMAL(5, 4) NOT NULL DEFAULT 0.6,
  min_context_recall DECIMAL(5, 4) NOT NULL DEFAULT 0.7,
  min_composite_score DECIMAL(5, 4) NOT NULL DEFAULT 0.75,

  -- Alerting configuration
  enable_alerts TEXT NOT NULL DEFAULT 'true',
  alert_channels JSONB,

  -- Environment
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),

  is_active TEXT NOT NULL DEFAULT 'true',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================

-- Evaluation runs
CREATE INDEX idx_rag_evaluation_runs_tenant_id ON rag_evaluation_runs(tenant_id);
CREATE INDEX idx_rag_evaluation_runs_status ON rag_evaluation_runs(status);
CREATE INDEX idx_rag_evaluation_runs_evaluation_type ON rag_evaluation_runs(evaluation_type);
CREATE INDEX idx_rag_evaluation_runs_started_at ON rag_evaluation_runs(started_at DESC);
CREATE INDEX idx_rag_evaluation_runs_is_regression ON rag_evaluation_runs(is_regression) WHERE is_regression != 'no';

-- Evaluations
CREATE INDEX idx_rag_evaluations_run_id ON rag_evaluations(run_id);
CREATE INDEX idx_rag_evaluations_status ON rag_evaluations(status);
CREATE INDEX idx_rag_evaluations_composite_score ON rag_evaluations(composite_score DESC);
CREATE INDEX idx_rag_evaluations_evaluated_at ON rag_evaluations(evaluated_at DESC);

-- Test sets
CREATE INDEX idx_rag_test_sets_tenant_id ON rag_test_sets(tenant_id);
CREATE INDEX idx_rag_test_sets_is_active ON rag_test_sets(is_active) WHERE is_active = 'true';

-- Quality thresholds
CREATE INDEX idx_rag_quality_thresholds_tenant_id ON rag_quality_thresholds(tenant_id);
CREATE INDEX idx_rag_quality_thresholds_environment ON rag_quality_thresholds(environment);
CREATE INDEX idx_rag_quality_thresholds_is_active ON rag_quality_thresholds(is_active) WHERE is_active = 'true';

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE rag_evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_test_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_quality_thresholds ENABLE ROW LEVEL SECURITY;

-- Evaluation runs policies
CREATE POLICY rag_evaluation_runs_tenant_isolation ON rag_evaluation_runs
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Evaluations inherit tenant from run
CREATE POLICY rag_evaluations_tenant_isolation ON rag_evaluations
  FOR ALL
  USING (
    run_id IN (
      SELECT id FROM rag_evaluation_runs WHERE tenant_id = get_current_tenant_id()
    )
  );

-- Test sets policies
CREATE POLICY rag_test_sets_tenant_isolation ON rag_test_sets
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Quality thresholds policies
CREATE POLICY rag_quality_thresholds_tenant_isolation ON rag_quality_thresholds
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Force RLS
ALTER TABLE rag_evaluation_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE rag_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE rag_test_sets FORCE ROW LEVEL SECURITY;
ALTER TABLE rag_quality_thresholds FORCE ROW LEVEL SECURITY;
