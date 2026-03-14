import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasRequiredEnv } from "@/lib/env/required";
import { logWarn } from "@/lib/ops/logger";

export async function createClient() {
  return createServerSupabase();
}

export async function createServerSupabase() {
  if (!hasRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])) {
    logWarn("Supabase server env missing – returning null");
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              logWarn("Failed to persist Supabase server cookie", {
                cookie: name,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          });
        },
      },
    }
  );
}

export async function createServiceSupabase() {
  if (!hasRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) {
    logWarn("Supabase service env missing – returning null");
    return null;
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
