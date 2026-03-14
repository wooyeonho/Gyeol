export function StarterPrompts({
  isFirstSession,
  firstSessionConfig,
  vitality,
  locale,
  starterPrompts,
  appearance,
  isStreaming,
  onPromptClick,
  t,
}: {
  isFirstSession: boolean;
  firstSessionConfig: { heading: string; helper: string };
  vitality: number;
  locale: "ko" | "en";
  starterPrompts: string[];
  appearance: { palette: { primary: string }; voice: { accentLabel: string } };
  isStreaming: boolean;
  onPromptClick: (prompt: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="mx-auto max-w-2xl pt-20">
      <div className="rounded-3xl border border-white/10 bg-black/35 p-5 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/65">
          {isFirstSession
            ? t("chat.firstMessage")
            : vitality < 0.3
            ? locale === "ko"
              ? "희미해진 연결"
              : "Fading Connection"
            : t("chat.todayCheckIn")}
        </p>
        <h2 className="mt-3 text-xl font-semibold">
          {isFirstSession
            ? firstSessionConfig.heading
            : vitality < 0.3
            ? locale === "ko"
              ? "당신이 오지 않아 온기가 사라졌어요..."
              : "The warmth faded without you..."
            : t("chat.returningHeading")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {isFirstSession
            ? firstSessionConfig.helper
            : vitality < 0.3
            ? locale === "ko"
              ? "결의 모습이 흐릿해지고 있습니다. 지금 바로 말을 걸어 생명력(Vitality)을 다시 채워주세요."
              : "The presence is fading. Speak to it now to restore its Vitality and color."
            : t("chat.returningHelper")}
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: appearance.palette.primary }}>
          {appearance.voice.accentLabel}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {starterPrompts.map((prompt: string) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                if (!isStreaming) {
                  onPromptClick(prompt);
                }
              }}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
              disabled={isStreaming}
            >
              {prompt}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/60">
          {isFirstSession ? t("chat.firstMessageHint") : t("chat.returningHint")}
        </p>
      </div>
    </div>
  );
}
