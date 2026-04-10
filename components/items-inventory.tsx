"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ITEM_CATALOG,
  equipItem,
  unequipItem,
  readItemInventory,
  writeItemInventory,
  readEquippedItems,
  writeEquippedItems,
  getRarityColor,
  type EquippedItems,
  type Item,
} from "@/lib/creature/items";
import { haptic } from "@/lib/micro-interactions";

type Tab = "inventory" | "equipped";

function findItem(id: string): Item | undefined {
  return ITEM_CATALOG.find((i) => i.id === id);
}

function ItemCard({
  item,
  onAction,
  actionLabel,
}: {
  item: Item;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
    >
      <span className="text-2xl">{item.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white truncate">{item.name.ko}</span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${getRarityColor(item.rarity)}20`,
              color: getRarityColor(item.rarity),
            }}
          >
            {item.rarity}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-white/50 truncate">{item.description.ko}</p>
        {item.modifiers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.modifiers.map((mod, i) => (
              <span
                key={i}
                className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70"
              >
                {mod.stat.toUpperCase()} {mod.percent ? `+${mod.value}%` : `+${mod.value}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          haptic("tap");
          onAction();
        }}
        className="flex-shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
      >
        {actionLabel}
      </button>
    </motion.div>
  );
}

export function ItemsInventory() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [inventory, setInventory] = useState(() => readItemInventory());
  const [equipped, setEquipped] = useState<EquippedItems>(() => readEquippedItems());

  const handleEquip = useCallback(
    (itemId: string) => {
      const result = equipItem(itemId, inventory, equipped);
      if ("error" in result) return;
      setInventory(result.inventory);
      setEquipped(result.equipped);
      writeItemInventory(result.inventory);
      writeEquippedItems(result.equipped);
      haptic("success");
    },
    [inventory, equipped],
  );

  const handleUnequip = useCallback(
    (slot: keyof EquippedItems) => {
      const result = unequipItem(slot, inventory, equipped);
      setInventory(result.inventory);
      setEquipped(result.equipped);
      writeItemInventory(result.inventory);
      writeEquippedItems(result.equipped);
      haptic("tap");
    },
    [inventory, equipped],
  );

  const equippedItems = (["accessory", "charm", "artifact"] as const)
    .map((slot) => ({ slot, item: equipped[slot] ? findItem(equipped[slot]!) : undefined }))
    .filter((e): e is { slot: keyof EquippedItems; item: Item } => !!e.item);

  const inventoryItems = inventory
    .map((id) => findItem(id))
    .filter((i): i is Item => !!i);

  return (
    <div className="space-y-3">
      {/* Tab selector */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {(["inventory", "equipped"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "bg-white/15 text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            {t === "inventory" ? `인벤토리 (${inventory.length})` : `장착 (${equippedItems.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === "inventory" ? (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-2"
          >
            {inventoryItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">아이템이 없습니다</p>
            ) : (
              inventoryItems.map((item, idx) => (
                <ItemCard
                  key={`${item.id}-${idx}`}
                  item={item}
                  actionLabel={item.slot === "consumable" ? "사용" : "장착"}
                  onAction={() => {
                    if (item.slot !== "consumable") handleEquip(item.id);
                  }}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="equipped"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-2"
          >
            {equippedItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">장착된 아이템이 없습니다</p>
            ) : (
              equippedItems.map(({ slot, item }) => (
                <ItemCard
                  key={slot}
                  item={item}
                  actionLabel="해제"
                  onAction={() => handleUnequip(slot)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
