import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logRouteError } from "@/lib/ops/logger";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

export async function POST(req: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ ok: true });
    }

    if (!TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Service not configured" }, { status: 503 });
    }
    const providedSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (providedSecret !== TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const message = body.message ?? body.edited_message;
    if (!message?.chat?.id || !message.from?.id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const chatId = message.chat.id;
    const text = (message.text ?? "").trim();

    const service = createServiceClient();
    const { data: states } = await service
      .from("agent_state")
      .select("agent_id, channels")
      .limit(500);
    const agentState = (states ?? []).find(
      (a) => (a.channels as Record<string, unknown>)?.telegram === String(chatId)
    );
    if (!agentState) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Link your Gyeol first in app Settings > Telegram.",
        }),
      }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    if (text === "/start" || text === "/help") {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Send a message and your Gyeol will reply.",
        }),
      }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    let reply = "I could not respond right now.";
    if (CRON_SECRET && APP_URL) {
      const internalRes = await fetch(`${APP_URL}/api/chat/internal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ agent_id: agentState.agent_id, message: text }),
      });
      if (internalRes.ok) {
        const data = await internalRes.json().catch(() => ({}));
        if (data.reply) reply = data.reply;
      }
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply.slice(0, 4096) }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    logRouteError("Telegram webhook error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
