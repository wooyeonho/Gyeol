import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";
import { createServiceClient } from "@/lib/supabase/service";

const DEFAULT_RETENTION_DAYS = 90;

function getRetentionDays() {
  const raw = Number(process.env.PRODUCT_EVENTS_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
  if (!Number.isFinite(raw) || raw < 7) return DEFAULT_RETENTION_DAYS;
  return Math.floor(raw);
}

async function runCleanup() {
  const retentionDays = getRetentionDays();
  const cutoffIso = new Date(Date.now() - retentionDays * 24 * 3600000).toISOString();
  const service = createServiceClient();

  const { data: rowsToDelete } = await service
    .from("product_events")
    .select("id")
    .lt("created_at", cutoffIso)
    .limit(5000);

  const ids = (rowsToDelete ?? []).map((row) => (row as { id: string }).id);
  if (ids.length === 0) {
    return NextResponse.json({
      deleted: 0,
      retention_days: retentionDays,
      timestamp: new Date().toISOString(),
    });
  }

  await service.from("product_events").delete().in("id", ids);
  return NextResponse.json({
    deleted: ids.length,
    retention_days: retentionDays,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lockKey = "cron:retention";
  const acquired = await acquireCronLock(lockKey, 300);
  if (!acquired) return NextResponse.json({ deleted: 0, skipped: "lock" });

  try {
    return await runCleanup();
  } finally {
    await releaseCronLock(lockKey);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
