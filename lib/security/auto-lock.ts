/**
 * Auto-lock inactivity guard.
 *
 * Inspired by Bitwarden, 1Password, Signal's screen lock. Tracks user activity
 * (pointer, keyboard, focus). When the app goes idle past a configurable
 * threshold, fires a `lock` callback. Also locks immediately on tab blur or
 * visibility change if strict mode is enabled.
 *
 * Zero-dependency, tree-shakable, SSR-safe.
 */

export type AutoLockOptions = {
  /** Milliseconds of inactivity before the vault locks. Default: 5 minutes. */
  idleMs?: number;
  /** Lock immediately when the tab is hidden / backgrounded. Default: false. */
  strict?: boolean;
  /** Fired when the vault should become locked. */
  onLock: () => void;
  /** Optional: fired on every detected activity (useful for debug). */
  onActivity?: () => void;
};

export type AutoLockController = {
  /** Reset the inactivity timer without locking. */
  ping: () => void;
  /** Force-lock immediately. */
  lock: () => void;
  /** Stop listening and tear down. */
  destroy: () => void;
};

const DEFAULT_IDLE = 5 * 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "scroll",
  "focus",
];

export function startAutoLock(options: AutoLockOptions): AutoLockController {
  if (typeof window === "undefined") {
    return { ping: () => {}, lock: () => {}, destroy: () => {} };
  }

  const idleMs = options.idleMs ?? DEFAULT_IDLE;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let locked = false;
  let destroyed = false;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const doLock = () => {
    if (locked || destroyed) return;
    locked = true;
    clearTimer();
    try {
      options.onLock();
    } catch {
      /* swallow: caller-provided callback should not break the guard */
    }
  };

  const ping = () => {
    if (destroyed || locked) return;
    options.onActivity?.();
    clearTimer();
    timer = setTimeout(doLock, idleMs);
  };

  const onActivity = () => ping();

  const onVisibility = () => {
    if (document.visibilityState === "hidden" && options.strict) {
      doLock();
    } else if (document.visibilityState === "visible") {
      ping();
    }
  };

  ACTIVITY_EVENTS.forEach((evt) =>
    window.addEventListener(evt, onActivity, { passive: true }),
  );
  document.addEventListener("visibilitychange", onVisibility);

  ping();

  return {
    ping,
    lock: doLock,
    destroy: () => {
      destroyed = true;
      clearTimer();
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
