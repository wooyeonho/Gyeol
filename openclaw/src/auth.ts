import crypto from "crypto";

export function buildAuthHeaders(cronSecret: string, useHmac: boolean): Record<string, string> {
  if (!useHmac) {
    return { Authorization: `Bearer ${cronSecret}` };
  }

  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", cronSecret)
    .update(timestamp)
    .digest("hex");

  return {
    "X-Cron-Timestamp": timestamp,
    "X-Cron-Signature": signature,
  };
}
