-- Support persistent authenticated MCP endpoint GUIDs
ALTER TABLE mcp_keys
  ADD COLUMN IF NOT EXISTS token_encrypted TEXT;

-- Fast lookup for the latest active GUID per user
CREATE INDEX IF NOT EXISTS idx_mcp_keys_user_active_created
  ON mcp_keys(user_id, created_at DESC)
  WHERE revoked_at IS NULL;
