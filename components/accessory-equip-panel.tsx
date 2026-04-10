"use client";

import { useMemo } from "react";
import {
  ACCESSORY_SLOTS,
  getEquippedAccessories,
  canWearAccessory,
  getAccessoriesBySlot,
  type AccessorySlot,
  type Accessory,
} from "@/lib/game/accessory-system";
import type { CreatureDNA } from "@/lib/genome/dna";

const SLOT_LABELS: Record<AccessorySlot, { ko: string; en: string }> = {
  hat: { ko: "모자", en: "Hat" },
  glasses: { ko: "안경", en: "Glasses" },
  collar: { ko: "목걸이", en: "Collar" },
  cape: { ko: "망토", en: "Cape" },
  aura: { ko: "오라", en: "Aura" },
};

const SLOT_ICONS: Record<AccessorySlot, string> = {
  hat: "🎩",
  glasses: "👓",
  collar: "📿",
  cape: "🧣",
  aura: "💫",
};

const RARITY_COLORS: Record<string, string> = {
  common: "rgba(148,163,184,0.5)",
  uncommon: "rgba(74,222,128,0.5)",
  rare: "rgba(59,130,246,0.5)",
  epic: "rgba(168,85,247,0.5)",
  legendary: "rgba(245,158,11,0.6)",
};

interface AccessoryEquipPanelProps {
  dna: CreatureDNA;
  equippedIds?: string[];
  locale?: string;
  onEquip?: (slot: AccessorySlot, accessoryId: string) => void;
  onUnequip?: (slot: AccessorySlot) => void;
}

export function AccessoryEquipPanel({
  dna,
  equippedIds = [],
  locale = "ko",
  onEquip,
  onUnequip,
}: AccessoryEquipPanelProps) {
  const isKo = locale === "ko" || locale.startsWith("ko-");

  const equippedAccessories = useMemo(
    () => getEquippedAccessories(equippedIds),
    [equippedIds],
  );

  const equippedBySlot = useMemo(() => {
    const map: Partial<Record<AccessorySlot, Accessory>> = {};
    for (const acc of equippedAccessories) {
      map[acc.slot] = acc;
    }
    return map;
  }, [equippedAccessories]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4">
      <h3 className="text-sm font-semibold text-white/80 mb-3">
        {isKo ? "악세서리 장착" : "Accessories"}
      </h3>

      <div className="grid grid-cols-5 gap-2">
        {ACCESSORY_SLOTS.map((slot) => {
          const equipped = equippedBySlot[slot];
          const available = getAccessoriesBySlot(slot).filter((a) =>
            canWearAccessory(a, dna),
          );

          return (
            <button
              key={slot}
              type="button"
              onClick={() => {
                if (equipped) {
                  onUnequip?.(slot);
                } else if (available.length > 0) {
                  onEquip?.(slot, available[0].id);
                }
              }}
              className="relative flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all hover:bg-white/[0.06]"
              style={{
                borderColor: equipped
                  ? RARITY_COLORS[equipped.rarity] ?? "rgba(255,255,255,0.1)"
                  : "rgba(255,255,255,0.08)",
                background: equipped
                  ? `${RARITY_COLORS[equipped.rarity] ?? "rgba(255,255,255,0.04)"}15`
                  : "rgba(255,255,255,0.02)",
              }}
              title={
                equipped
                  ? isKo
                    ? equipped.name.ko
                    : equipped.name.en
                  : isKo
                    ? SLOT_LABELS[slot].ko
                    : SLOT_LABELS[slot].en
              }
            >
              <span className="text-lg">
                {equipped ? equipped.icon : SLOT_ICONS[slot]}
              </span>
              <span className="text-[9px] text-white/40 truncate w-full text-center">
                {isKo ? SLOT_LABELS[slot].ko : SLOT_LABELS[slot].en}
              </span>
              {equipped && (
                <span
                  className="absolute -top-1 -right-1 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      RARITY_COLORS[equipped.rarity] ?? "rgba(255,255,255,0.3)",
                  }}
                />
              )}
              {!equipped && available.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400/20 text-[8px] font-bold text-cyan-300">
                  {available.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {equippedAccessories.length === 0 && (
        <p className="mt-2 text-center text-[10px] text-white/30">
          {isKo
            ? "슬롯을 눌러 악세서리를 장착하세요"
            : "Tap a slot to equip an accessory"}
        </p>
      )}
    </div>
  );
}
