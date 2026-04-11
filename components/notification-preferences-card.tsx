"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { useTranslations } from "@/components/i18n-provider";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  readNotificationPreferences,
  writeNotificationPreferences,
  type NotificationCategory,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";

type Copy = Record<string, { title: string; subtitle: string; quietTitle: string; quietBody: string; quietFrom: string; quietTo: string; rows: Record<NotificationCategory, { label: string; hint: string }>; }>;

const COPY: Copy = {
  ko: {
    title: "알림",
    subtitle: "어떤 순간에 알림을 받을지 정할 수 있어요.",
    quietTitle: "방해 금지 시간",
    quietBody: "이 시간대에는 푸시 알림을 보내지 않아요.",
    quietFrom: "시작",
    quietTo: "종료",
    rows: {
      streak:      { label: "🔥 스트릭 알림",    hint: "불꽃이 꺼지기 전에 알려줄게요." },
      proactive:   { label: "💬 생명체 말걸기",   hint: "생명체가 먼저 말을 걸 때." },
      social:      { label: "👥 소셜 활동",      hint: "팔로우, 트라이브, 답글." },
      achievement: { label: "🏆 업적 & 레벨업",  hint: "새 뱃지를 얻거나 레벨이 오를 때." },
      events:      { label: "✨ 이벤트 & Wrapped", hint: "시즌 이벤트와 주간 요약." },
    },
  },
  en: {
    title: "Notifications",
    subtitle: "Pick which moments deserve a ping.",
    quietTitle: "Quiet Hours",
    quietBody: "We won't send push notifications during this window.",
    quietFrom: "From",
    quietTo: "To",
    rows: {
      streak:      { label: "🔥 Streak reminders",    hint: "Ping before your flame expires." },
      proactive:   { label: "💬 Creature reach-outs", hint: "When your creature starts a chat." },
      social:      { label: "👥 Social activity",     hint: "Follows, tribes, replies." },
      achievement: { label: "🏆 Achievements & level-ups", hint: "New badges or evolutions." },
      events:      { label: "✨ Events & Wrapped",     hint: "Seasonal events and weekly recap." },
    },
  },
  ja: {
    title: "通知",
    subtitle: "どの瞬間に通知を受け取るか選べます。",
    quietTitle: "おやすみ時間",
    quietBody: "この時間帯はプッシュ通知を送りません。",
    quietFrom: "開始",
    quietTo: "終了",
    rows: {
      streak:      { label: "🔥 ストリーク通知",    hint: "炎が消える前にお知らせ。" },
      proactive:   { label: "💬 生き物からの話しかけ", hint: "生き物から会話を始めるとき。" },
      social:      { label: "👥 ソーシャル活動",     hint: "フォロー、トライブ、返信。" },
      achievement: { label: "🏆 実績 & レベルアップ", hint: "新しいバッジや進化時。" },
      events:      { label: "✨ イベント & Wrapped", hint: "季節イベントと週間まとめ。" },
    },
  },
  zh: {
    title: "通知",
    subtitle: "选择你想接收通知的时刻。",
    quietTitle: "勿扰时间",
    quietBody: "此时段内我们不会发送推送通知。",
    quietFrom: "开始",
    quietTo: "结束",
    rows: {
      streak:      { label: "🔥 连续打卡提醒", hint: "火焰熄灭前提醒你。" },
      proactive:   { label: "💬 生命体主动对话", hint: "生命体主动发起对话时。" },
      social:      { label: "👥 社交动态",     hint: "关注、部落、回复。" },
      achievement: { label: "🏆 成就与升级",   hint: "获得新徽章或进化时。" },
      events:      { label: "✨ 活动与年度回顾", hint: "季节活动与周报。" },
    },
  },
  es: {
    title: "Notificaciones",
    subtitle: "Elige qué momentos merecen una alerta.",
    quietTitle: "Horas de silencio",
    quietBody: "No enviaremos notificaciones durante este horario.",
    quietFrom: "Desde",
    quietTo: "Hasta",
    rows: {
      streak:      { label: "🔥 Recordatorios de racha", hint: "Aviso antes de que tu llama expire." },
      proactive:   { label: "💬 Mensajes espontáneos",   hint: "Cuando tu criatura inicia un chat." },
      social:      { label: "👥 Actividad social",       hint: "Seguidores, tribus, respuestas." },
      achievement: { label: "🏆 Logros y niveles",       hint: "Nuevas insignias o evoluciones." },
      events:      { label: "✨ Eventos y Wrapped",       hint: "Eventos y resumen semanal." },
    },
  },
};

const CATEGORIES: NotificationCategory[] = ["streak", "proactive", "social", "achievement", "events"];

function Toggle({ on, onChange, ariaLabel }: { on: boolean; onChange: (next: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-emerald-400/80" : "bg-white/15"}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-lg ${on ? "right-0.5" : "left-0.5"}`}
      />
    </button>
  );
}

export function NotificationPreferencesCard() {
  const { locale } = useTranslations();
  const loc = (["ko", "en", "ja", "zh", "es"].includes(locale) ? locale : "en") as keyof typeof COPY;
  const copy = COPY[loc];

  // Lazy init — reads from localStorage only on first client render.
  // Safe because this component is imported with `dynamic(..., { ssr: false })`.
  const [prefs, setPrefs] = useState<NotificationPreferences>(() =>
    typeof window === "undefined" ? DEFAULT_NOTIFICATION_PREFERENCES : readNotificationPreferences(),
  );

  function update(patch: Partial<NotificationPreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    writeNotificationPreferences(next);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">{copy.title}</p>
      <p className="mt-1 text-sm text-white/60">{copy.subtitle}</p>

      <div className="mt-4 space-y-3">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/85">{copy.rows[cat].label}</p>
              <p className="mt-0.5 text-xs text-white/45">{copy.rows[cat].hint}</p>
            </div>
            <Toggle
              on={prefs[cat]}
              onChange={(next) => update({ [cat]: next } as Partial<NotificationPreferences>)}
              ariaLabel={copy.rows[cat].label}
            />
          </div>
        ))}
      </div>

      {/* Quiet hours */}
      <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/85">🌙 {copy.quietTitle}</p>
            <p className="mt-0.5 text-xs text-white/45">{copy.quietBody}</p>
          </div>
          <Toggle
            on={prefs.quietHoursEnabled}
            onChange={(next) => update({ quietHoursEnabled: next })}
            ariaLabel={copy.quietTitle}
          />
        </div>
        {prefs.quietHoursEnabled && (
          <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
            <label className="flex flex-1 items-center gap-2">
              <span className="text-white/50">{copy.quietFrom}</span>
              <select
                value={prefs.quietStart}
                onChange={(e) => update({ quietStart: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-white"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 items-center gap-2">
              <span className="text-white/50">{copy.quietTo}</span>
              <select
                value={prefs.quietEnd}
                onChange={(e) => update({ quietEnd: Number(e.target.value) })}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-white"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
