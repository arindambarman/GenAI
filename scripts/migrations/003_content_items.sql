-- 003: Content Items table
-- Owner: Content Creator Agent
-- Stores generated lessons with prose, MCQs, and flashcards
--
-- questions JSONB shape:
-- [{ "q": string, "options": string[], "answer": string, "explanation": string }]
--
-- flashcards JSONB shape:
-- [{ "front": string, "back": string }]

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

CREATE INDEX idx_content_items_topic ON content_items(topic_id);
CREATE INDEX idx_content_items_skill ON content_items(skill);
CREATE INDEX idx_content_items_depth ON content_items(depth);

COMMENT ON TABLE content_items IS 'Content Creator output. Structured lessons with prose, MCQs, and flashcards.';
COMMENT ON COLUMN content_items.questions IS 'JSONB array: [{ q: string, options: string[], answer: string, explanation: string }]';
COMMENT ON COLUMN content_items.flashcards IS 'JSONB array: [{ front: string, back: string }]';
