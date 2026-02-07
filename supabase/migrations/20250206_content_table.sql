-- Content table for storing all generated assets (images, videos, posts)
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

    -- Content type
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'post')),

    -- Content details
    title TEXT,
    description TEXT,
    prompt TEXT,

    -- URLs
    url TEXT,
    thumbnail_url TEXT,
    source_url TEXT, -- Original image for edits/animations

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Generation info
    engine TEXT, -- 'grok-imagine', 'openai', 'remotion', etc.
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    -- For videos
    duration INTEGER, -- in seconds
    aspect_ratio TEXT,

    -- Chat reference (if generated from chat)
    chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_brand_id ON content(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);

-- Enable RLS
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own content
DROP POLICY IF EXISTS "Users can view own content" ON content;
CREATE POLICY "Users can view own content" ON content
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own content" ON content;
CREATE POLICY "Users can insert own content" ON content
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own content" ON content;
CREATE POLICY "Users can update own content" ON content
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own content" ON content;
CREATE POLICY "Users can delete own content" ON content
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
DROP POLICY IF EXISTS "Service role has full access to content" ON content;
CREATE POLICY "Service role has full access to content" ON content
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_updated_at ON content;
CREATE TRIGGER content_updated_at
    BEFORE UPDATE ON content
    FOR EACH ROW
    EXECUTE FUNCTION update_content_updated_at();
