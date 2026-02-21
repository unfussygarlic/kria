"""Add conversations, conversation_participants, and messages tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-02-17
"""

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
-- ── Conversations ──────────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL DEFAULT 'direct'
                    CHECK (type IN ('direct')),
  title           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC NULLS LAST);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Conversation participants ──────────────────────────────────────────────────

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_cp_user        ON conversation_participants (user_id);
CREATE INDEX idx_cp_conversation ON conversation_participants (conversation_id);

-- ── Messages ───────────────────────────────────────────────────────────────────

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text')),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender       ON messages (sender_id);

-- ── Trigger: update conversations.last_message_at on new message ───────────────
-- SECURITY DEFINER so it bypasses RLS when updating conversations

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at      = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                  ENABLE ROW LEVEL SECURITY;

-- conversation_participants: users see only their own rows (no circular dep)
CREATE POLICY cp_select_own ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

-- conversation_participants: users can insert themselves only
CREATE POLICY cp_insert_own ON conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- conversation_participants: users can update their own row (last_read_at)
CREATE POLICY cp_update_own ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- conversations: visible if the user is a participant
-- cp_select_own policy makes the EXISTS safe (no circular dependency)
CREATE POLICY conv_select_participant ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

-- conversations: any authenticated user may create
CREATE POLICY conv_insert_auth ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- messages: visible if user is in that conversation
CREATE POLICY msg_select_participant ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- messages: users can only insert as themselves and only into their conversations
CREATE POLICY msg_insert_participant ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- ── Supabase Realtime ──────────────────────────────────────────────────────────
-- Enable broadcast for real-time message delivery

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    """)


def downgrade() -> None:
    op.execute("""
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS messages;

DROP TRIGGER  IF EXISTS messages_update_conversation ON messages;
DROP FUNCTION IF EXISTS update_conversation_last_message();

DROP POLICY IF EXISTS msg_insert_participant    ON messages;
DROP POLICY IF EXISTS msg_select_participant    ON messages;
DROP POLICY IF EXISTS conv_insert_auth          ON conversations;
DROP POLICY IF EXISTS conv_select_participant   ON conversations;
DROP POLICY IF EXISTS cp_update_own             ON conversation_participants;
DROP POLICY IF EXISTS cp_insert_own             ON conversation_participants;
DROP POLICY IF EXISTS cp_select_own             ON conversation_participants;

DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP TABLE IF EXISTS messages;

DROP INDEX IF EXISTS idx_cp_conversation;
DROP INDEX IF EXISTS idx_cp_user;
DROP TABLE IF EXISTS conversation_participants;

DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
DROP INDEX IF EXISTS idx_conversations_last_message;
DROP TABLE IF EXISTS conversations;
    """)
