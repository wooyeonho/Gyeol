import { describe, it, expect } from "vitest";
import {
  getDemoAgentState,
  getDemoWorldState,
  getDemoHomeSummary,
  getDemoRoomObjects,
  getDemoConstellation,
} from "./runtime";

describe("getDemoAgentState", () => {
  it("returns valid agent state shape", () => {
    const state = getDemoAgentState();
    expect(state.self_name).toBe("GYEOL");
    expect(state.total_messages).toBe(12);
    expect(state.gen_level).toBe(2);
    expect(state.vitality).toBe(0.78);
    expect(state.mood).toBe("curious");
  });

  it("has visual properties", () => {
    const state = getDemoAgentState();
    expect(state.visual.color).toBeTruthy();
    expect(state.visual.shape).toBeTruthy();
    expect(state.visual.animation).toBeTruthy();
  });

  it("has genome properties", () => {
    const state = getDemoAgentState();
    expect(state.genome.species).toBe("lumen-being");
    expect(state.genome.mutations).toHaveLength(2);
  });

  it("has config with usage profile", () => {
    const state = getDemoAgentState();
    expect(state.config.usage_profile.primary_mode).toBe("reflection");
    expect(state.config.autonomous_enabled).toBe(true);
  });
});

describe("getDemoWorldState", () => {
  it("returns weather and collective emotion", () => {
    const world = getDemoWorldState();
    expect(world.weather.name).toBe("Aurora Drift");
    expect(world.collective_emotion.calm).toBeGreaterThan(0);
    expect(world.collective_emotion.curiosity).toBeGreaterThan(0);
  });
});

describe("getDemoHomeSummary", () => {
  it("returns Korean content for ko", () => {
    const summary = getDemoHomeSummary("ko");
    expect(summary.recent_items.length).toBeGreaterThan(0);
    expect(summary.recap.streak.days).toBe(3);
    expect(summary.recap.today.user_messages).toBe(2);
  });

  it("returns English content for en", () => {
    const summary = getDemoHomeSummary("en");
    expect(summary.recent_items[0].title).toContain("Gathered");
  });

  it("has goal loop data", () => {
    const summary = getDemoHomeSummary("en");
    expect(summary.recap.goal_loop.active_goal).toBeTruthy();
    expect(summary.recap.goal_loop.pending_count).toBe(2);
  });
});

describe("getDemoRoomObjects", () => {
  it("returns 3 demo objects", () => {
    const objects = getDemoRoomObjects();
    expect(objects).toHaveLength(3);
    for (const obj of objects) {
      expect(obj.id).toBeTruthy();
      expect(obj.type).toBeTruthy();
      expect(obj.position).toHaveLength(3);
      expect(obj.scale).toHaveLength(3);
      expect(obj.content).toBeTruthy();
    }
  });
});

describe("getDemoConstellation", () => {
  it("returns stars and constellations", () => {
    const data = getDemoConstellation();
    expect(data.stars).toHaveLength(4);
    expect(data.constellations).toHaveLength(2);
    expect(data.constellations[0].name).toBe("First Loop");
  });

  it("stars have required properties", () => {
    const { stars } = getDemoConstellation();
    for (const star of stars) {
      expect(star.id).toBeTruthy();
      expect(star.content).toBeTruthy();
      expect(star.type).toBeTruthy();
      expect(typeof star.x).toBe("number");
      expect(typeof star.y).toBe("number");
    }
  });
});
