import { describe, it, expect } from "vitest";
import { memoriesToObjects, mergeRoomObjects } from "./generator";
import type { RoomObject } from "./types";

describe("memoriesToObjects", () => {
  it("converts memories to room objects", () => {
    const memories = [
      { id: "m1", content: "I love coding every day" },
      { id: "m2", content: "Feeling sad and lonely" },
    ];
    const objects = memoriesToObjects(memories);
    expect(objects).toHaveLength(2);
    expect(objects[0].id).toBe("m1");
    expect(objects[0].type).toBe("desk"); // coding keyword
    expect(objects[1].type).toBe("window_rain"); // sad keyword
  });

  it("defaults to orb type for no keyword match", () => {
    const objects = memoriesToObjects([{ id: "m1", content: "random text" }]);
    expect(objects[0].type).toBe("orb");
    expect(objects[0].color).toBe("#888888");
  });

  it("limits to 12 objects", () => {
    const memories = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, content: "text" }));
    const objects = memoriesToObjects(memories);
    expect(objects.length).toBeLessThanOrEqual(12);
  });

  it("has 3D position and scale for each object", () => {
    const objects = memoriesToObjects([{ id: "m1", content: "test" }]);
    expect(objects[0].position).toHaveLength(3);
    expect(objects[0].scale).toEqual([0.5, 0.5, 0.5]);
  });

  it("truncates content to 80 chars", () => {
    const long = "A".repeat(200);
    const objects = memoriesToObjects([{ id: "m1", content: long }]);
    expect(objects[0].content!.length).toBeLessThanOrEqual(80);
  });

  it("handles empty memory content", () => {
    const objects = memoriesToObjects([{ id: "m1" }]);
    expect(objects[0].content).toBe("");
    expect(objects[0].type).toBe("orb");
  });

  it("generates fallback ID when memory has no id", () => {
    const objects = memoriesToObjects([{ content: "test" }]);
    expect(objects[0].id).toContain("obj-");
  });

  it("detects book/read keywords", () => {
    const objects = memoriesToObjects([{ id: "m1", content: "I love reading books" }]);
    expect(objects[0].type).toBe("book");
  });

  it("detects music keywords", () => {
    const objects = memoriesToObjects([{ id: "m1", content: "listening to music" }]);
    expect(objects[0].type).toBe("speaker");
  });
});

describe("mergeRoomObjects", () => {
  const obj1: RoomObject = {
    id: "obj-1", type: "desk", color: "#000", position: [0, 0, 0], scale: [0.5, 0.5, 0.5],
  };
  const obj2: RoomObject = {
    id: "obj-2", type: "lamp", color: "#fff", position: [1, 0, 0], scale: [0.5, 0.5, 0.5],
  };
  const obj3: RoomObject = {
    id: "obj-3", type: "orb", color: "#888", position: [2, 0, 0], scale: [0.5, 0.5, 0.5],
  };

  it("merges existing and generated without duplicates", () => {
    const result = mergeRoomObjects([obj1], [obj1, obj2]);
    expect(result).toHaveLength(2);
  });

  it("caps at maxObjects", () => {
    const result = mergeRoomObjects([obj1, obj2, obj3], [obj1], 2);
    expect(result).toHaveLength(2);
  });

  it("preserves existing objects over generated ones (by ID)", () => {
    const modified: RoomObject = { ...obj1, type: "new_type" };
    const result = mergeRoomObjects([obj1], [modified]);
    expect(result.find((o) => o.id === "obj-1")?.type).toBe("desk");
  });
});
