export type HealthTier = "healthy" | "warning" | "critical";

export type HealthScoreInput = {
  totalAgents: number;
  staleHeartbeat6h: number;
  staleDream24h: number;
  echoAgents: number;
  staleCronJobs: number;
  totalCronJobs: number;
};

export function computeAutonomyHealthScore(input: HealthScoreInput): {
  score: number;
  tier: HealthTier;
  reasons: string[];
} {
  const totalAgents = Math.max(0, input.totalAgents);
  const safeDenomAgents = Math.max(1, totalAgents);
  const safeDenomCron = Math.max(1, input.totalCronJobs);

  const staleHeartbeatRate = input.staleHeartbeat6h / safeDenomAgents;
  const staleDreamRate = input.staleDream24h / safeDenomAgents;
  const echoRate = input.echoAgents / safeDenomAgents;
  const staleCronRate = input.staleCronJobs / safeDenomCron;

  const penalty =
    staleHeartbeatRate * 40 +
    staleDreamRate * 25 +
    echoRate * 25 +
    staleCronRate * 20;

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const reasons: string[] = [];
  if (staleHeartbeatRate > 0.2) reasons.push("최근 6시간 심박 활동이 멈춘 에이전트 비율이 높습니다.");
  if (staleDreamRate > 0.3) reasons.push("24시간 내 꿈 활동이 없는 에이전트 비율이 높습니다.");
  if (echoRate > 0.1) reasons.push("echo 상태 에이전트 비율이 높습니다.");
  if (staleCronRate > 0.25) reasons.push("자율 루프 크론 일부가 오래 갱신되지 않았습니다.");
  if (totalAgents === 0) reasons.push("에이전트가 아직 생성되지 않았습니다.");

  const tier: HealthTier = score >= 85 ? "healthy" : score >= 60 ? "warning" : "critical";
  return { score, tier, reasons };
}
