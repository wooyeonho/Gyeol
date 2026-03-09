import { describe, expect, it } from "vitest";
import {
  buildBriefing,
  createInitialSnapshot,
  decideApproval,
  describeProfileEmergence,
  ingestAmbientSignal,
  ingestCapture,
  runAutonomousEvolutionCycle,
  snoozePromise,
  togglePromise,
} from "@/lib/relationship-os/engine";

describe("relationship-os engine", () => {
  it("creates a useful briefing from seeded snapshot", () => {
    const snapshot = createInitialSnapshot();
    const briefing = buildBriefing(snapshot);

    expect(briefing.headline.length).toBeGreaterThan(0);
    expect(briefing.priorities.length).toBeGreaterThan(0);
    expect(briefing.questPreview.length).toBeGreaterThan(0);
    expect(briefing.storyPreview?.dialogue.length).toBeGreaterThan(0);
  });

  it("turns a capture into a promise and approval", () => {
    const snapshot = createInitialSnapshot();
    const next = ingestCapture(snapshot, "민지에게 오늘 안에 우선순위안 다시 보내기");

    expect(next.promises.length).toBe(snapshot.promises.length + 1);
    expect(next.approvals.length).toBe(snapshot.approvals.length + 1);
    expect(next.captures[0]?.rawText).toContain("민지");
  });

  it("updates relationship trust when approving a suggestion", () => {
    const snapshot = createInitialSnapshot();
    const approvalId = snapshot.approvals[0]!.id;
    const targetName = snapshot.approvals[0]!.targetName;
    const before = snapshot.profiles.find((profile) => profile.name === targetName)!;

    const next = decideApproval(snapshot, approvalId, "approved");
    const after = next.profiles.find((profile) => profile.name === targetName)!;

    expect(after.trustScore).toBeGreaterThanOrEqual(before.trustScore);
    expect(next.approvals.find((item) => item.id === approvalId)?.status).toBe("approved");
  });

  it("can mark a promise done and snooze it later", () => {
    const snapshot = createInitialSnapshot();
    const targetId = snapshot.promises[0]!.id;

    const done = togglePromise(snapshot, targetId);
    expect(done.promises.find((item) => item.id === targetId)?.status).toBe("done");

    const reopened = togglePromise(done, targetId);
    const snoozed = snoozePromise(reopened, targetId);
    expect(snoozed.promises.find((item) => item.id === targetId)?.status).toBe("snoozed");
  });

  it("runs autonomous evolution cycle without user choosing a mode", () => {
    const snapshot = createInitialSnapshot();
    const next = runAutonomousEvolutionCycle(snapshot);

    expect(next.autonomousMode.enabled).toBe(true);
    expect(next.autonomousMode.cycleCount).toBe(snapshot.autonomousMode.cycleCount + 1);
    expect(next.quests.length).toBeGreaterThan(0);
  });

  it("derives relationship emergence from usage signals", () => {
    const snapshot = createInitialSnapshot();
    const description = describeProfileEmergence(snapshot, snapshot.profiles[0]!);

    expect(description.label.length).toBeGreaterThan(0);
    expect(description.summary.length).toBeGreaterThan(0);
  });

  it("can create an emergent profile from autonomous social signal", () => {
    const snapshot = createInitialSnapshot();
    const next = ingestAmbientSignal(
      snapshot,
      "새로운 존재 라온과의 자율 상호작용이 기록되었습니다.",
      "social",
      "라온",
    );

    expect(next.captures[0]?.source).toBe("social");
    expect(next.profiles.some((profile) => profile.name === "라온")).toBe(true);
  });
});
