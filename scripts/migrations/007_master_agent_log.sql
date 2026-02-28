-- 007: Master Agent Log table
-- Owner: Master Agent
-- Audit log of every user interaction processed by Master Agent

CREATE TABLE IF NOT EXISTS master_agent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  raw_input TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('research', 'create_content', 'assess', 'learn', 'unknown')),
  dispatched_to TEXT CHECK (dispatched_to IN ('scout', 'content_creator', 'assessment', 'learning')),
  response TEXT,
  agent_message_id UUID REFERENCES agent_messages(id),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_log_user ON master_agent_log(user_id);
CREATE INDEX idx_master_log_intent ON master_agent_log(intent);
CREATE INDEX idx_master_log_created ON master_agent_log(created_at DESC);

COMMENT ON TABLE master_agent_log IS 'Master Agent audit trail. Every user message, classified intent, and dispatch record.';
