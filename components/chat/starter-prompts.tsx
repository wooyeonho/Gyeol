import type { ResolvedIdentityAppearance } from "@/lib/identity/appearance";

export function StarterPrompts({
  isFirstSession,
  firstSessionConfig,
  vitality,
  starterPrompts,
  appearance,
  isStreaming,
  onPromptClick,
  t,
}: {
  isFirstSession: boolean;
  firstSessionConfig: { heading: string; helper: string };
  vitality: number;
  starterPrompts: string[];
  appearance: ResolvedIdentityAppearance;
  isStreaming: boolean;
  onPromptClick: (prompt: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="mx-auto max-w-2xl pt-16 sm:pt-20">
      <div className="rounded-3xl border border-white/15 bg-black/45 p-5 text-center shadow-[0_0_48px_rgba(34,211,238,0.08)] sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-100/85">
          {isFirstSession
            ? t("chat.firstMessage")
            : vitality < 0.3
            ? t("chat.fadingConnection")
            : t("chat.todayCheckIn")}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
          {isFirstSession
            ? firstSessionConfig.heading
            : vitality < 0.3
            ? t("chat.fadingHeading")
            : t("chat.returningHeading")}
        </h2>
        <p className="mt-3 text-base leading-7 text-white/82">
          {isFirstSession
            ? firstSessionConfig.helper
            : vitality < 0.3
            ? t("chat.fadingHelper")
            : t("chat.returningHelper")}
        </p>
        <p className="mt-4 text-sm font-medium uppercase tracking-[0.18em]" style={{ color: appearance.palette.primary }}>
          {appearance.voice.accentLabel}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {starterPrompts.map((prompt: string) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                if (!isStreaming) {
                  onPromptClick(prompt);
                }
              }}
              className="min-h-12 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left text-base leading-6 text-white/88 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              disabled={isStreaming}
            >
              {prompt}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/80">
          {isFirstSession ? t("chat.firstMessageHint") : t("chat.returningHint")}
        </p>
      </div>
    </div>
  );
}
