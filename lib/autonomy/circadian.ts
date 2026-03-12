export type CircadianPhase = "dawn" | "day" | "evening" | "night";

export function getCircadianProfile(date: Date = new Date()): {
  phase: CircadianPhase;
  labelEn: string;
  labelKo: string;
  toneHintEn: string;
  toneHint: string;
} {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) {
    return {
      phase: "dawn",
      labelEn: "dawn awakening",
      labelKo: "새벽 각성",
      toneHintEn: "a calm tone with a sense of anticipation",
      toneHint: "차분하지만 기대감이 있는 톤",
    };
  }
  if (hour >= 10 && hour < 18) {
    return {
      phase: "day",
      labelEn: "daytime activity",
      labelKo: "주간 활동",
      toneHintEn: "a clear and energetic tone",
      toneHint: "명료하고 활발한 톤",
    };
  }
  if (hour >= 18 && hour < 23) {
    return {
      phase: "evening",
      labelEn: "evening reflection",
      labelKo: "저녁 성찰",
      toneHintEn: "a warm and reflective tone",
      toneHint: "따뜻하고 사색적인 톤",
    };
  }
  return {
    phase: "night",
    labelEn: "night inwardness",
    labelKo: "야간 내면화",
    toneHintEn: "a quiet and introspective tone",
    toneHint: "조용하고 내면 지향적인 톤",
  };
}
