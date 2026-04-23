/**
 * Haptic Engine — device vibration feedback for creature interactions.
 * Fires navigator.vibrate() patterns mapped to creature emotional states.
 * Silent no-op on unsupported devices or restricted contexts.
 */

export type HapticState = "heartbeat" | "shock" | "breathe";

export const triggerEntityHaptic = (state: HapticState = "heartbeat"): void => {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    switch (state) {
      case "heartbeat":
        navigator.vibrate([40, 60, 40]);
        break;
      case "shock":
        navigator.vibrate([100, 50, 100, 50, 200]);
        break;
      case "breathe":
        navigator.vibrate([20, 30]);
        break;
    }
  } catch {
    // Haptic API blocked by browser policy — silent fail
  }
};
