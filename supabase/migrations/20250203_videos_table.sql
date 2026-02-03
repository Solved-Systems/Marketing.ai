-- Add Lambda render columns if they don't exist (for existing tables)
DO $$
BEGIN
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS render_id TEXT;
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS render_bucket TEXT;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Videos table for storing generated video metadata
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

    -- Common fields
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    quality TEXT DEFAULT 'default',

    -- Engine type: 'remotion' or 'grok-imagine'
    engine TEXT NOT NULL DEFAULT 'remotion',

    -- Remotion-specific fields
    template TEXT,
    duration TEXT,
    style TEXT,
    call_to_action TEXT,
    features TEXT[],
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT,
    brand_name TEXT,

    -- Grok Imagine-specific fields
    prompt TEXT,
    aspect_ratio TEXT,
    resolution TEXT,
    source_image_url TEXT,

    -- External API tracking (for Grok Imagine)
    external_request_id TEXT,

    -- Lambda render tracking (for Remotion)
    render_id TEXT,
    render_bucket TEXT,

    -- Output
    output_url TEXT,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_brand_id ON videos(brand_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_engine ON videos(engine);
CREATE INDEX IF NOT EXISTS idx_videos_external_request_id ON videos(external_request_id);
CREATE INDEX IF NOT EXISTS idx_videos_render_id ON videos(render_id) WHERE render_id IS NOT NULL;

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own videos
DROP POLICY IF EXISTS "Users can view own videos" ON videos;
CREATE POLICY "Users can view own videos" ON videos
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
CREATE POLICY "Users can insert own videos" ON videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON videos;
CREATE POLICY "Users can update own videos" ON videos
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
DROP POLICY IF EXISTS "Service role has full access" ON videos;
CREATE POLICY "Service role has full access" ON videos
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_videos_updated_at();
