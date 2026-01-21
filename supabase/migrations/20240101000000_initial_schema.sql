-- VideoForge Database Schema
-- Initial migration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (video collections)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  brand_config JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets (uploaded files)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Templates
CREATE TABLE video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  composition_id TEXT NOT NULL,
  duration_frames INT NOT NULL,
  fps INT DEFAULT 30,
  width INT DEFAULT 1920,
  height INT DEFAULT 1080,
  input_schema JSONB NOT NULL,
  preview_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video Jobs
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES video_templates(id),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'rendering', 'completed', 'failed', 'cancelled'
  )),
  input_props JSONB NOT NULL,
  output_url TEXT,
  render_id TEXT,
  progress DECIMAL(5,2) DEFAULT 0,
  error_message TEXT,
  render_metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- GitHub Connections
CREATE TABLE github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  installation_id BIGINT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('user', 'organization')),
  account_login TEXT NOT NULL,
  account_avatar_url TEXT,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watched Repositories
CREATE TABLE watched_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_connection_id UUID NOT NULL REFERENCES github_connections(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repo_full_name TEXT NOT NULL,
  repo_id BIGINT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  watch_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(github_connection_id, repo_id)
);

-- GitHub Events (webhook payloads)
CREATE TABLE github_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watched_repository_id UUID NOT NULL REFERENCES watched_repositories(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  video_job_id UUID REFERENCES video_jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Media Accounts
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'tiktok', 'instagram')),
  account_id TEXT NOT NULL,
  account_name TEXT,
  account_handle TEXT,
  avatar_url TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, platform, account_id)
);

-- Publish Queue
CREATE TABLE publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_job_id UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'uploading', 'published', 'failed'
  )),
  caption TEXT,
  hashtags TEXT[],
  scheduled_for TIMESTAMPTZ,
  platform_post_id TEXT,
  platform_url TEXT,
  error_message TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Activity Log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_video_jobs_project ON video_jobs(project_id);
CREATE INDEX idx_video_jobs_status ON video_jobs(status);
CREATE INDEX idx_github_events_repository ON github_events(watched_repository_id);
CREATE INDEX idx_publish_queue_status ON publish_queue(status);
CREATE INDEX idx_activity_log_organization ON activity_log(organization_id);

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies

-- Organizations: Users can only see their own org
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = auth.user_organization_id());

CREATE POLICY "Users can update own organization"
  ON organizations FOR UPDATE
  USING (id = auth.user_organization_id());

-- Users: Users can view members of their organization
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (organization_id = auth.user_organization_id() OR id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert self"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Projects: Users can CRUD projects in their org
CREATE POLICY "Users can view org projects"
  ON projects FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org projects"
  ON projects FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org projects"
  ON projects FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org projects"
  ON projects FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Assets: Users can manage assets in their org's projects
CREATE POLICY "Users can view org assets"
  ON assets FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can create org assets"
  ON assets FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can delete org assets"
  ON assets FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = auth.user_organization_id()
    )
  );

-- Video Templates: Public templates + own org templates
CREATE POLICY "Users can view accessible templates"
  ON video_templates FOR SELECT
  USING (
    is_public = TRUE
    OR organization_id IS NULL
    OR organization_id = auth.user_organization_id()
  );

CREATE POLICY "Users can create org templates"
  ON video_templates FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org templates"
  ON video_templates FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org templates"
  ON video_templates FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Video Jobs: Users can manage jobs in their org's projects
CREATE POLICY "Users can view org video jobs"
  ON video_jobs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can create org video jobs"
  ON video_jobs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can update org video jobs"
  ON video_jobs FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = auth.user_organization_id()
    )
  );

-- GitHub Connections
CREATE POLICY "Users can view org github connections"
  ON github_connections FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org github connections"
  ON github_connections FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org github connections"
  ON github_connections FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org github connections"
  ON github_connections FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Watched Repositories
CREATE POLICY "Users can view org watched repos"
  ON watched_repositories FOR SELECT
  USING (
    github_connection_id IN (
      SELECT id FROM github_connections WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can create org watched repos"
  ON watched_repositories FOR INSERT
  WITH CHECK (
    github_connection_id IN (
      SELECT id FROM github_connections WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can delete org watched repos"
  ON watched_repositories FOR DELETE
  USING (
    github_connection_id IN (
      SELECT id FROM github_connections WHERE organization_id = auth.user_organization_id()
    )
  );

-- GitHub Events
CREATE POLICY "Users can view org github events"
  ON github_events FOR SELECT
  USING (
    watched_repository_id IN (
      SELECT wr.id FROM watched_repositories wr
      JOIN github_connections gc ON gc.id = wr.github_connection_id
      WHERE gc.organization_id = auth.user_organization_id()
    )
  );

-- Social Accounts
CREATE POLICY "Users can view org social accounts"
  ON social_accounts FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org social accounts"
  ON social_accounts FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update org social accounts"
  ON social_accounts FOR UPDATE
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can delete org social accounts"
  ON social_accounts FOR DELETE
  USING (organization_id = auth.user_organization_id());

-- Publish Queue
CREATE POLICY "Users can view org publish queue"
  ON publish_queue FOR SELECT
  USING (
    video_job_id IN (
      SELECT vj.id FROM video_jobs vj
      JOIN projects p ON p.id = vj.project_id
      WHERE p.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can create org publish queue"
  ON publish_queue FOR INSERT
  WITH CHECK (
    video_job_id IN (
      SELECT vj.id FROM video_jobs vj
      JOIN projects p ON p.id = vj.project_id
      WHERE p.organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can update org publish queue"
  ON publish_queue FOR UPDATE
  USING (
    video_job_id IN (
      SELECT vj.id FROM video_jobs vj
      JOIN projects p ON p.id = vj.project_id
      WHERE p.organization_id = auth.user_organization_id()
    )
  );

-- Activity Log
CREATE POLICY "Users can view org activity log"
  ON activity_log FOR SELECT
  USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can create org activity log"
  ON activity_log FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id());

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_connections_updated_at
    BEFORE UPDATE ON github_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_accounts_updated_at
    BEFORE UPDATE ON social_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default system templates
INSERT INTO video_templates (name, description, composition_id, duration_frames, fps, width, height, input_schema, is_public)
VALUES
  (
    'Feature Announcement',
    'Announce new features with animated text and icons',
    'FeatureAnnouncement',
    300,
    30,
    1920,
    1080,
    '{"type":"object","properties":{"title":{"type":"string"},"subtitle":{"type":"string"},"features":{"type":"array","items":{"type":"object","properties":{"icon":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"}}}},"brandColors":{"type":"object","properties":{"primary":{"type":"string"},"secondary":{"type":"string"},"background":{"type":"string"}}},"logoUrl":{"type":"string"},"ctaText":{"type":"string"},"ctaUrl":{"type":"string"}}}'::jsonb,
    TRUE
  ),
  (
    'Product Showcase',
    'Showcase your product with dynamic visuals',
    'ProductShowcase',
    450,
    30,
    1920,
    1080,
    '{"type":"object","properties":{"productName":{"type":"string"},"tagline":{"type":"string"},"images":{"type":"array","items":{"type":"string"}},"features":{"type":"array","items":{"type":"string"}},"brandColors":{"type":"object","properties":{"primary":{"type":"string"},"secondary":{"type":"string"}}},"ctaText":{"type":"string"}}}'::jsonb,
    TRUE
  ),
  (
    'Social Promo',
    'Short promotional video for social media',
    'SocialPromo',
    150,
    30,
    1080,
    1080,
    '{"type":"object","properties":{"headline":{"type":"string"},"subheadline":{"type":"string"},"backgroundImage":{"type":"string"},"logoUrl":{"type":"string"},"brandColor":{"type":"string"}}}'::jsonb,
    TRUE
  );
