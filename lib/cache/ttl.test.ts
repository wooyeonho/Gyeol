import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTtlCache, setTtlCache, clearTtlCache, clearTtlCacheByPrefix } from "./ttl";

describe("TTL cache", () => {
  beforeEach(() => {
    clearTtlCacheByPrefix("");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setTtlCache + getTtlCache", () => {
    it("stores and retrieves a value", () => {
      setTtlCache("key1", "hello", 5000);
      expect(getTtlCache("key1")).toBe("hello");
    });

    it("stores objects", () => {
      setTtlCache("obj", { a: 1 }, 5000);
      expect(getTtlCache("obj")).toEqual({ a: 1 });
    });

    it("returns null for non-existent key", () => {
      expect(getTtlCache("nonexistent")).toBeNull();
    });

    it("expires entries after TTL", () => {
      vi.useFakeTimers();
      setTtlCache("expiring", "val", 1000);
      expect(getTtlCache("expiring")).toBe("val");
      vi.advanceTimersByTime(1001);
      expect(getTtlCache("expiring")).toBeNull();
      vi.useRealTimers();
    });
  });

  describe("clearTtlCache", () => {
    it("removes a specific key", () => {
      setTtlCache("remove-me", "val", 5000);
      clearTtlCache("remove-me");
      expect(getTtlCache("remove-me")).toBeNull();
    });

    it("does nothing for non-existent keys", () => {
      expect(() => clearTtlCache("does-not-exist")).not.toThrow();
    });
  });

  describe("clearTtlCacheByPrefix", () => {
    it("removes all keys matching prefix", () => {
      setTtlCache("user:1:name", "alice", 5000);
      setTtlCache("user:1:age", 30, 5000);
      setTtlCache("user:2:name", "bob", 5000);
      setTtlCache("other:key", "val", 5000);

      clearTtlCacheByPrefix("user:1:");

      expect(getTtlCache("user:1:name")).toBeNull();
      expect(getTtlCache("user:1:age")).toBeNull();
      expect(getTtlCache("user:2:name")).toBe("bob");
      expect(getTtlCache("other:key")).toBe("val");
    });
  });
});
