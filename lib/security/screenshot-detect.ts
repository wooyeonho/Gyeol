/**
 * Screenshot Detection — detects screenshot/screen capture attempts.
 *
 * Uses the Screen Capture API and keyboard event detection
 * to notify when sensitive content may be captured.
 */

export type ScreenshotCallback = (event: ScreenshotEvent) => void;

export interface ScreenshotEvent {
  type: "keyboard_shortcut" | "visibility_change";
  timestamp: number;
  details: string;
}

const SCREENSHOT_KEYS = new Set([
  "PrintScreen",
  "F13", // Some Mac keyboards
]);

/**
 * Detect common screenshot keyboard shortcuts.
 * Returns a cleanup function.
 */
export function onScreenshotAttempt(callback: ScreenshotCallback): () => void {
  if (typeof window === "undefined") return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    // PrintScreen key
    if (SCREENSHOT_KEYS.has(e.key)) {
      callback({
        type: "keyboard_shortcut",
        timestamp: Date.now(),
        details: `Key: ${e.key}`,
      });
      return;
    }

    // Cmd+Shift+3/4/5 (macOS screenshots)
    if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
      callback({
        type: "keyboard_shortcut",
        timestamp: Date.now(),
        details: `Cmd+Shift+${e.key}`,
      });
      return;
    }

    // Windows: Win+Shift+S (Snipping Tool)
    if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "s") {
      callback({
        type: "keyboard_shortcut",
        timestamp: Date.now(),
        details: "Win+Shift+S",
      });
    }
  };

  // Visibility change can indicate screenshot on some mobile browsers
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      callback({
        type: "visibility_change",
        timestamp: Date.now(),
        details: "Tab hidden (possible screenshot on mobile)",
      });
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

/**
 * Apply CSS protection to prevent easy screen capture of sensitive elements.
 * Note: This is a deterrent, not a guarantee — determined users can still capture.
 */
export function applyCaptureProtection(element: HTMLElement): () => void {
  const originalUserSelect = element.style.userSelect;

  element.style.userSelect = "none";
  element.style.setProperty("-webkit-user-select", "none");

  return () => {
    element.style.userSelect = originalUserSelect;
    element.style.removeProperty("-webkit-user-select");
  };
}
