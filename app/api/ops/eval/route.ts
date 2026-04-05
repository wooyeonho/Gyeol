import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { runEvaluation } from "@/lib/harness/eval-runner";
import type { EvalConfig } from "@/lib/harness/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<EvalConfig>;
    const config: EvalConfig = {
      runType: body.runType ?? "full",
      categories: body.categories,
      locales: body.locales,
      maxCases: body.maxCases ?? 50,
      timeoutMs: body.timeoutMs ?? 30_000,
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
