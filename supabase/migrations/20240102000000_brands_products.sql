-- MRKTCMD Multi-Brand Architecture
-- Migration: Brands, Products, and Content Drafts

-- Brands table (org can have multiple brands)
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  brand_colors JSONB DEFAULT '{}',  -- {primary, secondary, accent, background}
  tagline TEXT,
  website_url TEXT,
  social_handles JSONB DEFAULT '{}', -- {linkedin, twitter, instagram, tiktok}
  is_default BOOLEAN DEFAULT false,  -- Main brand for the org
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products within brands
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tagline TEXT,
  product_images JSONB DEFAULT '[]',  -- Array of image URLs
  features JSONB DEFAULT '[]',        -- Array of feature objects {icon, title, description}
  pricing TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content drafts (videos, images, posts before publishing)
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image', 'post')),
  title TEXT,
  content JSONB NOT NULL,  -- Type-specific content data
  ai_prompt TEXT,          -- Original prompt used
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published')),
  scheduled_for TIMESTAMPTZ,  -- When to publish (for scheduling)
  platforms JSONB DEFAULT '[]', -- Platforms to publish to
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_brands_organization ON brands(organization_id);
CREATE INDEX idx_brands_is_default ON brands(organization_id, is_default) WHERE is_default = true;
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_content_drafts_organization ON content_drafts(organization_id);
CREATE INDEX idx_content_drafts_brand ON content_drafts(brand_id);
CREATE INDEX idx_content_drafts_status ON content_drafts(status);
CREATE INDEX idx_content_drafts_scheduled ON content_drafts(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Brands
CREATE POLICY "Users can view org brands"
  ON brands FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org brands"
  ON brands FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org brands"
  ON brands FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org brands"
  ON brands FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- RLS Policies for Products (scoped through brands)
CREATE POLICY "Users can view org products"
  ON products FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can create org products"
  ON products FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can update org products"
  ON products FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can delete org products"
  ON products FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE organization_id = auth.user_organization_id()
    )
  );

-- RLS Policies for Content Drafts
CREATE POLICY "Users can view org content drafts"
  ON content_drafts FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org content drafts"
  ON content_drafts FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org content drafts"
  ON content_drafts FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org content drafts"
  ON content_drafts FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Updated at triggers
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_drafts_updated_at
    BEFORE UPDATE ON content_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default brand per organization
CREATE OR REPLACE FUNCTION ensure_single_default_brand()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE brands
        SET is_default = FALSE
        WHERE organization_id = NEW.organization_id
          AND id != NEW.id
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_brand_trigger
    BEFORE INSERT OR UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_brand();

-- Add brand_id to watched_repositories for GitHub integration
ALTER TABLE watched_repositories
  ADD COLUMN brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Update publish_queue to support content_drafts
ALTER TABLE publish_queue
  ADD COLUMN content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE,
  ALTER COLUMN video_job_id DROP NOT NULL;

-- Add constraint: either video_job_id or content_draft_id must be set
ALTER TABLE publish_queue
  ADD CONSTRAINT publish_queue_content_check
  CHECK (video_job_id IS NOT NULL OR content_draft_id IS NOT NULL);
