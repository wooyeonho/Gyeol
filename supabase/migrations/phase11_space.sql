-- Phase 11: room (3D space), channels (multichannel)
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS room JSONB DEFAULT '{"objects":[],"layout":"default","theme":"dark"}';
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '{"telegram":null,"email":null,"push_enabled":false}';
