-- 001: Topics table
-- Owner: Admin / Master Agent
-- Stores the registry of learning topics available in the system

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with initial banking AI topics
INSERT INTO topics (name, description) VALUES
  ('Agentic AI', 'AI systems that autonomously plan, reason, and act to accomplish goals'),
  ('Salesforce Agentforce', 'Salesforce platform for building and deploying AI agents'),
  ('AI Strategy', 'Strategic frameworks for adopting AI in banking and financial services')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE topics IS 'Registry of learning topics. Master Agent and Admin manage lifecycle.';
