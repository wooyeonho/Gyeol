"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";
import {
  QUIZ_QUESTIONS,
  quizAnswersToDNA,
  deriveQuizResult,
  type QuizResult,
} from "@/lib/onboarding/personality-quiz";
import { getDnaAxisLabel } from "@/lib/i18n/dna-axis-labels";

export default function QuizPage() {
  const { t, locale } = useTranslations();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const isKo = locale === "ko" || locale?.startsWith("ko-");
  const currentQ = QUIZ_QUESTIONS[step];
  const totalQ = QUIZ_QUESTIONS.length;

  const selectOption = (optionId: string) => {
    haptic("tap");
    const next = { ...answers, [currentQ.id]: optionId };
    setAnswers(next);

    if (step < totalQ - 1) {
      setTimeout(() => setStep(step + 1), 300);
    } else {
      // Quiz complete — compute result
      const dna = quizAnswersToDNA(next, "preview");
      const quizResult = deriveQuizResult(dna);
      setResult(quizResult);
      setTimeout(() => setShowResult(true), 400);
    }
  };

  const optionLabels: Record<string, Record<string, { ko: string; en: string }>> = {
    q1_social: {
      alone: { ko: "혼자 있는 게 좋아", en: "I prefer being alone" },
      small_group: { ko: "소수의 사람들과", en: "With a small group" },
      big_crowd: { ko: "많은 사람들 속에서", en: "In a big crowd" },
    },
    q2_thinking: {
      logic: { ko: "논리적으로 분석해", en: "I analyze logically" },
      feeling: { ko: "직감과 감정으로", en: "With intuition and feeling" },
      creative: { ko: "창의적으로 접근해", en: "I approach creatively" },
    },
    q3_energy: {
      challenge: { ko: "도전할 때 에너지가 나", en: "Challenges energize me" },
      peace: { ko: "평화로울 때 충전돼", en: "Peace recharges me" },
      novelty: { ko: "새로운 것에 흥분해", en: "Novelty excites me" },
    },
    q4_expression: {
      words: { ko: "말로 표현해", en: "I express with words" },
      actions: { ko: "행동으로 보여줘", en: "I show through actions" },
      art: { ko: "예술적으로 표현해", en: "I express through art" },
    },
    q5_philosophy: {
      explore: { ko: "탐험하고 발견하기", en: "Explore and discover" },
      connect: { ko: "사람과 연결되기", en: "Connect with people" },
      master: { ko: "숙달하고 깊이 파기", en: "Master and go deep" },
    },
  };

  const questionLabels: Record<string, { ko: string; en: string }> = {
    q1_social: { ko: "사람과의 관계에서 나는?", en: "In social situations, I..." },
    q2_thinking: { ko: "문제를 만나면 어떻게 해?", en: "When facing problems, I..." },
    q3_energy: { ko: "에너지를 얻는 방법은?", en: "What gives me energy?" },
    q4_expression: { ko: "나를 표현하는 방법은?", en: "How do I express myself?" },
    q5_philosophy: { ko: "삶에서 가장 중요한 건?", en: "What matters most in life?" },
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("quiz.eyebrow") || "Personality Quiz"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("quiz.title") || "성격 퀴즈"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("quiz.subtitle") || "5가지 질문으로 나만의 생명체 타입을 알아보세요"}
          </p>
        </header>

        {!showResult ? (
          <>
            {/* Progress */}
            <div className="flex items-center gap-2">
              {QUIZ_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i <= step ? "bg-indigo-400" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-white text-center py-4">
                  {isKo ? questionLabels[currentQ.id]?.ko : questionLabels[currentQ.id]?.en}
                </h2>

                <div className="space-y-3">
                  {currentQ.options.map((opt) => {
                    const label = optionLabels[currentQ.id]?.[opt.id];
                    const selected = answers[currentQ.id] === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => selectOption(opt.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          selected
                            ? "border-indigo-400/50 bg-indigo-500/15"
                            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                        }`}
                      >
                        <span className="text-sm text-white/90">
                          {isKo ? label?.ko : label?.en}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <p className="text-center text-xs text-white/30">
                  {step + 1} / {totalQ}
                </p>
              </motion.div>
            </AnimatePresence>
          </>
        ) : result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Result card */}
            <div className="rounded-[2rem] border border-indigo-400/30 bg-gradient-to-b from-indigo-500/10 to-transparent p-8 text-center shadow-[0_0_60px_rgba(99,102,241,0.15)]">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: 2 }}
                className="inline-block text-6xl"
              >
                {result.emoji}
              </motion.span>
              <h2 className="mt-4 text-2xl font-bold text-white">
                {t(result.typeKey) || result.typeKey}
              </h2>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                {t(result.descKey) || result.descKey}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {result.dominantAxes.map((axis) => (
                  <span
                    key={axis}
                    className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300"
                  >
                    {getDnaAxisLabel(axis, locale)}
                  </span>
                ))}
              </div>
            </div>

            {/* Share button */}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  haptic("success");
                  if (navigator.share) {
                    navigator.share({
                      title: t("quiz.shareTitle") || "나의 결 생명체 타입",
                      text: `${result.emoji} ${t(result.typeKey)} — ${t(result.descKey)}`,
                      url: window.location.href,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href).catch(() => {});
                  }
                }}
                className="rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
              >
                {t("quiz.share") || "결과 공유하기"}
              </button>
              <button
                type="button"
                onClick={() => { setStep(0); setAnswers({}); setResult(null); setShowResult(false); }}
                className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-white/60 hover:bg-white/5 transition-colors"
              >
                {t("quiz.retry") || "다시하기"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
