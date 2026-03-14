import { useAgentStore } from "@/store/agent-store";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { useTranslations } from "@/components/i18n-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ManifestationTimeline() {
  const { locale } = useTranslations();
  const agentState = useAgentStore((state) => state.agentState);

  if (!agentState) return null;

  const appearance = resolveIdentityAppearance(
    {
      selfName: typeof agentState?.self_name === "string" ? agentState.self_name : null,
      visual: (agentState?.visual as Record<string, unknown>) ?? null,
      genome: (agentState?.genome as Record<string, unknown>) ?? null,
      selfModel: (agentState?.self_model as Record<string, unknown>) ?? null,
      config: agentState?.config as Record<string, unknown>,
      genLevel: typeof agentState?.gen_level === "number" ? agentState.gen_level : 1,
      vitality: typeof agentState?.vitality === "number" ? agentState.vitality : 1,
      mood: typeof agentState?.mood === "string" ? agentState.mood : null,
    },
    locale
  );

  const entries = [
    { label: locale === "ko" ? "형태의 기원" : "Origin Form", value: appearance.formKey },
    { label: locale === "ko" ? "발현 방향성" : "Manifestation Bias", value: appearance.chips.join(" · ") },
    { label: locale === "ko" ? "최근 대화의 흐름" : "Recent Usage Flow", value: appearance.usageNarrative },
    { label: locale === "ko" ? "목소리 공명" : "Vocal Resonance", value: appearance.voice.accentLabel },
  ].filter(e => e.value);

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium tracking-wide" style={{ color: appearance.palette.primary }}>
          {locale === "ko" ? "존재성의 기록" : "Continuity Signature"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/20 before:to-transparent">
          {entries.map((entry, idx) => (
            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white/20 bg-black shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" style={{ borderColor: appearance.palette.primary }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: appearance.palette.primary }} />
              </div>
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white/5 p-4 rounded-xl border border-white/10 shadow hover:bg-white/10 transition">
                <h3 className="font-semibold text-white/90 text-sm">{entry.label}</h3>
                <p className="text-xs text-white/60 mt-1">{entry.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
