-- Enable RLS on social tables that were missing it
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts: public read" ON social_posts FOR SELECT USING (true);
CREATE POLICY "social_posts: owner insert" ON social_posts FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "social_posts: owner delete" ON social_posts FOR DELETE
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "social_reactions: public read" ON social_reactions FOR SELECT USING (true);
CREATE POLICY "social_reactions: owner insert" ON social_reactions FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "social_reports: reporter read" ON social_reports FOR SELECT
  USING (reporter_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "social_reports: anyone insert" ON social_reports FOR INSERT
  WITH CHECK (reporter_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "social_connections: participant read" ON social_connections FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    OR target_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "social_connections: owner insert" ON social_connections FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "social_logs: service only" ON social_logs FOR ALL USING (false);
