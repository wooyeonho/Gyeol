import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getTeam,
  createTeam,
  addTeamMember,
  removeTeamMember,
  setMemberRole,
  calculateSynergy,
  getTeamPower,
  MAX_TEAM_SIZE,
  ELEMENT_SYNERGIES,
} from "./team-system";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  },
});
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });

const leader = {
  agentId: "agent-1",
  selfName: "Spark",
  species: "Phoenix",
  element: "fire",
  level: 5,
  role: "leader" as const,
  slot: 0,
};

describe("team-system", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns null when no team exists", () => {
    expect(getTeam()).toBeNull();
  });

  it("creates a team with a leader", () => {
    const team = createTeam("Alpha", leader);
    expect(team.name).toBe("Alpha");
    expect(team.members).toHaveLength(1);
    expect(team.members[0].role).toBe("leader");
  });

  it("adds members to team", () => {
    createTeam("Alpha", leader);
    const result = addTeamMember({
      agentId: "agent-2",
      selfName: "Wave",
      element: "water",
      level: 3,
      role: "support",
    });
    expect(result.success).toBe(true);
    const team = getTeam()!;
    expect(team.members).toHaveLength(2);
  });

  it("prevents duplicate members", () => {
    createTeam("Alpha", leader);
    const result = addTeamMember({ ...leader, role: "support" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Already in team");
  });

  it("enforces max team size", () => {
    createTeam("Alpha", leader);
    for (let i = 2; i <= MAX_TEAM_SIZE; i++) {
      addTeamMember({
        agentId: `agent-${i}`,
        selfName: `Member ${i}`,
        level: 1,
        role: "support",
      });
    }
    const result = addTeamMember({
      agentId: "agent-overflow",
      selfName: "Overflow",
      level: 1,
      role: "support",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Team is full");
  });

  it("removes members and reindexes slots", () => {
    createTeam("Alpha", leader);
    addTeamMember({ agentId: "agent-2", selfName: "B", level: 2, role: "support" });
    addTeamMember({ agentId: "agent-3", selfName: "C", level: 3, role: "specialist" });
    removeTeamMember("agent-2");
    const team = getTeam()!;
    expect(team.members).toHaveLength(2);
    expect(team.members[1].slot).toBe(1);
  });

  it("setMemberRole changes role and ensures single leader", () => {
    createTeam("Alpha", leader);
    addTeamMember({ agentId: "agent-2", selfName: "B", level: 2, role: "support" });
    setMemberRole("agent-2", "leader");
    const team = getTeam()!;
    const leaders = team.members.filter((m) => m.role === "leader");
    expect(leaders).toHaveLength(1);
    expect(leaders[0].agentId).toBe("agent-2");
  });

  it("calculateSynergy returns fire duo for 2 fire members", () => {
    const synergy = calculateSynergy([
      { ...leader, element: "fire" },
      { agentId: "agent-2", selfName: "B", element: "fire", level: 3, role: "support", slot: 1 },
    ]);
    expect(synergy).toBe(ELEMENT_SYNERGIES.fire_duo);
  });

  it("calculateSynergy returns rainbow for 4+ unique elements", () => {
    const synergy = calculateSynergy([
      { agentId: "a1", selfName: "A", element: "fire", level: 1, role: "leader", slot: 0 },
      { agentId: "a2", selfName: "B", element: "water", level: 1, role: "support", slot: 1 },
      { agentId: "a3", selfName: "C", element: "earth", level: 1, role: "support", slot: 2 },
      { agentId: "a4", selfName: "D", element: "wind", level: 1, role: "specialist", slot: 3 },
    ]);
    expect(synergy).toBe(ELEMENT_SYNERGIES.rainbow);
  });

  it("calculateSynergy returns null for single member", () => {
    expect(calculateSynergy([leader])).toBeNull();
  });

  it("getTeamPower calculates correctly", () => {
    const power = getTeamPower([
      { agentId: "a1", selfName: "A", level: 5, role: "leader", slot: 0 },
      { agentId: "a2", selfName: "B", level: 3, role: "support", slot: 1 },
    ]);
    // leader: 5*10 + 20 = 70, support: 3*10 = 30, total = 100, no synergy
    expect(power).toBe(100);
  });

  it("getTeamPower includes synergy bonus", () => {
    const members = [
      { agentId: "a1", selfName: "A", element: "fire", level: 5, role: "leader" as const, slot: 0 },
      { agentId: "a2", selfName: "B", element: "fire", level: 5, role: "support" as const, slot: 1 },
    ];
    const power = getTeamPower(members);
    // leader: 50+20=70, support: 50=50, base=120, fire_duo +15% = 138
    expect(power).toBe(138);
  });
});
