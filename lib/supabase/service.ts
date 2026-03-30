import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertRequiredEnv } from "@/lib/env/required";

// Singleton: reuse the same service-role client across all calls within a
// single serverless invocation. Avoids creating 6-10 clients per chat request
// and reduces Supabase connection pressure under concurrent load.
let _singleton: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient {
  if (_singleton) return _singleton;
  assertRequiredEnv(
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    "Supabase service client"
  );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env");
  _singleton = createClient(url, key);
  return _singleton;
}
