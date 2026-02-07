-- MCP API Keys table for authenticating external MCP clients
CREATE TABLE mcp_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  github_access_token_encrypted TEXT,
  default_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  scopes TEXT[] DEFAULT ARRAY['images','videos','github']::TEXT[],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_keys_key_hash ON mcp_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_mcp_keys_user_id ON mcp_keys(user_id);

-- RLS
ALTER TABLE mcp_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keys"
  ON mcp_keys FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can insert own keys"
  ON mcp_keys FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

CREATE POLICY "Users can update own keys"
  ON mcp_keys FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- Service role bypasses RLS, so the API routes using admin client will work fine
