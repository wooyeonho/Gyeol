import { describe, it, expect } from "vitest";
import { generateInitialDNA, DNA_AXES, dnaDistance } from "./dna";
import { reverseEngineerDNA, buildMigrationGenome } from "./migrate";

describe("Genome Migration", () => {
  it("produces valid DNA for a fresh agent with no history", () => {
    const dna = reverseEngineerDNA({ agent_id: "migrate-fresh" });
    for (const axis of DNA_AXES) {
      expect(dna[axis]).toBeGreaterThanOrEqual(0);
      expect(dna[axis]).toBeLessThanOrEqual(1);
    }
  });

  it("matches the initial DNA when agent has no history", () => {
    const agentId = "migrate-no-history";
    const migrated = reverseEngineerDNA({ agent_id: agentId });
    const initial = generateInitialDNA(agentId);
    // Should be identical since no drift signals
    expect(dnaDistance(migrated, initial)).toBeLessThan(0.001);
  });

  it("drifts from initial DNA based on conversation count", () => {
    const agentId = "migrate-active";
    const initial = generateInitialDNA(agentId);
    const migrated = reverseEngineerDNA({
      agent_id: agentId,
      total_messages: 300,
      mood: "happy",
      intimacy_score: 50,
      config: { usage_profile: { primary_mode: "companion" } },
    });

    const dist = dnaDistance(initial, migrated);
    expect(dist).toBeGreaterThan(0.01);
  });

  it("companion-mode creature has higher warmth/empathy", () => {
    const base = reverseEngineerDNA({ agent_id: "migrate-base-companion" });
    const companion = reverseEngineerDNA({
      agent_id: "migrate-base-companion",
      total_messages: 200,
      config: { usage_profile: { primary_mode: "companion" } },
      intimacy_score: 40,
    });
    expect(companion.warmth).toBeGreaterThan(base.warmth);
    expect(companion.empathy).toBeGreaterThan(base.empathy);
  });

  it("strategic-mode creature has higher analytical/persistence", () => {
    const base = reverseEngineerDNA({ agent_id: "migrate-base-strategic" });
    const strategic = reverseEngineerDNA({
      agent_id: "migrate-base-strategic",
      total_messages: 200,
      config: { usage_profile: { primary_mode: "strategic" } },
    });
    expect(strategic.analytical).toBeGreaterThan(base.analytical);
    expect(strategic.persistence).toBeGreaterThan(base.persistence);
  });

  it("buildMigrationGenome includes species and metadata", () => {
    const genome = buildMigrationGenome({
      agent_id: "migrate-full",
      total_messages: 100,
      mood: "curious",
    });

    expect(genome.dna).toBeDefined();
    expect(genome.species).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
    expect(genome.archetype).toBeDefined();
    expect(genome.element).toBeDefined();
    expect(genome.migrated_at).toBeDefined();
  });

  it("visual color influences DNA", () => {
    // Red color → warmth boost
    const red = reverseEngineerDNA({
      agent_id: "migrate-red",
      total_messages: 200,
      visual: { color: "#ff3333" },
    });
    // Blue color → analytical boost
    const blue = reverseEngineerDNA({
      agent_id: "migrate-red", // same base
      total_messages: 200,
      visual: { color: "#3333ff" },
    });
    expect(red.warmth).toBeGreaterThan(blue.warmth);
    expect(blue.analytical).toBeGreaterThan(red.analytical);
  });

  it("all DNA values stay within 0..1 even with extreme inputs", () => {
    const dna = reverseEngineerDNA({
      agent_id: "migrate-extreme",
      total_messages: 10000,
      intimacy_score: 500,
      mood: "happy",
      config: {
        usage_profile: { primary_mode: "companion" },
        tone: "playful",
        active_goal: "test",
        research_focus: "test",
      },
      personality: {
        core_traits: ["empathetic", "creative", "playful", "analytical"],
      },
      visual: { color: "#ff0000", shape: "creature" },
    });

    for (const axis of DNA_AXES) {
      expect(dna[axis]).toBeGreaterThanOrEqual(0);
      expect(dna[axis]).toBeLessThanOrEqual(1);
    }
  });
});
