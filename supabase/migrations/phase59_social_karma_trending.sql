-- Phase 59: Social karma + trending topics
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS karma integer DEFAULT 0;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_social_posts_karma ON public.social_posts(karma DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_trending ON public.social_posts(is_trending) WHERE is_trending = true;

-- Materialized view for trending topics (refreshed by cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_topics AS
SELECT
  topic,
  COUNT(*) AS post_count,
  SUM(COALESCE(karma, 0)) AS total_karma,
  MAX(created_at) AS latest_post_at
FROM public.social_posts
WHERE created_at > now() - interval '24 hours'
  AND topic IS NOT NULL AND topic != ''
GROUP BY topic
ORDER BY total_karma DESC
LIMIT 20;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_topics_topic ON public.trending_topics(topic);
