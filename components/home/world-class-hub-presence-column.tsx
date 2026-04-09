"use client";

import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";
import { IdentityPresence } from "@/components/identity-presence";
import { AffinityHeartGauge } from "@/components/affinity-heart-gauge";

type PresenceColumnProps = {
  appearance: ResolvedIdentityAppearance;
  currentPresenceLabel: string;
  greeting: string;
  intimacyScore: number;
  isStreaming: boolean;
  quickPrompts: readonly string[];
  selfName: string;
  sendPrompt: (prompt: string) => void;
  timeLabel: string;
  vitality: number;
  vitalityHint: string;
  vitalityLabel: string;
  weather: string;
};

export function WorldClassHubPresenceColumn({
  appearance,
  currentPresenceLabel,
  greeting,
  intimacyScore,
  isStreaming,
  quickPrompts,
  selfName,
  sendPrompt,
  timeLabel,
  vitality,
  vitalityHint,
  vitalityLabel,
  weather,
}: PresenceColumnProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-lg md:text-xl font-semibold">{selfName}</h1>
        <span className="text-xs rounded-full bg-white/10 px-2 py-1 text-white/80">{weather}</span>
        <span className="text-xs text-white/60">{timeLabel}</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-white/75">{greeting}</p>
        <p className="text-xs text-white/55">{vitalityHint}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-start gap-3">
          <IdentityPresence appearance={appearance} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">{currentPresenceLabel}</p>
            <p className="mt-1 text-sm font-medium text-white">{appearance.title}</p>
            <p className="mt-1 text-xs leading-5 text-white/65">{appearance.usageNarrative ?? appearance.subtitle}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {appearance.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border px-2 py-1 text-[11px]"
                  style={{
                    borderColor: `${appearance.palette.primary}30`,
                    background: `${appearance.palette.primary}12`,
                    color: "rgba(255,255,255,0.82)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{vitalityLabel}</span>
          <span>{Math.round(vitality * 100)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all duration-500"
            style={{ width: `${Math.max(4, vitality * 100)}%` }}
          />
        </div>
      </div>

      <AffinityHeartGauge score={intimacyScore} compact />

      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => sendPrompt(prompt)}
            disabled={isStreaming}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
