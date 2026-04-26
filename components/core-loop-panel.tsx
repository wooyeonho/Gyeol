import { motion } from "framer-motion";
import { computeCoreLoopMetrics } from "@/lib/engagement/core-loop-metrics";

type CoreLoopPanelProps = {
  locale: string;
  name: string;
  mood: string | null;
  vitality: number;
  streakDays: number;
  totalMessages: number;
  genLevel: number;
  evolutionProgress?: number;
  intimacyScore?: number;
  conversationStarted: boolean;
  recentMemory?: string | null;
  petCountToday?: number;
  dailyCareCompleted?: boolean;
};

type CopySet = {
  title: string;
  subtitle: string;
  care: string;
  growth: string;
  evolution: string;
  bond: string;
  vitality: string;
  mission: string;
  memory: string;
  memoryEmpty: string;
  moodLabel: string;
  evolvesIn: string;
  personalityHint: string;
  memoryAccumulating: string;
  changedLittle: string;
  tomorrow: string;
};

function getCopy(isKo: boolean): CopySet {
  return isKo
    ? {
        title: "내 결 키우기",
        subtitle: "대화하면 기억이 쌓여요",
        care: "오늘의 돌봄",
        growth: "성장도",
        evolution: "진화까지",
        bond: "유대감",
        vitality: "활력",
        mission: "오늘의 미션",
        memory: "최근 기억",
        memoryEmpty: "아직 새겨진 기억이 없어요. 오늘 대화로 첫 기억을 만들어봐요.",
        moodLabel: "기분",
        evolvesIn: "진화까지 남은 대화",
        personalityHint: "새로운 성격 조짐",
        memoryAccumulating: "기억이 쌓이는 중",
        changedLittle: "결이 조금 달라졌어요",
        tomorrow: "내일 다시 오면 결이 더 자랄 수 있어요",
      }
    : {
        title: "Raise my Gyeol",
        subtitle: "Talking builds memory",
        care: "Today's care",
        growth: "Growth",
        evolution: "Until evolution",
        bond: "Bond",
        vitality: "Vitality",
        mission: "Today's mission",
        memory: "Recent memory",
        memoryEmpty: "No memory yet. Start chatting to form the first memory.",
        moodLabel: "Mood",
        evolvesIn: "messages until evolution",
        personalityHint: "New personality signs",
        memoryAccumulating: "Memories are building",
        changedLittle: "Gyeol changed a little",
        tomorrow: "Come back tomorrow to keep growing together",
      };
}

export function CoreLoopPanel({
  locale,
  name,
  mood,
  vitality,
  streakDays,
  totalMessages,
  genLevel,
  evolutionProgress,
  intimacyScore,
  conversationStarted,
  recentMemory,
  petCountToday = 0,
  dailyCareCompleted = false,
}: CoreLoopPanelProps) {
  const isKo = locale.startsWith("ko");
  const c = getCopy(isKo);

  const metrics = computeCoreLoopMetrics({
    evolutionProgress,
    intimacyScore,
    totalMessages,
    streakDays,
    vitality,
    conversationStarted,
  });

  const evolvesIn = Math.max(0, Math.ceil((100 - metrics.progress) / 10));
  const bond = Math.round((intimacyScore ?? metrics.progress / 100) * 100);

  return (
    <div className="pointer-events-auto mx-auto mb-2 w-full max-w-3xl px-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-3xl border border-white/15 bg-black/55 p-4 backdrop-blur-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">{c.title}</h2>
            <p className="text-xs text-white/60">{c.subtitle}</p>
          </div>
          <div className="text-right text-xs text-white/70">
            <p className="font-medium text-white">{name}</p>
            <p>{c.moodLabel}: {mood ?? (isKo ? "차분함" : "calm")}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-white/60">{c.growth}</p>
            <p className="mt-1 text-sm font-medium text-white">{metrics.progress}% · Gen {genLevel}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${metrics.progress}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-cyan-100/80">{c.evolvesIn}: {evolvesIn}</p>
            <p className="mt-1 text-[11px] text-violet-100/80">{c.personalityHint}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-white/60">{c.care}</p>
            <p className="mt-1 text-sm text-white">{conversationStarted ? (isKo ? "돌봄 진행 중" : "Care in progress") : (isKo ? "대화 시작 전" : "Before first chat")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/80">
              <p>{c.bond}: <span className="text-white">{bond}%</span></p>
              <p>{c.vitality}: <span className="text-white">{Math.round(vitality * 100)}%</span></p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-white/60">{c.mission}</p>
            <ul className="mt-1 space-y-1 text-xs text-white/85">
              <li>{metrics.missions.sentMessageToday ? "✅" : "⬜"} {isKo ? "오늘 첫 대화하기" : "Send first message"}</li>
              <li>{petCountToday > 0 ? "✅" : "⬜"} {isKo ? "결 쓰다듬기" : "Pet Gyeol once"}</li>
              <li>{metrics.missions.vitalityAbove70 ? "✅" : "⬜"} {isKo ? "활력 70% 유지" : "Keep vitality above 70%"}</li>
              <li>{metrics.missions.streak3Days ? "✅" : "⬜"} {isKo ? "3일 연속 돌보기" : "3-day care streak"}</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs text-white/60">{c.memory}</p>
            <p className="mt-1 text-xs leading-5 text-white/80">
              {recentMemory ? `“${recentMemory}”` : c.memoryEmpty}
            </p>
            <p className="mt-2 text-[11px] text-white/65">{c.memoryAccumulating}</p>
            {recentMemory && (
              <p className="mt-1 text-[11px] text-emerald-200/80">{c.changedLittle}</p>
            )}
          </div>
        </div>
        <p className={`mt-3 text-center text-xs ${dailyCareCompleted ? "text-emerald-200/90" : "text-white/55"}`}>
          {dailyCareCompleted ? (isKo ? "오늘 결이 조금 자랐어요 · 돌봄 완료" : "Care complete for today") : c.tomorrow}
        </p>
      </motion.section>
    </div>
  );
}
