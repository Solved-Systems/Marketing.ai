-- Style Guides for Company and Product Context
-- Migration: Company-level and product-level style guides

-- Style Guides table (can be company-level or product-specific)
CREATE TABLE style_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,  -- NULL = company-level, SET = product-specific
  name TEXT NOT NULL,
  description TEXT,

  -- Brand Identity
  brand_identity JSONB DEFAULT '{}',  -- {mission, vision, values[], tagline, elevator_pitch}

  -- Target Audience
  target_audience JSONB DEFAULT '{}',  -- {demographics, pain_points[], motivations[], personas[]}

  -- Voice & Tone
  voice_and_tone JSONB DEFAULT '{}',  -- {voice_attributes[], tone_guidelines, dos[], donts[], example_phrases[]}

  -- Visual Style
  visual_style JSONB DEFAULT '{}',  -- {colors{}, typography{}, logo_guidelines, image_style, mood_keywords[]}

  -- Content Guidelines
  content_guidelines JSONB DEFAULT '{}',  -- {messaging_pillars[], key_themes[], topics_to_avoid[], hashtag_strategy, content_types[]}

  -- Competitor Context
  competitive_context JSONB DEFAULT '{}',  -- {competitors[], differentiators[], positioning}

  -- Inheritance settings (for product-level guides)
  inherit_from_company BOOLEAN DEFAULT true,  -- If true and product_id is set, inherits unset fields from company guide

  is_default BOOLEAN DEFAULT false,  -- Default company-level guide for the org
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add style_guide_id to projects for context selection
ALTER TABLE projects
  ADD COLUMN style_guide_id UUID REFERENCES style_guides(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_style_guides_organization ON style_guides(organization_id);
CREATE INDEX idx_style_guides_product ON style_guides(product_id);
CREATE INDEX idx_style_guides_is_default ON style_guides(organization_id, is_default) WHERE is_default = true AND product_id IS NULL;
CREATE INDEX idx_projects_style_guide ON projects(style_guide_id);

-- Enable Row Level Security
ALTER TABLE style_guides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Style Guides
CREATE POLICY "Users can view org style guides"
  ON style_guides FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org style guides"
  ON style_guides FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org style guides"
  ON style_guides FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org style guides"
  ON style_guides FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Updated at trigger
CREATE TRIGGER update_style_guides_updated_at
    BEFORE UPDATE ON style_guides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default company-level style guide per organization
CREATE OR REPLACE FUNCTION ensure_single_default_style_guide()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE AND NEW.product_id IS NULL THEN
        UPDATE style_guides
        SET is_default = FALSE
        WHERE organization_id = NEW.organization_id
          AND id != NEW.id
          AND product_id IS NULL
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_style_guide_trigger
    BEFORE INSERT OR UPDATE ON style_guides
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_style_guide();

-- Function to get merged style guide (product inherits from company)
CREATE OR REPLACE FUNCTION get_merged_style_guide(guide_id UUID)
RETURNS JSONB AS $$
DECLARE
    guide RECORD;
    company_guide RECORD;
    result JSONB;
BEGIN
    SELECT * INTO guide FROM style_guides WHERE id = guide_id;

    IF guide IS NULL THEN
        RETURN NULL;
    END IF;

    -- If it's a company-level guide or doesn't inherit, return as-is
    IF guide.product_id IS NULL OR guide.inherit_from_company = FALSE THEN
        RETURN jsonb_build_object(
            'id', guide.id,
            'name', guide.name,
            'description', guide.description,
            'brand_identity', guide.brand_identity,
            'target_audience', guide.target_audience,
            'voice_and_tone', guide.voice_and_tone,
            'visual_style', guide.visual_style,
            'content_guidelines', guide.content_guidelines,
            'competitive_context', guide.competitive_context,
            'is_product_level', guide.product_id IS NOT NULL
        );
    END IF;

    -- Get the default company guide for inheritance
    SELECT * INTO company_guide
    FROM style_guides
    WHERE organization_id = guide.organization_id
      AND product_id IS NULL
      AND is_default = TRUE;

    IF company_guide IS NULL THEN
        -- No company guide to inherit from
        RETURN jsonb_build_object(
            'id', guide.id,
            'name', guide.name,
            'description', guide.description,
            'brand_identity', guide.brand_identity,
            'target_audience', guide.target_audience,
            'voice_and_tone', guide.voice_and_tone,
            'visual_style', guide.visual_style,
            'content_guidelines', guide.content_guidelines,
            'competitive_context', guide.competitive_context,
            'is_product_level', TRUE
        );
    END IF;

    -- Merge: product guide values override company guide values
    RETURN jsonb_build_object(
        'id', guide.id,
        'name', guide.name,
        'description', guide.description,
        'brand_identity', company_guide.brand_identity || guide.brand_identity,
        'target_audience', company_guide.target_audience || guide.target_audience,
        'voice_and_tone', company_guide.voice_and_tone || guide.voice_and_tone,
        'visual_style', company_guide.visual_style || guide.visual_style,
        'content_guidelines', company_guide.content_guidelines || guide.content_guidelines,
        'competitive_context', company_guide.competitive_context || guide.competitive_context,
        'is_product_level', TRUE,
        'inherited_from', company_guide.id
    );
END;
$$ LANGUAGE plpgsql STABLE;
