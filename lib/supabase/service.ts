import { createClient } from "@supabase/supabase-js";
import { assertRequiredEnv } from "@/lib/env/required";

export function createServiceClient() {
  assertRequiredEnv(
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    "Supabase service client"
  );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env");
  return createClient(url, key);
}
