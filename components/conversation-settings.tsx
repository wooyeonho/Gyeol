"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface ConversationSettingsData {
  tone_serious_humorous: number;
  tone_warm_logical: number;
  tone_brief_detailed: number;
  response_language: "ko" | "en" | "auto";
  restricted_topics: string[];
}

interface SliderProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (v: number) => void;
}

function ToneSlider({ label, leftLabel, rightLabel, value, onChange }: SliderProps) {
  const percent = ((value + 1) / 2) * 100;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/50">{label}</p>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-white/30 w-14 text-right">{leftLabel}</span>
        <div className="relative flex-1 h-1.5 rounded-full bg-white/10">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-indigo-400"
            style={{ width: `${percent}%` }}
          />
          <input
            type="range"
            min={-100}
            max={100}
            value={Math.round(value * 100)}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg pointer-events-none"
            style={{ left: `calc(${percent}% - 8px)` }}
          />
        </div>
        <span className="text-[10px] text-white/30 w-14">{rightLabel}</span>
      </div>
    </div>
  );
}

const TOPIC_OPTIONS_KO = ["정치", "종교", "연애", "성인", "폭력", "공포"];
const TOPIC_OPTIONS_EN = ["politics", "religion", "romance", "adult", "violence", "horror"];

interface ConversationSettingsProps {
  locale?: string;
}

export function ConversationSettings({ locale = "ko" }: ConversationSettingsProps) {
  const isKo = locale === "ko";
  const topicOptions = isKo ? TOPIC_OPTIONS_KO : TOPIC_OPTIONS_EN;

  const [settings, setSettings] = useState<ConversationSettingsData>({
    tone_serious_humorous: 0,
    tone_warm_logical: 0,
    tone_brief_detailed: 0,
    response_language: "ko",
    restricted_topics: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/conversation")
      .then((r) => r.json())
      .then((d) => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const toggleTopic = (topic: string) => {
    setSettings((s) => ({
      ...s,
      restricted_topics: s.restricted_topics.includes(topic)
        ? s.restricted_topics.filter((t) => t !== topic)
        : [...s.restricted_topics, topic],
    }));
  };

  if (loading) {
    return <div className="py-8 text-center text-white/30 text-sm">{isKo ? "불러오는 중..." : "Loading..."}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tone sliders */}
      <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-5">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
          {isKo ? "대화 톤" : "Conversation Tone"}
        </p>
        <ToneSlider
          label={isKo ? "진지함 ↔ 유머러스" : "Serious ↔ Humorous"}
          leftLabel={isKo ? "진지" : "Serious"}
          rightLabel={isKo ? "유머" : "Humorous"}
          value={settings.tone_serious_humorous}
          onChange={(v) => setSettings((s) => ({ ...s, tone_serious_humorous: v }))}
        />
        <ToneSlider
          label={isKo ? "따뜻함 ↔ 논리적" : "Warm ↔ Logical"}
          leftLabel={isKo ? "따뜻" : "Warm"}
          rightLabel={isKo ? "논리" : "Logical"}
          value={settings.tone_warm_logical}
          onChange={(v) => setSettings((s) => ({ ...s, tone_warm_logical: v }))}
        />
        <ToneSlider
          label={isKo ? "짧게 ↔ 길게" : "Brief ↔ Detailed"}
          leftLabel={isKo ? "짧게" : "Brief"}
          rightLabel={isKo ? "길게" : "Detailed"}
          value={settings.tone_brief_detailed}
          onChange={(v) => setSettings((s) => ({ ...s, tone_brief_detailed: v }))}
        />
      </div>

      {/* Language */}
      <div className="glass-card rounded-2xl border border-white/10 p-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          {isKo ? "응답 언어" : "Response Language"}
        </p>
        <div className="flex gap-2">
          {(["ko", "en", "auto"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setSettings((s) => ({ ...s, response_language: lang }))}
              className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${
                settings.response_language === lang
                  ? "bg-indigo-500/20 border border-indigo-400/40 text-indigo-300"
                  : "border border-white/8 bg-white/[0.03] text-white/40 hover:text-white/60"
              }`}
            >
              {lang === "ko" ? "한국어" : lang === "en" ? "English" : isKo ? "자동" : "Auto"}
            </button>
          ))}
        </div>
      </div>

      {/* Restricted topics */}
      <div className="glass-card rounded-2xl border border-white/10 p-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
          {isKo ? "주제 제한" : "Restricted Topics"}
        </p>
        <p className="text-[10px] text-white/25 mb-3">
          {isKo ? "선택한 주제는 대화에서 다루지 않아요" : "Selected topics will be avoided in conversation"}
        </p>
        <div className="flex flex-wrap gap-2">
          {topicOptions.map((topic) => {
            const active = settings.restricted_topics.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-rose-500/20 border border-rose-400/40 text-rose-300"
                    : "border border-white/10 bg-white/[0.04] text-white/40 hover:text-white/60"
                }`}
              >
                {active ? "✕ " : ""}{topic}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-xl py-3 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
      >
        {saving ? (isKo ? "저장 중..." : "Saving...") : saved ? (isKo ? "저장됨 ✓" : "Saved ✓") : (isKo ? "설정 저장" : "Save Settings")}
      </button>
    </div>
  );
}
