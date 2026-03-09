import { describe, expect, it } from "vitest";
import {
  buildBriefing,
  createInitialSnapshot,
  decideApproval,
  ingestCapture,
  snoozePromise,
  togglePromise,
} from "@/lib/relationship-os/engine";

describe("relationship-os engine", () => {
  it("creates a useful briefing from seeded snapshot", () => {
    const snapshot = createInitialSnapshot();
    const briefing = buildBriefing(snapshot);

    expect(briefing.headline.length).toBeGreaterThan(0);
    expect(briefing.priorities.length).toBeGreaterThan(0);
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
});
