import { describe, expect, it } from "vitest";
import { computeAutonomyHealthScore } from "./health-score";

describe("computeAutonomyHealthScore", () => {
  it("returns healthy score for clean metrics", () => {
    const out = computeAutonomyHealthScore({
      totalAgents: 20,
      staleHeartbeat6h: 0,
      staleDream24h: 0,
      echoAgents: 0,
      staleCronJobs: 0,
      totalCronJobs: 8,
    });
    expect(out.tier).toBe("healthy");
    expect(out.score).toBeGreaterThanOrEqual(90);
  });

  it("returns warning/critical for degraded metrics", () => {
    const out = computeAutonomyHealthScore({
      totalAgents: 10,
      staleHeartbeat6h: 6,
      staleDream24h: 5,
      echoAgents: 2,
      staleCronJobs: 4,
      totalCronJobs: 8,
    });
    expect(["warning", "critical"]).toContain(out.tier);
    expect(out.score).toBeLessThan(80);
    expect(out.reasons.length).toBeGreaterThan(0);
  });
});
