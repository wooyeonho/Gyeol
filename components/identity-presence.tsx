"use client";

import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

type PresenceSize = "sm" | "md" | "lg";

const SHELL_CLASS: Record<ResolvedIdentityAppearance["formKey"], string> = {
  "cute-being": "rounded-[42%_58%_52%_48%/46%_42%_58%_54%]",
  "alluring-humanoid": "rounded-[36%_36%_48%_48%/28%_28%_72%_72%]",
  "dinosaur-core": "rounded-[38%_62%_54%_46%/52%_44%_56%_48%]",
  "impossible-entity": "rounded-[30%_70%_45%_55%/55%_30%_70%_45%]",
  "guardian-spirit": "rounded-[46%_54%_50%_50%/40%_40%_60%_60%]",
  "dream-signal": "rounded-[34%_66%_54%_46%/44%_32%_68%_56%]",
};

const SIZE_CLASS: Record<PresenceSize, string> = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

export function IdentityPresence({
  appearance,
  size = "md",
}: {
  appearance: ResolvedIdentityAppearance;
  size?: PresenceSize;
}) {
  const shell = SHELL_CLASS[appearance.formKey];
  const sizeClass = SIZE_CLASS[size];

  return (
    <div className={`relative ${sizeClass} shrink-0`}>
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-80"
        style={{ background: `radial-gradient(circle, ${appearance.palette.ring}, transparent 72%)` }}
      />
      <div
        className={`relative isolate h-full w-full overflow-hidden border border-white/10 ${shell}`}
        style={{
          background: `linear-gradient(135deg, ${appearance.palette.primary}26 0%, ${appearance.palette.secondary}18 55%, ${appearance.palette.background} 100%)`,
          boxShadow: `0 0 40px ${appearance.palette.ring}`,
        }}
      >
        <div
          className="absolute inset-0 opacity-85"
          style={{
            background: `radial-gradient(circle at 28% 28%, ${appearance.palette.primary}88, transparent 36%), radial-gradient(circle at 74% 72%, ${appearance.palette.secondary}88, transparent 34%)`,
          }}
        />
        <div className="absolute inset-[14%] rounded-full border border-white/10 bg-white/[0.02]" />

        {appearance.formKey === "cute-being" && (
          <>
            <div className="absolute left-[22%] top-[24%] h-[22%] w-[22%] rounded-full bg-white/28 blur-[2px]" />
            <div className="absolute right-[22%] top-[24%] h-[22%] w-[22%] rounded-full bg-white/24 blur-[2px]" />
            <div className="absolute left-1/2 top-[42%] h-[30%] w-[36%] -translate-x-1/2 rounded-full bg-white/20" />
          </>
        )}

        {appearance.formKey === "alluring-humanoid" && (
          <>
            <div className="absolute left-1/2 top-[16%] h-[22%] w-[24%] -translate-x-1/2 rounded-full bg-white/28" />
            <div className="absolute left-1/2 top-[34%] h-[42%] w-[28%] -translate-x-1/2 rounded-[999px] bg-white/18" />
            <div className="absolute left-1/2 top-[48%] h-[14%] w-[54%] -translate-x-1/2 rounded-full bg-white/10 blur-[1px]" />
          </>
        )}

        {appearance.formKey === "dinosaur-core" && (
          <>
            <div className="absolute left-[20%] top-[32%] h-[26%] w-[52%] rounded-[999px] bg-white/18 rotate-[-12deg]" />
            <div className="absolute right-[16%] top-[24%] h-[18%] w-[24%] rounded-[999px] bg-white/24 rotate-[18deg]" />
            <div className="absolute left-[16%] bottom-[20%] h-[10%] w-[42%] rounded-full bg-white/12" />
          </>
        )}

        {appearance.formKey === "impossible-entity" && (
          <>
            <div className="absolute left-[18%] top-[18%] h-[18%] w-[18%] rounded-full bg-white/22 blur-[1px]" />
            <div className="absolute right-[16%] top-[26%] h-[24%] w-[24%] rounded-full bg-white/16 blur-[1px]" />
            <div className="absolute left-[34%] top-[40%] h-[30%] w-[30%] rounded-full bg-white/14 blur-[1px]" />
            <div className="absolute right-[26%] bottom-[18%] h-[14%] w-[14%] rounded-full bg-white/20 blur-[1px]" />
          </>
        )}

        {appearance.formKey === "guardian-spirit" && (
          <>
            <div className="absolute left-1/2 top-[20%] h-[20%] w-[20%] -translate-x-1/2 rounded-full bg-white/26" />
            <div className="absolute left-1/2 top-[32%] h-[34%] w-[34%] -translate-x-1/2 rounded-full bg-white/14" />
            <div className="absolute left-[14%] top-[34%] h-[24%] w-[24%] rounded-full bg-white/10 blur-[1px]" />
            <div className="absolute right-[14%] top-[34%] h-[24%] w-[24%] rounded-full bg-white/10 blur-[1px]" />
          </>
        )}

        {appearance.formKey === "dream-signal" && (
          <>
            <div className="absolute left-[20%] top-[22%] h-[18%] w-[58%] rounded-[999px] bg-white/12 rotate-[16deg]" />
            <div className="absolute right-[18%] top-[44%] h-[16%] w-[46%] rounded-[999px] bg-white/16 rotate-[-18deg]" />
            <div className="absolute left-[28%] bottom-[20%] h-[18%] w-[18%] rounded-full bg-white/18" />
          </>
        )}
      </div>
    </div>
  );
}
