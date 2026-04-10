import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { runEvaluation } from "@/lib/harness/eval-runner";
import type { EvalConfig } from "@/lib/harness/types";
import { z } from "zod";

const evalBodySchema = z.object({
  runType: z.enum(["full", "quick", "smoke"]).optional().default("full"),
  categories: z.array(z.string().max(50)).optional(),
  locales: z.array(z.string().max(10)).optional(),
  maxCases: z.number().int().min(1).max(500).optional().default(50),
  timeoutMs: z.number().int().min(1000).max(120_000).optional().default(30_000),
});

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = evalBodySchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const config: EvalConfig = {
      runType: parsed.data.runType,
      categories: parsed.data.categories,
      locales: parsed.data.locales,
      maxCases: parsed.data.maxCases,
      timeoutMs: parsed.data.timeoutMs,
    };

    const result = await runEvaluation(config);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eval failed" },
      { status: 500 },
    );
  }
}
