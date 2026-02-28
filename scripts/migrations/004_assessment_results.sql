-- 004: Assessment Results table
-- Owner: Assessment Agent
-- Stores scored assessment outcomes and identified knowledge gaps
--
-- gaps JSONB shape:
-- string[] — list of skill/concept names where the user has gaps
--
-- answers JSONB shape:
-- [{ "question_index": number, "user_answer": string, "correct": boolean }]

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

CREATE INDEX idx_assessment_user ON assessment_results(user_id);
CREATE INDEX idx_assessment_content ON assessment_results(content_item_id);
CREATE INDEX idx_assessment_topic ON assessment_results(topic);

COMMENT ON TABLE assessment_results IS 'Assessment Agent output. Scored results with gap analysis.';
COMMENT ON COLUMN assessment_results.gaps IS 'JSONB string array: skill/concept names where user has gaps';
COMMENT ON COLUMN assessment_results.outcome IS 'PASS (>=0.70), PARTIAL (0.40-0.69), FAIL (<0.40)';
