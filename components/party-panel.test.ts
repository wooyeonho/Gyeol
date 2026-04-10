import { describe, expect, it } from "vitest";
import type { PartyPanelProps } from "./party-panel";
import type { PartyMember, SynergyBonus } from "@/lib/game/party-system";

describe("PartyPanel", () => {
  it("exports PartyPanel component", async () => {
    const mod = await import("./party-panel");
    expect(mod.PartyPanel).toBeDefined();
    expect(typeof mod.PartyPanel).toBe("function");
  });

  it("PartyPanelProps type accepts valid data", () => {
    const member: PartyMember = {
      creatureId: "c1",
      name: "테스트",
      dominantType: "analytical",
      level: 5,
      stats: { hp: 50, atk: 40, def: 30, spd: 35, wis: 45, cha: 25 },
      isActive: true,
      affinity: 0.8,
    };

    const synergy: SynergyBonus = {
      name: { ko: "무지개 시너지", en: "Rainbow Synergy" },
      description: { ko: "전체 스탯 +10%", en: "+10% all stats" },
      bonusType: "allStats",
      bonusPercent: 10,
    };

    const props: PartyPanelProps = {
      party: [member],
      synergies: [synergy],
      onSwitchActive: () => {},
      onAddCreature: () => {},
      compact: false,
    };

    expect(props.party).toHaveLength(1);
    expect(props.synergies).toHaveLength(1);
    expect(props.party[0].creatureId).toBe("c1");
  });
});
