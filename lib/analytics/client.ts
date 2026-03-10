"use client";

import { isClientEventName, type ClientEventName } from "@/lib/analytics/catalog";

const ANALYTICS_ANON_KEY = "gyeol_analytics_anonymous_id";
const ANALYTICS_SESSION_KEY = "gyeol_analytics_session_id";
const TRACK_ENDPOINT = "/api/analytics/track";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredId(storage: Storage, key: string) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const next = createId();
    storage.setItem(key, next);
    return next;
  } catch {
    return createId();
  }
}

function buildPayload(name: ClientEventName, properties: Record<string, unknown>, path?: string, locale?: string) {
  if (typeof window === "undefined") return null;
  return {
    anonymous_id: getStoredId(window.localStorage, ANALYTICS_ANON_KEY),
    event_name: name,
    locale: locale ?? document.documentElement.lang ?? "ko",
    path: path ?? `${window.location.pathname}${window.location.search}`,
    properties,
    session_id: getStoredId(window.sessionStorage, ANALYTICS_SESSION_KEY),
  };
}

export function trackClientEvent(
  name: ClientEventName,
  properties: Record<string, unknown> = {},
  options?: { locale?: string; path?: string }
) {
  if (typeof window === "undefined") return;
  if (!isClientEventName(name)) return;

  const payload = buildPayload(name, properties, options?.path, options?.locale);
  if (!payload) return;
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(TRACK_ENDPOINT, blob);
    return;
  }

  void fetch(TRACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
