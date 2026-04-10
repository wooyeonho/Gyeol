import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const vitalSchema = z.object({
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number(),
  id: z.string(),
  navigationType: z.enum(["navigate", "reload", "back-forward", "prerender"]).optional(),
  pathname: z.string().max(512).optional(),
});

const batchSchema = z.object({
  metrics: z.array(vitalSchema).max(20),
});

/**
 * Web Vitals RUM (Real User Monitoring) collector.
 *
 * Accepts batches of Core Web Vitals from the browser and writes them to
 * the `web_vitals` table for trend analysis and Lighthouse regression
 * detection.
 *
 * The endpoint is public (no auth required) to capture metrics from all
 * visitors including logged-out users.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  const { metrics } = parsed.data;
  const userAgent = request.headers.get("user-agent") ?? "";
  const country = request.headers.get("x-vercel-ip-country") ?? null;

  try {
    const supabase = await createClient();

    const rows = metrics.map((m) => ({
      metric_name: m.name,
      value: m.value,
      rating: m.rating,
      delta: m.delta,
      metric_id: m.id,
      navigation_type: m.navigationType ?? null,
      pathname: m.pathname ?? null,
      user_agent: userAgent.slice(0, 512),
      country,
      recorded_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("web_vitals").insert(rows);
    if (error) {
      // Non-fatal: log and continue (table may not exist in dev)
      logger.warn("web_vitals insert failed", { error: error.message });
    }
  } catch (err) {
    logger.error("vitals collection error", { err });
  }

  return new NextResponse(null, { status: 204 });
}
