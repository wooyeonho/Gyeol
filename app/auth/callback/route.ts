import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { applyInviteCodeForUser } from "@/lib/invite/apply";
import { logger } from "@/lib/logger";

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNextPath(url.searchParams.get("next"));
  const ref = url.searchParams.get("ref");
  const flow = url.searchParams.get("flow") === "signup" ? "signup" : "login";

  if (!code) {
    return NextResponse.redirect(new URL(`/${flow}?error=missing_oauth_code`, request.url));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/${flow}?error=oauth_exchange_failed`, request.url));
  }

  if (ref) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await applyInviteCodeForUser(createServiceClient(), user.id, ref);
      }
    } catch (inviteError) {
      logger.error("GET /auth/callback invite apply error", inviteError instanceof Error ? inviteError : { detail: String(inviteError) });
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
