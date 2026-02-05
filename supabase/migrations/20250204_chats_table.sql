-- Content creation chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Chat',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_brand_id ON chats(brand_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Users can read their own chats
DROP POLICY IF EXISTS "Users can read own chats" ON chats;
CREATE POLICY "Users can read own chats" ON chats
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own chats
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
CREATE POLICY "Users can insert own chats" ON chats
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own chats
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
CREATE POLICY "Users can update own chats" ON chats
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own chats
DROP POLICY IF EXISTS "Users can delete own chats" ON chats;
CREATE POLICY "Users can delete own chats" ON chats
  FOR DELETE USING (user_id = auth.uid());

-- Service role full access
DROP POLICY IF EXISTS "Service role full access chats" ON chats;
CREATE POLICY "Service role full access chats" ON chats
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated at trigger
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
