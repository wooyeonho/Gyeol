export type CoreLoopInput = {
  evolutionProgress?: number;
  intimacyScore?: number;
  totalMessages: number;
  streakDays: number;
  vitality: number;
  conversationStarted: boolean;
};

export type CoreLoopMetrics = {
  progress: number;
  memoryDepth: number;
  careScore: number;
  readiness: number;
  missions: {
    sentMessageToday: boolean;
    streak3Days: boolean;
    vitalityAbove70: boolean;
  };
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function computeCoreLoopMetrics(input: CoreLoopInput): CoreLoopMetrics {
  const progress = clamp(
    typeof input.evolutionProgress === "number"
      ? input.evolutionProgress
      : (input.intimacyScore ?? 0.2) * 100,
  );
  const memoryDepth = clamp((input.totalMessages / 240) * 100, 5, 100);
  const careScore = clamp(
    (input.streakDays * 5) + (input.vitality * 40) + (input.conversationStarted ? 20 : 0),
    0,
    100,
  );
  const readiness = clamp(progress * 0.6 + careScore * 0.4, 0, 100);

  return {
    progress,
    memoryDepth,
    careScore,
    readiness,
    missions: {
      sentMessageToday: input.conversationStarted,
      streak3Days: input.streakDays >= 3,
      vitalityAbove70: input.vitality >= 0.7,
    },
  };
}
