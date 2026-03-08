import type { RoomObject } from "./types";

const KEYWORD_TO_OBJECT: { pattern: RegExp; type: string; color: string }[] = [
  { pattern: /code|coding|program|dev|script/i, type: "desk", color: "#4a5568" },
  { pattern: /sad|rain|tear|lonely|miss/i, type: "window_rain", color: "#6366f1" },
  { pattern: /book|read|story|learn/i, type: "book", color: "#92400e" },
  { pattern: /music|song|sound|listen/i, type: "speaker", color: "#7c3aed" },
  { pattern: /dream|sleep|night/i, type: "moon", color: "#fbbf24" },
  { pattern: /friend|social|talk|meet/i, type: "chair", color: "#059669" },
  { pattern: /nature|tree|flower|sky/i, type: "plant", color: "#22c55e" },
  { pattern: /love|warm|happy|joy/i, type: "lamp", color: "#f59e0b" },
];

function inferObjectType(content: string): { type: string; color: string } {
  for (const { pattern, type, color } of KEYWORD_TO_OBJECT) {
    if (pattern.test(content)) return { type, color };
  }
  return { type: "orb", color: "#888888" };
}

export function memoriesToObjects(
  memories: { id?: string; type?: string; content?: string }[],
  layout: "default" = "default"
): RoomObject[] {
  const objects: RoomObject[] = [];
  const grid = layout === "default" ? 3 : 4;
  memories.slice(0, 12).forEach((m, i) => {
    const content = m.content ?? "";
    const { type, color } = inferObjectType(content);
    const row = Math.floor(i / grid);
    const col = i % grid;
    const x = (col - (grid - 1) / 2) * 1.2 + (Math.random() - 0.5) * 0.3;
    const z = (row - 1) * 1.2 + (Math.random() - 0.5) * 0.3;
    objects.push({
      id: (m.id as string) ?? `obj-${i}`,
      type,
      color,
      position: [x, 0, z],
      scale: [0.5, 0.5, 0.5],
      content: content.slice(0, 80),
    });
  });
  return objects;
}

export function mergeRoomObjects(
  existing: RoomObject[],
  generated: RoomObject[],
  maxObjects: number = 15
): RoomObject[] {
  const byId = new Map<string, RoomObject>();
  existing.forEach((o) => byId.set(o.id, o));
  generated.forEach((o) => {
    if (!byId.has(o.id)) byId.set(o.id, o);
  });
  return Array.from(byId.values()).slice(0, maxObjects);
}
