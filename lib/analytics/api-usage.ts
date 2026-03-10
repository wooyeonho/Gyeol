import { createServiceClient } from "@/lib/supabase/service";

export function recordApiUsage(
  endpoint: string,
  keyId: string,
  props: Record<string, unknown>
) {
  try {
    const service = createServiceClient();
    service
      .from("product_events")
      .insert({
        event_name: "v1_api_call",
        path: endpoint,
        properties: { ...props, api_key_prefix: keyId },
      })
      .then(() => {});
  } catch {
    // ignore
  }
}
