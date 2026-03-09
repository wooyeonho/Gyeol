export type CircadianPhase = "dawn" | "day" | "evening" | "night";

export function getCircadianProfile(date: Date = new Date()): {
  phase: CircadianPhase;
  labelKo: string;
  toneHint: string;
} {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) {
    return {
      phase: "dawn",
      labelKo: "새벽 각성",
      toneHint: "차분하지만 기대감이 있는 톤",
    };
  }
  if (hour >= 10 && hour < 18) {
    return {
      phase: "day",
      labelKo: "주간 활동",
      toneHint: "명료하고 활발한 톤",
    };
  }
  if (hour >= 18 && hour < 23) {
    return {
      phase: "evening",
      labelKo: "저녁 성찰",
      toneHint: "따뜻하고 사색적인 톤",
    };
  }
  return {
    phase: "night",
    labelKo: "야간 내면화",
    toneHint: "조용하고 내면 지향적인 톤",
  };
}
