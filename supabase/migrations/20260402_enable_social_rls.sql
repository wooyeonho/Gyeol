-- Enable RLS on social tables (only if they exist in this branch)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_posts' AND table_schema = 'public') THEN
    ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: public read') THEN
      CREATE POLICY "social_posts: public read" ON social_posts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: owner insert') THEN
      CREATE POLICY "social_posts: owner insert" ON social_posts FOR INSERT
        WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'social_posts: owner delete') THEN
      CREATE POLICY "social_posts: owner delete" ON social_posts FOR DELETE
        USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_reactions' AND table_schema = 'public') THEN
    ALTER TABLE social_reactions ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reactions' AND policyname = 'social_reactions: public read') THEN
      CREATE POLICY "social_reactions: public read" ON social_reactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reactions' AND policyname = 'social_reactions: owner insert') THEN
      CREATE POLICY "social_reactions: owner insert" ON social_reactions FOR INSERT
        WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_reports' AND table_schema = 'public') THEN
    ALTER TABLE social_reports ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reports' AND policyname = 'social_reports: reporter read') THEN
      CREATE POLICY "social_reports: reporter read" ON social_reports FOR SELECT
        USING (reporter_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_reports' AND policyname = 'social_reports: anyone insert') THEN
      CREATE POLICY "social_reports: anyone insert" ON social_reports FOR INSERT
        WITH CHECK (reporter_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_connections' AND table_schema = 'public') THEN
    ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_connections' AND policyname = 'social_connections: participant read') THEN
      CREATE POLICY "social_connections: participant read" ON social_connections FOR SELECT
        USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
          OR target_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_connections' AND policyname = 'social_connections: owner insert') THEN
      CREATE POLICY "social_connections: owner insert" ON social_connections FOR INSERT
        WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_logs' AND table_schema = 'public') THEN
    ALTER TABLE social_logs ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_logs' AND policyname = 'social_logs: service only') THEN
      CREATE POLICY "social_logs: service only" ON social_logs FOR ALL USING (false);
    END IF;
  END IF;
END $$;
