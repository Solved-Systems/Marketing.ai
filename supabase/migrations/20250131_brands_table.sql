-- Brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tagline TEXT,
  website_url TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#ff8c00',
  secondary_color TEXT DEFAULT '#1a1a1a',
  accent_color TEXT DEFAULT '#ffa500',
  github_repo TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brands_user_id ON brands(user_id);
CREATE INDEX idx_brands_created ON brands(created_at DESC);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Users can read their own brands
CREATE POLICY "Users can read own brands" ON brands
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own brands
CREATE POLICY "Users can insert own brands" ON brands
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own brands
CREATE POLICY "Users can update own brands" ON brands
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own brands
CREATE POLICY "Users can delete own brands" ON brands
  FOR DELETE USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access brands" ON brands
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
