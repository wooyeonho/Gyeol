"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getRoomState,

  saveRoomState,
  ROOM_THEMES,
  FURNITURE_CATALOG,
  placeFurniture,
  removeFurniture,
  changeRoomTheme,
  getRoomGridSize,
  type RoomState,

  type FurnitureItem,

  type PlacedFurniture,
} from "@/lib/game/room-system";
import { haptic } from "@/lib/micro-interactions";

type EditorTab = "furniture" | "theme" | "placed";

const RARITY_COLORS: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
};

const CATEGORY_ICONS: Record<string, string> = {
  bed: "🛏️",
  table: "🪵",
  light: "💡",
  decoration: "🎨",
  plant: "🌿",
  toy: "🎮",
  food_bowl: "🍽️",
  window: "🪟",
};

export function RoomEditor({ locale = "ko" }: { locale?: string }) {
  const [room, setRoom] = useState<RoomState>(getRoomState);
  const [tab, setTab] = useState<EditorTab>("furniture");
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const isKo = locale === "ko";
  const gridSize = useMemo(() => getRoomGridSize(room.level), [room.level]);
  const currentTheme = ROOM_THEMES.find((t) => t.id === room.themeId) ?? ROOM_THEMES[0];


  const ownedFurniture = useMemo(
    () => FURNITURE_CATALOG.filter((f) => room.unlockedFurniture.includes(f.id)),
    [room.unlockedFurniture],
  );

  const filteredCatalog = useMemo(
    () => categoryFilter
      ? FURNITURE_CATALOG.filter((f) => f.category === categoryFilter)
      : FURNITURE_CATALOG,
    [categoryFilter],
  );

  const handlePlaceFurniture = useCallback((furnitureId: string, x: number, y: number) => {
    placeFurniture(furnitureId, x, y);
    setRoom(getRoomState());
    haptic("tap");
  }, []);

  const handleRemoveFurniture = useCallback((furnitureId: string) => {
    removeFurniture(furnitureId);
    setRoom(getRoomState());
    haptic("tap");
  }, []);

  const handleChangeTheme = useCallback((themeId: string) => {
    changeRoomTheme(themeId);
    setRoom(getRoomState());
    haptic("success");
  }, []);

  return (
    <div className="space-y-4">
      {/* Room Preview Grid */}
      <div
        className={`relative rounded-2xl border border-white/10 p-4 ${currentTheme.background}`}
        style={{ minHeight: 200 }}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
          }}
        >
          {Array.from({ length: gridSize.cols * gridSize.rows }).map((_, i) => {
            const x = i % gridSize.cols;
            const y = Math.floor(i / gridSize.cols);
            const placed = room.furniture.find((f) => f.x === x && f.y === y);
            const item = placed ? FURNITURE_CATALOG.find((f) => f.id === placed.furnitureId) : null;

            return (
              <motion.div
                key={`${x}-${y}`}
                className={`aspect-square rounded-lg border transition-all cursor-pointer ${
                  placed
                    ? "border-white/20 bg-white/10"
                    : selectedFurniture
                      ? "border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.08]"
                      : "border-transparent bg-white/[0.02]"
                }`}
                onClick={() => {
                  if (selectedFurniture && !placed) {
                    handlePlaceFurniture(selectedFurniture, x, y);
                    setSelectedFurniture(null);
                  } else if (placed) {
                    handleRemoveFurniture(placed.furnitureId);
                  }
                }}
                whileTap={{ scale: 0.95 }}
              >
                {item && (
                  <div className="flex h-full items-center justify-center text-2xl">
                    {item.sprite}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Room Level */}
        <div className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/60">
          Lv.{room.level}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        {(["furniture", "theme", "placed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              tab === t ? "bg-white/15 text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            {t === "furniture" ? (isKo ? "가구 상점" : "Shop") :
             t === "theme" ? (isKo ? "테마" : "Theme") :
             isKo ? "배치됨" : "Placed"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Furniture Shop */}
        {tab === "furniture" && (
          <motion.div
            key="furniture"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                  !categoryFilter ? "bg-white/15 text-white" : "bg-white/5 text-white/50"
                }`}
              >
                {isKo ? "전체" : "All"}
              </button>
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                    categoryFilter === cat ? "bg-white/15 text-white" : "bg-white/5 text-white/50"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div className="grid grid-cols-2 gap-2">
              {filteredCatalog.map((item) => {
                const owned = room.unlockedFurniture.includes(item.id);
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (owned) {
                        setSelectedFurniture(item.id);
                        haptic("tap");
                      }
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selectedFurniture === item.id
                        ? "border-cyan-400/50 bg-cyan-400/10"
                        : owned
                          ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                          : "border-white/5 bg-white/[0.02] opacity-50"
                    }`}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.sprite}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">
                          {isKo ? item.name.ko : item.name.en}
                        </p>
                        <p className="text-[10px]" style={{ color: RARITY_COLORS[item.rarity] }}>
                          {item.rarity}
                        </p>
                      </div>
                    </div>
                    {!owned && (
                      <p className="mt-1.5 text-[10px] text-amber-400/70">{item.cost} coins</p>
                    )}
                    {item.moodEffect && (
                      <p className="mt-1 text-[10px] text-emerald-400/60">
                        +{(item.moodEffect.value * 100).toFixed(0)}% {item.moodEffect.axis}
                      </p>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Theme Selection */}
        {tab === "theme" && (
          <motion.div
            key="theme"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {ROOM_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleChangeTheme(theme.id)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  room.themeId === theme.id
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {isKo ? theme.name.ko : theme.name.en}
                    </p>
                    {theme.cost > 0 && (
                      <p className="text-[10px] text-amber-400/70">{theme.cost} coins</p>
                    )}
                  </div>
                  <div
                    className={`h-8 w-12 rounded-lg ${theme.background}`}
                  />
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {/* Placed Furniture */}
        {tab === "placed" && (
          <motion.div
            key="placed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {room.furniture.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/40">
                {isKo ? "배치된 가구가 없어요" : "No furniture placed"}
              </p>
            ) : (
              room.furniture.map((placed) => {
                const item = FURNITURE_CATALOG.find((f) => f.id === placed.furnitureId);
                if (!item) return null;
                return (
                  <div
                    key={placed.furnitureId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.sprite}</span>
                      <div>
                        <p className="text-xs font-medium text-white">
                          {isKo ? item.name.ko : item.name.en}
                        </p>
                        <p className="text-[10px] text-white/40">
                          ({placed.x}, {placed.y})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFurniture(placed.furnitureId)}
                      className="rounded-lg bg-red-500/20 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/30"
                    >
                      {isKo ? "제거" : "Remove"}
                    </button>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection hint */}
      {selectedFurniture && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-cyan-300/70"
        >
          {isKo ? "방 그리드에서 배치할 위치를 탭하세요" : "Tap a grid cell to place"}
        </motion.p>
      )}
    </div>
  );
}
