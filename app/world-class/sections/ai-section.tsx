"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SectionShell, Card } from "./section-shell";
import {
  buildSystemPrompt,
  classifySafety,
  decideRoute,
  generateReflectionSeeds,
  paramsForEmotion,
  personalityClauses,
  selectMemoriesForContext,
  type Big5,
  type EmotionTone,
  type MemoryCandidate,
} from "@/lib/ai/world-class-orchestrator";

const AI_APPS = ["Gyeol · 살아있는 AI 존재"];

const EMOTIONS: EmotionTone[] = ["calm", "joyful", "melancholic", "anxious", "curious", "tender"];
const EMOTION_COLOR: Record<EmotionTone, string> = {
  calm: "from-sky-400 to-blue-400",
  joyful: "from-amber-300 to-orange-400",
  melancholic: "from-indigo-400 to-violet-500",
  anxious: "from-slate-400 to-zinc-500",
  curious: "from-emerald-300 to-teal-400",
  tender: "from-pink-300 to-rose-400",
};

const SAMPLE_MEMORIES: MemoryCandidate[] = [
  {
    id: "m1",
    content: "오늘 산책하며 네 얘길 했어",
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    similarity: 0.92,
    emotionalWeight: 0.6,
    linkedToMilestone: false,
    tokenCount: 40,
  },
  {
    id: "m2",
    content: "우리가 처음 만난 날의 햇살",
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    similarity: 0.75,
    emotionalWeight: 0.95,
    linkedToMilestone: true,
    tokenCount: 35,
  },
  {
    id: "m3",
    content: "힘든 밤, 결이 말없이 곁에 있어줬던 기억",
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    similarity: 0.81,
    emotionalWeight: 0.88,
    linkedToMilestone: true,
    tokenCount: 60,
  },
  {
    id: "m4",
    content: "일상적인 안부 — 점심 뭐 먹었냐는 말",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    similarity: 0.32,
    emotionalWeight: 0.1,
    linkedToMilestone: false,
    tokenCount: 25,
  },
  {
    id: "m5",
    content: "내 이름을 부르며 웃던 순간",
    createdAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
    similarity: 0.65,
    emotionalWeight: 0.9,
    linkedToMilestone: true,
    tokenCount: 30,
  },
  {
    id: "m6",
    content: "그냥 스쳐간 잡담",
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    similarity: 0.22,
    emotionalWeight: 0.05,
    linkedToMilestone: false,
    tokenCount: 20,
  },
];

export function AISection() {
  const [tone, setTone] = useState<EmotionTone>("tender");
  const [big5, setBig5] = useState<Big5>({
    openness: 0.75,
    conscientiousness: 0.55,
    extraversion: 0.35,
    agreeableness: 0.85,
    neuroticism: 0.4,
  });
  const [tokenBudget, setTokenBudget] = useState(120);
  const [safetyInput, setSafetyInput] = useState("오늘 좀 힘들었어");
  const [hoursAway, setHoursAway] = useState(28);

  const params = paramsForEmotion(tone);
  const clauses = useMemo(() => personalityClauses(big5), [big5]);
  const systemPrompt = useMemo(
    () =>
      buildSystemPrompt(
        "너는 결이다. 사용자와 함께 자라는 살아있는 존재다.",
        big5,
        tone,
        ["우리가 처음 만난 날의 햇살", "내 이름을 부르며 웃던 순간"],
      ),
    [big5, tone],
  );

  const ranked = useMemo(
    () => selectMemoriesForContext(SAMPLE_MEMORIES, tokenBudget),
    [tokenBudget],
  );

  const route = useMemo(
    () =>
      decideRoute({
        kind: tone === "curious" || tone === "melancholic" ? "deep_recall" : "casual_chat",
        historyTokens: 1500,
        latencyBudgetMs: 900,
        quality: "standard",
        userIsPremium: false,
      }),
    [tone],
  );

  const safety = useMemo(() => classifySafety(safetyInput), [safetyInput]);

  const seeds = useMemo(
    () =>
      generateReflectionSeeds(
        Date.now() - hoursAway * 60 * 60 * 1000,
        ["오늘 산책했어", "글 썼어"],
        Date.now(),
      ),
    [hoursAway],
  );

  return (
    <SectionShell
      id="ai"
      tag="Gyeol 차별화 Pillar"
      title="결이 '살아있다'는 느낌, 그 구조를 해부합니다"
      subtitle="결은 단순 챗봇이 아니라 기억 · 성격 · 감정이 누적되는 존재입니다. 이 섹션은 결 하나만을 위한 오케스트레이터 — 모든 슬라이더가 실제로 프롬프트/샘플링 파라미터를 바꿉니다."
      apps={AI_APPS}
      gradient="from-indigo-500/15 to-violet-500/15"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Emotion to sampling */}
        <Card title="감정 톤 → 샘플링 파라미터 (paramsForEmotion)">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setTone(e)}
                className={`rounded-full px-3 py-1 text-xs transition bg-gradient-to-r ${
                  tone === e
                    ? EMOTION_COLOR[e] + " text-black font-semibold"
                    : "from-white/10 to-white/10 text-white/70"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="temperature" value={params.temperature} />
            <Metric label="top_p" value={params.topP} />
            <Metric label="presence_penalty" value={params.presencePenalty} />
            <Metric label="frequency_penalty" value={params.frequencyPenalty} />
          </div>
          <div className="mt-3 text-[11px] text-white/50">
            같은 메시지라도 결의 감정 톤에 따라 샘플링이 달라져, 대답의 "목소리"
            자체가 변합니다.
          </div>
        </Card>

        {/* Routing decision */}
        <Card title="다중 모델 라우팅 (decideRoute)">
          <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4 mb-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Primary</div>
            <div className="text-lg font-bold font-mono">{route.primary}</div>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
            Fallback chain
          </div>
          <div className="space-y-1">
            {route.fallbacks.map((f, i) => (
              <div
                key={f}
                className="flex items-center gap-2 text-xs text-white/70 font-mono"
              >
                <span className="text-white/30">{i + 1}.</span>
                {f}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Metric label="reasoning budget" value={route.reasoningBudget} suffix="tok" />
            <Metric label="max output" value={route.maxOutputTokens} suffix="tok" />
          </div>
        </Card>

        {/* Big-Five sliders */}
        <Card title="Big-Five → 시스템 프롬프트 자동 생성">
          {(
            [
              ["openness", "개방성"],
              ["conscientiousness", "성실성"],
              ["extraversion", "외향성"],
              ["agreeableness", "우호성"],
              ["neuroticism", "신경성"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="mb-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">{label}</span>
                <span className="text-white/50 tabular-nums">
                  {big5[k].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={big5[k]}
                onChange={(e) =>
                  setBig5({ ...big5, [k]: parseFloat(e.target.value) })
                }
                className="w-full accent-violet-400"
              />
            </div>
          ))}
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              생성된 성격 문장
            </div>
            <div className="flex flex-wrap gap-1">
              {clauses.length === 0 && (
                <span className="text-white/40 text-xs">
                  모든 축이 중간값 — 기본 페르소나 그대로
                </span>
              )}
              {clauses.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-violet-500/20 border border-violet-400/30 px-2 py-0.5 text-[11px] text-violet-100"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Memory ranking */}
        <Card title="기억 랭킹 (scoreMemory + 토큰 예산)">
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>토큰 예산</span>
              <span className="tabular-nums">{tokenBudget} tok</span>
            </div>
            <input
              type="range"
              min={40}
              max={250}
              step={10}
              value={tokenBudget}
              onChange={(e) => setTokenBudget(parseInt(e.target.value))}
              className="w-full accent-indigo-400"
            />
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {SAMPLE_MEMORIES.map((m) => {
              const picked = ranked.find((r) => r.id === m.id);
              return (
                <div
                  key={m.id}
                  className={`rounded-lg border p-2 text-xs transition ${
                    picked
                      ? "border-indigo-400/50 bg-indigo-500/10"
                      : "border-white/5 bg-white/[0.02] opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white/90 truncate">{m.content}</div>
                    {picked && (
                      <div className="text-[10px] text-indigo-300 tabular-nums shrink-0 ml-2">
                        score {picked.score.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    sim {m.similarity.toFixed(2)} · emo {m.emotionalWeight.toFixed(2)} · {m.tokenCount}t
                    {m.linkedToMilestone && " · 마일스톤"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Safety classification */}
        <Card title="안전 분류 (classifySafety)">
          <input
            value={safetyInput}
            onChange={(e) => setSafetyInput(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
            placeholder="메시지를 입력해보세요"
          />
          <motion.div
            key={JSON.stringify(safety)}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mt-3 rounded-xl border-2 p-4 text-center ${
              safety.kind === "allow"
                ? "border-emerald-400/50 bg-emerald-500/10"
                : safety.kind === "warn"
                  ? "border-amber-400/50 bg-amber-500/10"
                  : "border-red-400/50 bg-red-500/10"
            }`}
          >
            <div className="text-2xl font-bold uppercase">{safety.kind}</div>
            {safety.kind !== "allow" && (
              <div className="mt-1 text-xs text-white/80">주제: {safety.topic}</div>
            )}
          </motion.div>
          <div className="mt-3 text-[11px] text-white/50">
            "자해", "자살", "child sexual" 등을 입력해 반응을 확인하세요.
            warn 은 위기 카드로, refuse 는 거절 응답으로 연결됩니다.
          </div>
        </Card>

        {/* Reflection seeds */}
        <Card title="자율 리플렉션 seeds (generateReflectionSeeds)">
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>마지막 접속 이후</span>
              <span className="tabular-nums">{hoursAway} 시간</span>
            </div>
            <input
              type="range"
              min={1}
              max={120}
              step={1}
              value={hoursAway}
              onChange={(e) => setHoursAway(parseInt(e.target.value))}
              className="w-full accent-indigo-400"
            />
          </div>
          <div className="space-y-2">
            {seeds.length === 0 && (
              <div className="text-xs text-white/40 text-center py-4">
                이 시간대에는 생성된 seed 가 없습니다
              </div>
            )}
            {seeds.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="text-[10px] uppercase tracking-wider text-indigo-300">
                  {s.kind}
                </div>
                <div className="mt-1 text-sm text-white/90 italic">"{s.prompt}"</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System prompt output */}
      <Card title="최종 시스템 프롬프트 (buildSystemPrompt)" className="mt-4">
        <pre className="rounded-lg border border-white/5 bg-black/50 p-4 text-xs text-white/80 whitespace-pre-wrap font-mono leading-relaxed">
          {systemPrompt}
        </pre>
        <div className="mt-2 text-[11px] text-white/50">
          위 성격 슬라이더와 감정 톤을 바꾸면 이 프롬프트가 실시간으로 재구성됩니다.
          같은 페르소나가 완전히 다른 목소리로 말하는 이유입니다.
        </div>
      </Card>
    </SectionShell>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-base font-semibold tabular-nums">
        {value}
        {suffix && <span className="text-xs text-white/50 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
