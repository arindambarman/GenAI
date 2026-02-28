-- 006: Agent Messages table (Context Bus)
-- Owner: System — ALL agents read and write
-- This is the Context Bus. Agents INSERT to dispatch; receivers poll and mark done.
--
-- payload JSONB shape: varies by message_type — validated by Zod at agent level
--
-- Status lifecycle: pending → processing → done | failed

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

CREATE INDEX idx_messages_to_agent ON agent_messages(to_agent, status);
CREATE INDEX idx_messages_from_agent ON agent_messages(from_agent);
CREATE INDEX idx_messages_status ON agent_messages(status);
CREATE INDEX idx_messages_type ON agent_messages(message_type);
CREATE INDEX idx_messages_created ON agent_messages(created_at DESC);

COMMENT ON TABLE agent_messages IS 'Context Bus. ALL inter-agent communication flows through this table. No direct imports.';
COMMENT ON COLUMN agent_messages.status IS 'Lifecycle: pending → processing → done | failed';
