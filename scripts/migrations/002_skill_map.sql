-- 002: Skill Map table
-- Owner: Scout Agent
-- Stores research output — skills in demand for each topic with demand scores
--
-- skills JSONB shape:
-- [{ "skill": string, "demand_score": number (0-1), "level": "beginner"|"intermediate"|"advanced" }]

CREATE TABLE IF NOT EXISTS skill_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  skills JSONB NOT NULL DEFAULT '[]',
  source_summary TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_map_topic ON skill_map(topic_id);
CREATE INDEX idx_skill_map_generated ON skill_map(generated_at DESC);

COMMENT ON TABLE skill_map IS 'Scout Agent output. Each row is a point-in-time snapshot of skills in demand for a topic.';
COMMENT ON COLUMN skill_map.skills IS 'JSONB array: [{ skill: string, demand_score: number(0-1), level: beginner|intermediate|advanced }]';
