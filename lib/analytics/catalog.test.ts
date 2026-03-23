import { describe, it, expect } from "vitest";
import { CLIENT_EVENT, isClientEventName } from "./catalog";

describe("CLIENT_EVENT", () => {
  it("has expected event names", () => {
    expect(CLIENT_EVENT.messageSent).toBe("message_sent");
    expect(CLIENT_EVENT.firstMessageSent).toBe("first_message_sent");
    expect(CLIENT_EVENT.pageView).toBe("page_view");
    expect(CLIENT_EVENT.loginCompleted).toBe("login_completed");
    expect(CLIENT_EVENT.signupCompleted).toBe("signup_completed");
    expect(CLIENT_EVENT.experimentAssigned).toBe("experiment_assigned");
  });
});

describe("isClientEventName", () => {
  it("returns true for known event names", () => {
    expect(isClientEventName("message_sent")).toBe(true);
    expect(isClientEventName("page_view")).toBe(true);
    expect(isClientEventName("first_message_sent")).toBe(true);
    expect(isClientEventName("login_completed")).toBe(true);
  });

  it("returns false for unknown event names", () => {
    expect(isClientEventName("unknown_event")).toBe(false);
    expect(isClientEventName("")).toBe(false);
    expect(isClientEventName("MESSAGE_SENT")).toBe(false);
  });
});
