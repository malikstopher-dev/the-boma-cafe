-- Staff Profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'kitchen', 'waiter')),
  avatar_url TEXT,
  phone TEXT,
  on_duty BOOLEAN DEFAULT false,
  online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read all profiles"
  ON staff_profiles FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert own profile"
  ON staff_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update own profile"
  ON staff_profiles FOR UPDATE
  USING (user_id = current_setting('app.staff_user_id', true)::TEXT);

-- Staff Conversations
CREATE TABLE IF NOT EXISTS staff_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view conversations"
  ON staff_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_conversation_members
      WHERE conversation_id = id
      AND user_id = current_setting('app.staff_user_id', true)::TEXT
    )
  );

CREATE POLICY "Members can create conversations"
  ON staff_conversations FOR INSERT
  WITH CHECK (true);

-- Staff Conversation Members
CREATE TABLE IF NOT EXISTS staff_conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE staff_conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view members"
  ON staff_conversation_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_conversation_members scm
      WHERE scm.conversation_id = conversation_id
      AND scm.user_id = current_setting('app.staff_user_id', true)::TEXT
    )
  );

CREATE POLICY "Members can add members"
  ON staff_conversation_members FOR INSERT
  WITH CHECK (true);

-- Staff Messages
CREATE TABLE IF NOT EXISTS staff_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'system')),
  voice_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read messages"
  ON staff_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_conversation_members
      WHERE conversation_id = staff_messages.conversation_id
      AND user_id = current_setting('app.staff_user_id', true)::TEXT
    )
  );

CREATE POLICY "Members can send messages"
  ON staff_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_conversation_members
      WHERE conversation_id = staff_messages.conversation_id
      AND user_id = current_setting('app.staff_user_id', true)::TEXT
    )
  );

-- Staff Notifications
CREATE TABLE IF NOT EXISTS staff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON staff_notifications FOR SELECT
  USING (user_id = current_setting('app.staff_user_id', true)::TEXT);

CREATE POLICY "Users can update own notifications"
  ON staff_notifications FOR UPDATE
  USING (user_id = current_setting('app.staff_user_id', true)::TEXT);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_messages_conversation ON staff_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_staff_conversation_members_user ON staff_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_user ON staff_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON staff_profiles(role);
