import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeAutonomyHealthScore } from "@/lib/ops/health-score";
import { isOpsAdminUser } from "@/lib/security/ops-access";

const REQUIRED_ENV_KEYS = [
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "CONNECTION_TOKEN_KEY",
  "TELEGRAM_WEBHOOK_SECRET",
  "GROQ_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type EnvStatus = {
  key: string;
  configured: boolean;
};

export async function GET(request?: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cronSecret = process.env.CRON_SECRET;
  const auth = request?.headers.get("authorization")?.replace("Bearer ", "");
  const cronAuthorized = Boolean(cronSecret && auth === cronSecret);
  if (!user && !cronAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!cronAuthorized && !isOpsAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const service = createServiceClient();
    const [statesRes, locksRes] = await Promise.all([
      service.from("agent_state").select("config, last_heartbeat_at, last_dream_at, status"),
      service
        .from("cron_job_locks")
        .select("job_name, updated_at")
        .in("job_name", [
          "cron:heartbeat",
          "cron:time-capsule",
          "cron:retention",
          "cron:social",
          "cron:learner",
          "cron:crawl",
          "cron:dream",
          "cron:world",
          "cron:lifeline",
          "cron:recap",
        ]),
    ]);

    let recentAlerts: Array<{
      level: string;
      source: string;
      code: string;
      message: string;
      created_at: string;
    }> = [];
    const alertSummary24h = {
      total: 0,
      info: 0,
      warning: 0,
      critical: 0,
    };
    try {
      const [alertsRes, alerts24hRes] = await Promise.all([
        service
          .from("system_alerts")
          .select("level, source, code, message, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        service
          .from("system_alerts")
          .select("level, created_at")
          .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString()),
      ]);

      recentAlerts = (alertsRes.data ?? []) as Array<{
        level: string;
        source: string;
        code: string;
        message: string;
        created_at: string;
      }>;
      const alerts24h = (alerts24hRes.data ?? []) as Array<{ level?: string }>;
      for (const row of alerts24h) {
        const level = String(row.level ?? "warning");
        alertSummary24h.total += 1;
        if (level === "critical") alertSummary24h.critical += 1;
        else if (level === "info") alertSummary24h.info += 1;
        else alertSummary24h.warning += 1;
      }
    } catch (e) {
      console.error("ops/readiness alert lookup", e);
    }

    const states = (statesRes.data ?? []) as Array<{
      config?: Record<string, unknown> | null;
      last_heartbeat_at?: string | null;
      last_dream_at?: string | null;
      status?: string | null;
    }>;
    const now = Date.now();
    const staleHeartbeat6h = states.filter((s) => !s.last_heartbeat_at || now - new Date(s.last_heartbeat_at).getTime() > 6 * 3600000).length;
    const staleDream24h = states.filter((s) => !s.last_dream_at || now - new Date(s.last_dream_at).getTime() > 24 * 3600000).length;
    const echoCount = states.filter((s) => s.status === "echo").length;

    const locks = (locksRes.data ?? []) as Array<{ job_name: string; updated_at: string }>;
    const staleCronJobs = locks.filter((lock) => {
      const updated = new Date(lock.updated_at).getTime();
      return Number.isNaN(updated) || now - updated > 24 * 3600000;
    }).length;

    const autonomy = computeAutonomyHealthScore({
      totalAgents: states.length,
      staleHeartbeat6h,
      staleDream24h,
      echoAgents: echoCount,
      staleCronJobs,
      totalCronJobs: 9,
    });

    const envStatus: EnvStatus[] = REQUIRED_ENV_KEYS.map((key) => ({
      key,
      configured: Boolean(process.env[key]),
    }));
    const missingEnv = envStatus.filter((e) => !e.configured).map((e) => e.key);

    const recommendations: string[] = [];
    if (missingEnv.length > 0) {
      recommendations.push(`필수 환경변수 누락: ${missingEnv.join(", ")}`);
    }
    const stripeConfigured = Boolean(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_PRO &&
      process.env.STRIPE_PRICE_PREMIUM
    );
    if (!stripeConfigured) {
      recommendations.push("Stripe 실결제가 아직 구성되지 않았습니다.");
    }
    if (autonomy.tier !== "healthy") {
      recommendations.push(...autonomy.reasons);
    }
    if (recentAlerts.some((a) => a.level === "critical")) {
      recommendations.push("최근 critical 경보가 있습니다. 대시보드에서 원인을 확인하세요.");
    }

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      env_status: envStatus,
      stripe_configured: stripeConfigured,
      autonomy_health: autonomy,
      stale_counts: {
        stale_heartbeat_6h: staleHeartbeat6h,
        stale_dream_24h: staleDream24h,
        echo_count: echoCount,
        stale_cron_jobs_24h: staleCronJobs,
      },
      alert_summary_24h: alertSummary24h,
      recent_alerts: recentAlerts,
      recommendations,
    });
  } catch (e) {
    console.error("ops/readiness GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
