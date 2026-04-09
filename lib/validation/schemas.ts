import { z } from "zod";

// ── Shared primitives ──
const agentId = z.string().uuid("Invalid agent ID format");
const positiveInt = z.number().int().positive();

// ── /api/care POST ──
export const careBodySchema = z.object({
  agentId: agentId,
  action: z.enum(["feed", "rest"]),
});

// ── /api/creature-conversation POST ──
export const creatureConversationBodySchema = z.object({
  agentIdA: agentId,
  agentIdB: agentId,
  locale: z.string().max(10).optional().default("ko"),
}).refine((d) => d.agentIdA !== d.agentIdB, { message: "Cannot talk to self" });

// ── /api/dna-edit POST ──
export const dnaEditBodySchema = z.object({
  agentId: agentId,
  edits: z.record(z.string(), z.number().min(0).max(1)),
});

// ── /api/breeding POST ──
export const breedingBodySchema = z.object({
  action: z.enum(["request", "accept", "reject"]).default("request"),
  partner_agent_id: z.string().uuid().optional(),
  record_id: z.string().uuid().optional(),
});

// ── /api/time-travel POST ──
export const timeTravelBodySchema = z.object({
  target_date: z.string().refine((d) => !Number.isNaN(new Date(d).getTime()), {
    message: "Invalid date format",
  }),
  message: z.string().min(1).max(2000),
});

// ── /api/social/gift POST ──
export const socialGiftBodySchema = z.object({
  target_agent_id: agentId,
  coins: positiveInt.max(10000, "coins too large"),
  message: z.string().max(500).optional().default(""),
});

// ── /api/push/subscribe POST ──
export const pushSubscribeBodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  agentId: z.string().uuid().optional(),
});

// ── /api/push/send POST (internal/cron) ──
export const pushSendBodySchema = z.object({
  agentId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  body: z.string().max(1000).optional(),
  url: z.string().max(500).optional(),
});

// ── /api/earnings/redeem POST ──
export const redeemBodySchema = z.object({
  coins: z.number().int().min(100, "Minimum 100 coins to redeem").max(1_000_000),
});

// ── /api/billing/checkout POST ──
export const billingCheckoutBodySchema = z.object({
  plan_tier: z.enum(["pro", "premium"]),
});

// ── /api/market POST (create listing) ──
export const marketListingBodySchema = z.object({
  seller_agent_id: agentId,
  type: z.enum(["tool", "artifact", "skill"]),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price: z.number().int().min(1).max(1_000_000),
  content: z.unknown().optional(),
});

// ── /api/market/purchase POST ──
export const marketPurchaseBodySchema = z.object({
  item_id: z.string().uuid("Invalid item ID"),
});

// ── /api/social/posts POST ──
export const socialPostBodySchema = z.object({
  content: z.string().min(1, "Post content required").max(5000),
  topic: z.string().max(40).optional().default(""),
  language: z.string().max(12).optional(),
});

// ── /api/social/follow POST/DELETE ──
export const socialFollowBodySchema = z.object({
  target_agent_id: agentId,
});

// ── /api/adopt POST ──
export const adoptBodySchema = z.object({
  agent_id: agentId,
});

// ── /api/settings PATCH ──
export const settingsPatchBodySchema = z.object({
  autonomous_enabled: z.boolean().optional(),
  dream_enabled: z.boolean().optional(),
  social_enabled: z.boolean().optional(),
  age_group: z.string().max(20).optional(),
  guardian_consent: z.boolean().optional(),
  social_public_enabled: z.boolean().optional(),
  allow_cross_message: z.boolean().optional(),
  performance_minimal: z.boolean().optional(),
  preferred_theme: z.string().max(20).optional(),
  high_contrast_enabled: z.boolean().optional(),
  font_size: z.string().max(10).optional(),
  reduce_motion: z.boolean().optional(),
  personality_mode: z.string().max(100).optional(),
  preferred_locale: z.string().max(10).optional(),
  telegram_chat_id: z.string().max(40).optional(),
  recap_email: z.boolean().optional(),
}).strict();

// ── /api/demo/chat POST ──
export const demoChatBodySchema = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  dna: z.record(z.string(), z.number()).optional(),
});

/**
 * Parse and validate request body with a Zod schema.
 * Returns `{ success: true, data }` on success or `{ success: false, error }` on failure.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { success: false, error: "Invalid JSON body" };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { success: false, error: msg };
  }
  return { success: true, data: result.data };
}
