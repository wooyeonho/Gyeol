-- Phase 60: WebAuthn public key storage for biometric authentication
CREATE TABLE IF NOT EXISTS public.public_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  device_name text DEFAULT 'Unknown Device',
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_keys_user ON public.public_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_keys_credential ON public.public_keys(credential_id);

ALTER TABLE public.public_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own public keys"
  ON public.public_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own public keys"
  ON public.public_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own public keys"
  ON public.public_keys FOR DELETE
  USING (auth.uid() = user_id);
