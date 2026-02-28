-- ============================================================
-- AdaptLearn POC — Complete Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- === 001: Topics ===
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO topics (name, description) VALUES
  ('Agentic AI', 'AI systems that autonomously plan, reason, and act to accomplish goals'),
  ('Salesforce Agentforce', 'Salesforce platform for building and deploying AI agents'),
  ('AI Strategy', 'Strategic frameworks for adopting AI in banking and financial services')
ON CONFLICT (name) DO NOTHING;

-- === 002: Skill Map ===
CREATE TABLE IF NOT EXISTS skill_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  skills JSONB NOT NULL DEFAULT '[]',
  source_summary TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_map_topic ON skill_map(topic_id);
CREATE INDEX IF NOT EXISTS idx_skill_map_generated ON skill_map(generated_at DESC);

-- === 003: Content Items ===
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  depth TEXT NOT NULL CHECK (depth IN ('beginner', 'intermediate', 'advanced')),
  prose TEXT NOT NULL,
  key_concepts JSONB NOT NULL DEFAULT '[]',
  questions JSONB NOT NULL DEFAULT '[]',
  flashcards JSONB NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_items_topic ON content_items(topic_id);
CREATE INDEX IF NOT EXISTS idx_content_items_skill ON content_items(skill);
CREATE INDEX IF NOT EXISTS idx_content_items_depth ON content_items(depth);

-- === 004: Assessment Results ===
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score NUMERIC(3,2) NOT NULL CHECK (score >= 0 AND score <= 1),
  outcome TEXT NOT NULL CHECK (outcome IN ('PASS', 'PARTIAL', 'FAIL')),
  gaps JSONB NOT NULL DEFAULT '[]',
  answers JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT CHECK (recommendation IN ('advance', 'needs_remediation', 'needs_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_user ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_content ON assessment_results(content_item_id);
CREATE INDEX IF NOT EXISTS idx_assessment_topic ON assessment_results(topic);

-- === 005: User Progress ===
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'needs_remediation')),
  current_depth TEXT NOT NULL DEFAULT 'beginner' CHECK (current_depth IN ('beginner', 'intermediate', 'advanced')),
  last_score NUMERIC(3,2),
  last_content_item_id UUID REFERENCES content_items(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id, skill)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_topic ON user_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_progress_status ON user_progress(status);

-- === 006: Agent Messages (Context Bus) ===
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent TEXT NOT NULL CHECK (from_agent IN ('master', 'scout', 'content_creator', 'assessment', 'learning', 'chat_ui')),
  to_agent TEXT NOT NULL CHECK (to_agent IN ('master', 'scout', 'content_creator', 'assessment', 'learning', 'chat_ui')),
  message_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON agent_messages(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_messages_from_agent ON agent_messages(from_agent);
CREATE INDEX IF NOT EXISTS idx_messages_status ON agent_messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON agent_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created ON agent_messages(created_at DESC);

-- === 007: Master Agent Log ===
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

CREATE INDEX IF NOT EXISTS idx_master_log_user ON master_agent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_master_log_intent ON master_agent_log(intent);
CREATE INDEX IF NOT EXISTS idx_master_log_created ON master_agent_log(created_at DESC);

-- ============================================================
-- Verification: List all created tables
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('topics', 'skill_map', 'content_items', 'assessment_results', 'user_progress', 'agent_messages', 'master_agent_log')
ORDER BY table_name;
