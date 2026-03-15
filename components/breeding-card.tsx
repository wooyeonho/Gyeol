"use client";

import { useState } from "react";
import { useTranslations } from "@/components/i18n-provider";
import { formatLocalizedDateTime } from "@/lib/i18n/format";

export type Visual = { shape?: string; color?: string; size?: number; glow?: number } | null;

export type PartnerProfile = {
  id: string;
  self_name: string | null;
  gen_level: number;
  memory_count: number;
  visual?: Visual;
};

type BreedingRecord = {
  id: string;
  parent_a: string;
  parent_b: string;
  child_id?: string;
  status: string;
  created_at?: string;
};

type BreedingCardProps =
  | {
      mode: "partner";
      partner: PartnerProfile;
      myVisual?: Visual;
      myAgentId: string;
      onRequest: (partnerAgentId: string) => Promise<void>;
    }
  | {
      mode: "incoming";
      record: BreedingRecord;
      partnerName?: string;
      partnerVisual?: Visual;
      myName?: string;
      myVisual?: Visual;
      onAccept: (recordId: string) => Promise<void>;
      onReject: (recordId: string) => Promise<void>;
    };

function VisualPreview({ visual, label }: { visual?: Visual; label: string }) {
  const v = visual ?? {};
  const color = (v.color as string) || "#888";
  const size = (v.size as number) || 16;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-white/50">{label}</span>
      <div
        className="rounded-full border border-white/20"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: `0 0 ${(v.glow as number) || 10}px ${color}`,
        }}
      />
    </div>
  );
}

function blendColorHex(a: string | undefined, b: string | undefined): string {
  if (!a || !b) return a ?? b ?? "#888";
  const n = (s: string) => parseInt(s.slice(1), 16) || 0;
  const r = Math.min(255, Math.max(0, ((n(a) >> 16) & 0xff + ((n(b) >> 16) & 0xff)) / 2));
  const g = Math.min(255, Math.max(0, ((n(a) >> 8) & 0xff + ((n(b) >> 8) & 0xff)) / 2));
  const bl = Math.min(255, Math.max(0, (n(a) & 0xff + (n(b) & 0xff)) / 2));
  return "#" + [r, g, bl].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

export default function BreedingCard(props: BreedingCardProps) {
  const { locale, t } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (props.mode === "partner") {
    const { partner, myVisual, onRequest } = props;
    const blendedColor = blendColorHex((myVisual as Visual)?.color as string, (partner.visual as Visual)?.color as string);
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="font-medium text-white">{partner.self_name || "..."}</span>
          <span className="text-xs text-white/50">Gen {partner.gen_level} · {partner.memory_count} {t("breeding.memories")}</span>
        </div>
        <div className="flex justify-around gap-4 py-2">
          <VisualPreview visual={myVisual as Visual} label={t("breeding.mine")} />
          <VisualPreview visual={partner.visual as Visual} label={t("breeding.partner")} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-white/50">{t("breeding.child")}</span>
            <div
              className="rounded-full border border-white/20"
              style={{
                width: 14,
                height: 14,
                backgroundColor: blendedColor,
                boxShadow: `0 0 8px ${blendedColor}`,
              }}
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <button
          className="w-full min-h-12 rounded-lg bg-white/10 hover:bg-white/20 text-base disabled:opacity-50"
          disabled={loading}
          aria-label={t("breeding.sendRequest")}
          onClick={async () => {
            setError(null);
            setLoading(true);
            try {
              await onRequest(partner.id);
            } catch (e) {
              setError((e as Error).message ?? t("breeding.requestFailed"));
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? t("breeding.sending") : t("breeding.sendRequest")}
        </button>
      </div>
    );
  }

  const { record, partnerName, onAccept, onReject } = props;
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-amber-500/30">
      <p className="text-sm text-white/80 mb-2">{t("breeding.requestFrom").replace("{name}", partnerName ?? t("breeding.fallbackPartner"))}</p>
      <p className="text-xs text-white/50 mb-3">{record.created_at ? formatLocalizedDateTime(record.created_at, locale) : ""}</p>
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          className="flex-1 min-h-12 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-base disabled:opacity-50"
          disabled={loading}
          aria-label={t("breeding.accept")}
          onClick={async () => {
            setError(null);
            setLoading(true);
            try {
              await onAccept(record.id);
            } catch (e) {
              setError((e as Error).message ?? t("breeding.acceptFailed"));
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "..." : t("breeding.accept")}
        </button>
        <button
          className="flex-1 min-h-12 rounded-lg bg-white/10 hover:bg-white/20 text-base disabled:opacity-50"
          disabled={loading}
          aria-label={t("breeding.reject")}
          onClick={async () => {
            setError(null);
            setLoading(true);
            try {
              await onReject(record.id);
            } finally {
              setLoading(false);
            }
          }}
        >
          {t("breeding.reject")}
        </button>
      </div>
    </div>
  );
}
