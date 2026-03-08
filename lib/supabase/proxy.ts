import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

/**
 * Auth refresh helper for use in proxy.ts (Next.js 16).
 * Use with getCookieStore() from next/headers in the proxy.
 */
export async function refreshAuth(
  request: NextRequest,
  cookieStore: { getAll: () => { name: string; value: string }[]; setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void }
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
        });
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
