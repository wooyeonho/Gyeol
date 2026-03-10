export const PRODUCT_EVENT = {
  chatRequestReceived: "chat_request_received",
  chatContextReady: "chat_context_ready",
  chatStreamCompleted: "chat_stream_completed",
  chatPostProcessCompleted: "chat_post_process_completed",
  chatPostProcessFailed: "chat_post_process_failed",
} as const;

export type ProductEventName = (typeof PRODUCT_EVENT)[keyof typeof PRODUCT_EVENT];

export function recordServerEvent(name: ProductEventName, payload: Record<string, unknown>) {
  console.info("[ProductEvent]", JSON.stringify({
    name,
    payload,
    timestamp: new Date().toISOString(),
  }));
}
