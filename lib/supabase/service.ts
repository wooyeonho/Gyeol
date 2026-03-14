import { createClient } from "@supabase/supabase-js";
import { hasRequiredEnv } from "@/lib/env/required";

export function createServiceClient() {
  if (!hasRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) {
    console.warn("[Supabase] Missing service role env. Returning null.");
    return null;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
