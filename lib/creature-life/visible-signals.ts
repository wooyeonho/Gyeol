import type { AutonomousIntent, VisibleLifeSignal } from "./types";

export function toVisibleLifeSignal(intent: AutonomousIntent | null): VisibleLifeSignal | null {
  if (!intent) return null;
  if (intent === "INITIATE_CEREMONY") return { intent, tone: "ceremony", priority: 100 };
  if (intent === "REQUEST_CARE") return { intent, tone: "urgent", priority: 80 };
  if (intent === "ASK_FOR_INPUT") return { intent, tone: "soft", priority: 70 };
  if (intent === "RECALL_MEMORY") return { intent, tone: "soft", priority: 60 };
  if (intent === "SUGGEST_PUBLIC_ACTION") return { intent, tone: "soft", priority: 50 };
  return { intent, tone: "soft", priority: 40 };
}

export function translateVisibleLifeSignal(signal: VisibleLifeSignal | null, locale: string): string | null {
  if (!signal) return null;
  const isKo = locale.startsWith("ko");
  if (signal.intent === "ASK_FOR_INPUT") return isKo ? "말을 걸고 싶어해요" : "Wants to hear from you";
  if (signal.intent === "REQUEST_CARE") return isKo ? "조금 불안정해요" : "Feels a little unstable";
  if (signal.intent === "RECALL_MEMORY") return isKo ? "무언가를 떠올렸어요" : "Something resurfaced";
  if (signal.intent === "SUGGEST_PUBLIC_ACTION") return isKo ? "밖으로 내보내고 싶어해요" : "Wants to try something public";
  if (signal.intent === "INITIATE_CEREMONY") return isKo ? "변화할 준비가 됐어요" : "Ready to change";
  return isKo ? "다음 행동을 기다려요" : "Waiting for the next step";
}
