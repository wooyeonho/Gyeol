-- Phase 6: sandbox, memory physics. Run in Supabase SQL Editor if missing.
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS sandbox JSONB DEFAULT '{}';

ALTER TABLE memories ADD COLUMN IF NOT EXISTS reference_count INTEGER DEFAULT 0;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
