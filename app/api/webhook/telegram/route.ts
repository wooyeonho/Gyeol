import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

function verifyTelegramWebhook(req: NextRequest): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET) return true;
  const header = req.headers.get("x-telegram-bot-api-secret-token");
  return header === TELEGRAM_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyTelegramWebhook(req)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const message = body.message ?? body.edited_message;
    if (!message?.chat?.id || !message.from?.id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const chatId = message.chat.id;
    const text = String(message.text ?? "").trim().slice(0, 3000);

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const service = createServiceClient();
    const directLookup = await service
      .from("agent_state")
      .select("agent_id")
      .filter("channels->>telegram", "eq", String(chatId))
      .limit(1)
      .maybeSingle();
    let agentState = directLookup.data as { agent_id: string } | null;
    if (!agentState) {
      // Fallback for environments where json path filtering is unavailable.
      const { data: states } = await service
        .from("agent_state")
        .select("agent_id, channels")
        .limit(500);
      const matched = (states ?? []).find(
        (a) => (a.channels as Record<string, unknown>)?.telegram === String(chatId)
      ) as { agent_id: string } | undefined;
      agentState = matched ?? null;
    }
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

    if (!text) {
      return NextResponse.json({ ok: true });
    }

    let reply = "지금은 응답할 수 없어요. 잠시 후 다시 시도해 주세요.";
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
    } else {
      reply = "내부 설정이 완전하지 않아 답장을 생성할 수 없어요. 관리자 설정을 확인해 주세요.";
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply.slice(0, 4096) }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
