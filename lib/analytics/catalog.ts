export const CLIENT_EVENT = {
  activityOpened: "activity_opened",
  albumOpened: "album_opened",
  authFailed: "auth_failed",
  exploreOpened: "explore_opened",
  firstMessageSent: "first_message_sent",
  guestCompleted: "guest_completed",
  guestStarted: "guest_started",
  loginCompleted: "login_completed",
  loginStarted: "login_started",
  messageSent: "message_sent",
  missionCreated: "mission_created",
  pageView: "page_view",
  signupCompleted: "signup_completed",
  signupStarted: "signup_started",
} as const;

export type ClientEventName = (typeof CLIENT_EVENT)[keyof typeof CLIENT_EVENT];

const CLIENT_EVENT_NAMES = new Set<ClientEventName>(Object.values(CLIENT_EVENT));

export function isClientEventName(value: string): value is ClientEventName {
  return CLIENT_EVENT_NAMES.has(value as ClientEventName);
}
