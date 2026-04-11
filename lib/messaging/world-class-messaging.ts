/**
 * World-class messaging patterns — from 10+ top messengers.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.16):
 *   iMessage, WhatsApp, Telegram, KakaoTalk, Signal, LINE, Messenger,
 *   WeChat, Discord DM, iMessage Tapback.
 */

export type MessagingPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const MESSAGING_PRINCIPLES: readonly MessagingPrinciple[] = [
  { id: "message-effects", source: "iMessage", rule: "Message bubbles support send-time effects (confetti, echo, slam) that play on arrival." },
  { id: "global-e2e", source: "WhatsApp", rule: "End-to-end encryption is default, not an advanced setting." },
  { id: "bot-ecosystem", source: "Telegram", rule: "Bots are first-class participants and can be mentioned like users." },
  { id: "sticker-economy", source: "KakaoTalk / LINE", rule: "Stickers have creator economies with paid packs and themed sets." },
  { id: "privacy-extreme", source: "Signal", rule: "Default disappearing timers exist for every thread — user picks default when signing up." },
  { id: "inline-game", source: "Messenger", rule: "Small games embed inside conversations and share scores back to the thread." },
  { id: "super-app", source: "WeChat", rule: "Payments, mini-apps, and public accounts live inside the messenger surface." },
  { id: "voice-plus-text", source: "Discord DM", rule: "Voice and text are not separate tabs — voice lives in the same thread." },
  { id: "tapback-reaction", source: "iMessage Tapback", rule: "Long-press → quick reaction palette; one tap, no modal." },
  { id: "channel", source: "Telegram / KakaoTalk", rule: "Channels broadcast one-to-many; separate posting permissions from reading." },
] as const;

/* ── Message effect registry ────────────────────────────────────────── */

export type MessageEffect =
  | "none"
  | "confetti"
  | "spark"
  | "slam"
  | "echo"
  | "invisible-ink"
  | "gentle";

export const MESSAGE_EFFECTS: Record<MessageEffect, { label: string; durationMs: number }> = {
  none: { label: "기본", durationMs: 0 },
  confetti: { label: "축하", durationMs: 1500 },
  spark: { label: "반짝", durationMs: 900 },
  slam: { label: "쾅", durationMs: 600 },
  echo: { label: "메아리", durationMs: 1800 },
  "invisible-ink": { label: "보이지 않는 잉크", durationMs: 0 },
  gentle: { label: "부드러운", durationMs: 700 },
};

/* ── Tapback reactions ──────────────────────────────────────────────── */

export type Tapback = "heart" | "thumb" | "laugh" | "wow" | "sad" | "question";

export function toggleTapback(
  current: readonly Tapback[],
  incoming: Tapback,
): Tapback[] {
  if (current.includes(incoming)) return current.filter((t) => t !== incoming);
  return [...current, incoming];
}

/* ── Disappearing timer ─────────────────────────────────────────────── */

export type DisappearPreset = "off" | "5min" | "1hr" | "1day" | "1week";

export const DISAPPEAR_SECONDS: Record<DisappearPreset, number> = {
  off: 0,
  "5min": 300,
  "1hr": 3600,
  "1day": 86_400,
  "1week": 604_800,
};

export function isExpired(
  sentAt: number,
  preset: DisappearPreset,
  now: number,
): boolean {
  if (preset === "off") return false;
  return now - sentAt >= DISAPPEAR_SECONDS[preset] * 1000;
}

/* ── Bot mention parser ─────────────────────────────────────────────── */

/** Extract bot names from a message like "@gyeol hi @bob" -> ["gyeol","bob"]. */
export function extractMentions(text: string): string[] {
  const out: string[] = [];
  const re = /@([a-zA-Z0-9_]{2,32})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}
