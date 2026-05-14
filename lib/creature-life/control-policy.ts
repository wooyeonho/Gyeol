import type { ControlPolicy } from "./types";

export const DEFAULT_CONTROL_POLICY: ControlPolicy = {
  autonomyLevel: 1,
  allowNotifications: false,
  allowPublicSuggestions: false,
  allowMoneyPressure: false,
  maxDailyInterruptions: 2,
  emergencyPause: false,
};
