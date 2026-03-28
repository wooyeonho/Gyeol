-- phase42: Enable RLS on core tables (agents, agent_state, memories, chats)
-- Previously these tables relied on app-level auth checks only.
-- Adding RLS as defense-in-depth: if service role key leaks, data remains isolated.

-- ══════════════════════════════════════════
-- agents
-- ══════════════════════════════════════════
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_owner_select"
  ON agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "agents_owner_insert"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_owner_update"
  ON agents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_owner_delete"
  ON agents FOR DELETE
  USING (auth.uid() = user_id);

-- Public read for shared/social features (only non-sensitive columns via views)
CREATE POLICY "agents_public_select_minimal"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM share_cards sc
      WHERE sc.agent_id = agents.id AND sc.is_active = true
    )
  );

-- ══════════════════════════════════════════
-- agent_state
-- ══════════════════════════════════════════
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_state_owner_select"
  ON agent_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_state.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_state_owner_insert"
  ON agent_state FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_state.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_state_owner_update"
  ON agent_state FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_state.agent_id AND a.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════
-- memories
-- ══════════════════════════════════════════
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memories_owner_select"
  ON memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "memories_owner_insert"
  ON memories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "memories_owner_update"
  ON memories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "memories_owner_delete"
  ON memories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = memories.agent_id AND a.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════
-- chats
-- ══════════════════════════════════════════
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chats_owner_select"
  ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = chats.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "chats_owner_insert"
  ON chats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = chats.agent_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "chats_owner_delete"
  ON chats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = chats.agent_id AND a.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════
-- ops_admin_roles (new table for DB-based RBAC)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ops_admin_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE ops_admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_admin_roles_self_read"
  ON ops_admin_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════
-- ops_audit_log (audit trail for admin actions)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ops_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ops_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (enforced at app level via service role)
-- No anon-key access at all
CREATE POLICY "ops_audit_log_deny_all"
  ON ops_audit_log FOR SELECT
  USING (false);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_user_id ON ops_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_created_at ON ops_audit_log(created_at DESC);
