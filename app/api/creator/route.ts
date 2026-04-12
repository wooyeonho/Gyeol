import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { creatorSubmitBodySchema, parseBody } from "@/lib/validation/schemas";
import { validateSubmission, calculateCreatorTier, calculateEarnings } from "@/lib/creator/content-studio";

/**
 * GET /api/creator — Get creator profile + content list.
 */
export async function GET() {
  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const { data: content } = await service
    .from("creator_content")
    .select("id, type, title, status, price, downloads, rating, rating_count, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const items = content ?? [];
  const totalDownloads = items.reduce((sum, c) => sum + (c.downloads ?? 0), 0);
  const totalRatings = items.reduce((sum, c) => sum + (c.rating_count ?? 0), 0);
  const avgRating = totalRatings > 0
    ? items.reduce((sum, c) => sum + (c.rating ?? 0) * (c.rating_count ?? 0), 0) / totalRatings
    : 0;

  const tier = calculateCreatorTier(totalDownloads, items.length, avgRating);

  return NextResponse.json({
    profile: {
      tier,
      totalDownloads,
      contentCount: items.length,
      avgRating: Math.round(avgRating * 10) / 10,
    },
    content: items,
  });
}

/**
 * POST /api/creator — Submit new content.
 * Body: { title, description, type, price, content }
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`creator:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = await parseBody(req, creatorSubmitBodySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { title, description, type, price, content } = parsed.data;

  // Validate content
  const validation = validateSubmission({ title, description, type });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join("; ") }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: inserted, error } = await service
    .from("creator_content")
    .insert({
      creator_id: user.id,
      title,
      description,
      type,
      price: price ?? 0,
      content: content ?? {},
      status: "submitted",
      downloads: 0,
      rating: 0,
      rating_count: 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit content" }, { status: 500 });
  }

  // Calculate potential earnings for the creator
  const { data: existingContent } = await service
    .from("creator_content")
    .select("downloads, rating, rating_count")
    .eq("creator_id", user.id);

  const items = existingContent ?? [];
  const totalDownloads = items.reduce((sum, c) => sum + (c.downloads ?? 0), 0);
  const tier = calculateCreatorTier(totalDownloads, items.length, 0);
  const earnings = calculateEarnings(price ?? 0, tier);

  return NextResponse.json({
    id: inserted?.id,
    status: "submitted",
    estimatedEarnings: earnings.creatorEarnings,
  });
}
