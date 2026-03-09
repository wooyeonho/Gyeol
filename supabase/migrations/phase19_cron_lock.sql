-- Phase 19: cron idempotency lock

CREATE TABLE IF NOT EXISTS cron_job_locks (
  job_name TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION acquire_cron_lock(p_job_name TEXT, p_ttl_seconds INTEGER DEFAULT 300)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_until TIMESTAMPTZ := NOW() + make_interval(secs => GREATEST(1, p_ttl_seconds));
BEGIN
  INSERT INTO cron_job_locks (job_name, locked_until, updated_at)
  VALUES (p_job_name, v_until, v_now)
  ON CONFLICT (job_name)
  DO UPDATE
    SET locked_until = EXCLUDED.locked_until,
        updated_at = EXCLUDED.updated_at
  WHERE cron_job_locks.locked_until < v_now;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION release_cron_lock(p_job_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE cron_job_locks
  SET locked_until = NOW() - interval '1 second',
      updated_at = NOW()
  WHERE job_name = p_job_name;
END;
$$;
