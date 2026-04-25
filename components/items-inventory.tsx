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
import { type ProceduralItem, type Affix } from "@/lib/game/affix-system";

type Tab = "inventory" | "equipped" | "loot";

/** Color-coded affix display */
function AffixBadge({ affix, locale = "ko" }: { affix: Affix; locale?: string }) {
  const color = affix.type === "prefix" ? "#60a5fa" : "#a78bfa";
  const label = locale === "ko" ? affix.name.ko : affix.name.en;
  const stats = Object.entries(affix.statBonuses)
    .map(([stat, val]) => `${stat.toUpperCase()}+${val}`)
    .join(" ");
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {label} <span className="opacity-60">({stats})</span>
    </span>
  );
}

/** Procedural item card with affix rendering */
function ProceduralItemCard({
  item,
  locale = "ko",
}: {
  item: ProceduralItem;
  locale?: string;
}) {
  const rarityColors: Record<string, string> = {
    common: "#9ca3af",
    uncommon: "#22c55e",
    rare: "#3b82f6",
    epic: "#a855f7",
    legendary: "#f59e0b",
  };
  const rc = rarityColors[item.rarity] ?? "#9ca3af";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border p-3 space-y-1.5"
      style={{ borderColor: `${rc}30`, backgroundColor: `${rc}08` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${rc}20`, color: rc }}>
              {item.rarity.toUpperCase()}
            </span>
            <span className="text-[10px] text-white/40">iLv {item.itemLevel}</span>
          </div>
        </div>
      </div>
      {item.affixes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.affixes.map((affix) => (
            <AffixBadge key={affix.id} affix={affix} locale={locale} />
          ))}
        </div>
      )}
      {item.statBonuses && Object.keys(item.statBonuses).length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[10px] text-white/50">
          {Object.entries(item.statBonuses).map(([stat, val]) => (
            <span key={stat}>+{val} {stat.toUpperCase()}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

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

export function ItemsInventory({ locale = "ko" }: { locale?: string } = {}) {
  const [tab, setTab] = useState<Tab>("inventory");
  const [inventory, setInventory] = useState(() => readItemInventory());
  const [equipped, setEquipped] = useState<EquippedItems>(() => readEquippedItems());
  const [lootItems, setLootItems] = useState<ProceduralItem[]>([]);
  const [lootBusy, setLootBusy] = useState(false);
  const [lootError, setLootError] = useState<string | null>(null);

  async function handleLootRoll() {
    setLootBusy(true);
    setLootError(null);
    try {
      const res = await fetch("/api/market/loot", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setLootError((json as { error?: string }).error || (locale === "ko" ? "루트 생성 실패" : "Loot generation failed"));
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (json.item) {
        setLootItems((prev) => [json.item as ProceduralItem, ...prev]);
        haptic("success");
      }
    } catch {
      setLootError(locale === "ko" ? "네트워크 오류" : "Network error");
    } finally {
      setLootBusy(false);
    }
  }

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
        {(["inventory", "equipped", "loot"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "bg-white/15 text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            {t === "inventory"
              ? (locale === "ko" ? `인벤토리 (${inventory.length})` : `Inventory (${inventory.length})`)
              : t === "equipped"
                ? (locale === "ko" ? `장착 (${equippedItems.length})` : `Equipped (${equippedItems.length})`)
                : (locale === "ko" ? "루트" : "Loot")}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === "inventory" && (
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
        )}
        {tab === "equipped" && (
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
        {tab === "loot" && (
          <motion.div
            key="loot"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleLootRoll()}
                disabled={lootBusy}
                className="flex-1 rounded-xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-4 py-3 text-sm font-medium text-amber-200 hover:from-amber-500/20 hover:to-orange-500/20 disabled:opacity-50 transition-all min-h-[48px]"
              >
                {lootBusy
                  ? "..."
                  : locale === "ko"
                    ? "루트 생성 (50 코인)"
                    : "Roll Loot (50 coins)"}
              </button>
            </div>
            {lootError && (
              <p className="text-xs text-red-400">{lootError}</p>
            )}
            {lootItems.length > 0 ? (
              <div className="space-y-2">
                {lootItems.map((item, idx) => (
                  <ProceduralItemCard key={`${item.seed}-${idx}`} item={item} locale={locale} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-white/40">
                {locale === "ko" ? "루트를 생성해보세요!" : "Roll for loot!"}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
