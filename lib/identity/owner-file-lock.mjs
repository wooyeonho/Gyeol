import { readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

function lockError(reason) {
  const error = new Error(reason);
  error.code = reason;
  return error;
}

export async function acquireOwnerFileLock(path, { staleMs = 30_000, now = () => Date.now() } = {}) {
  if (!Number.isFinite(staleMs) || staleMs <= 0) throw new Error("lock_stale_ms_required");
  const token = randomUUID();
  const payload = () => JSON.stringify({ token, pid: process.pid, acquiredAtMs: now() });

  try {
    await writeFile(path, payload(), { encoding: "utf8", flag: "wx", mode: 0o600 });
    return { token, recoveredStaleLock: false };
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }

  let existing;
  try {
    existing = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw lockError("memory_store_lock_corrupt");
  }
  if (!existing || typeof existing.token !== "string" || !Number.isFinite(existing.acquiredAtMs)) {
    throw lockError("memory_store_lock_corrupt");
  }
  if (now() - existing.acquiredAtMs <= staleMs) throw lockError("memory_store_locked");

  await unlink(path).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
  try {
    await writeFile(path, payload(), { encoding: "utf8", flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error?.code === "EEXIST") throw lockError("memory_store_locked");
    throw error;
  }
  return { token, recoveredStaleLock: true };
}

export async function releaseOwnerFileLock(path, token) {
  try {
    const current = JSON.parse(await readFile(path, "utf8"));
    if (current?.token !== token) return false;
    await unlink(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}
