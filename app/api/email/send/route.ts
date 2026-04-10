/**
 * EMAIL_API_URL로 설정 시 recap cron이 이 엔드포인트를 호출합니다.
 * Resend로 전달하는 프록시. RESEND_API_KEY 필요.
 *
 * Contract: POST { to, subject, body } 또는 { deliveries: [{ to, subject, body }] }
 * 내부 호출 시 Authorization: Bearer CRON_SECRET 또는 X-Email-Send-Secret 검증.
 */
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logRouteError } from "@/lib/ops/logger";

const emailDeliverySchema = z.object({
  to: z.string().email().max(320),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
});

const emailSendBodySchema = z.union([
  z.object({
    deliveries: z.array(emailDeliverySchema).min(1).max(50),
  }),
  emailDeliverySchema,
]);

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "recap@resend.dev";
const CRON_SECRET = process.env.CRON_SECRET;
const EMAIL_SEND_SECRET = process.env.EMAIL_SEND_SECRET;

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const secretHeader = req.headers.get("x-email-send-secret") ?? "";
  if (CRON_SECRET && timingSafeCompare(auth, CRON_SECRET)) return true;
  if (EMAIL_SEND_SECRET && timingSafeCompare(secretHeader, EMAIL_SEND_SECRET)) return true;
  return false;
}

async function sendViaResend(to: string, subject: string, body: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text: body,
    }),
  });
  return res.ok;
}

export async function POST(request: NextRequest) {
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("email-send:internal");
  if (!rl) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = emailSendBodySchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
    }

    const parsed = result.data;
    const deliveries: Array<{ to: string; subject: string; body: string }> = "deliveries" in parsed
      ? parsed.deliveries
      : [parsed];

    const results = await Promise.all(
      deliveries.map((d) => sendViaResend(d.to, d.subject, d.body))
    );
    const sent = results.filter(Boolean).length;

    return NextResponse.json({ sent, total: deliveries.length });
  } catch (e) {
    logRouteError("POST /api/email/send error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
