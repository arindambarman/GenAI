-- 005: User Progress table
-- Owner: Learning Agent
-- Tracks per-user, per-topic, per-skill learning progress

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

CREATE INDEX idx_progress_user ON user_progress(user_id);
CREATE INDEX idx_progress_topic ON user_progress(topic_id);
CREATE INDEX idx_progress_status ON user_progress(status);

COMMENT ON TABLE user_progress IS 'Learning Agent managed. Tracks user advancement through skills.';
