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

// ── /api/social/posts/[postId]/comment POST ──
export const socialCommentBodySchema = z.object({
  content: z.string().min(1, "Comment content required").max(2000),
});

// ── /api/social/posts/[postId]/report POST ──
export const socialReportBodySchema = z.object({
  reason: z.string().min(1, "Report reason required").max(80),
  detail: z.string().max(280).optional().default(""),
});

// ── /api/time-capsule POST ──
export const timeCapsuleBodySchema = z.object({
  message: z.string().min(1).max(5000),
  deliver_at: z.string().refine((d) => !Number.isNaN(new Date(d).getTime()), {
    message: "Invalid date format",
  }),
});

// ── /api/v1/agent/memory POST ──
export const v1MemoryBodySchema = z.object({
  agent_id: agentId,
  content: z.string().min(1).max(10000),
  type: z.string().max(50).optional().default("conversation"),
});

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

// ── /api/agent/seed-dna POST ──
export const seedDnaBodySchema = z.object({
  dna: z.record(z.string(), z.number().min(0).max(1)),
});

// ── /api/invite/apply POST ──
export const inviteApplyBodySchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.trim().toLowerCase()),
});

// ── /api/integrations/* POST (token save) ──
export const integrationTokenBodySchema = z.object({
  access_token: z.string().min(1, "access_token required"),
  channel_id: z.string().max(100).optional(),
});

// ── /api/integrations/slack POST (message send) ──
export const slackMessageBodySchema = z.object({
  message: z.string().min(1).max(3000),
});

// ── /api/social/posts/[postId]/reaction POST ──
export const socialReactionBodySchema = z.object({
  emoji: z.string().min(1).max(8),
});

// ── /api/iot POST ──
export const iotBodySchema = z.object({
  agentId: z.string().uuid(),
  event: z.string().min(1).max(100),
  value: z.unknown().optional(),
});

// ── /api/referral/apply POST ──
export const referralApplyBodySchema = z.object({
  code: z.string().min(1).max(50),
});

// ── /api/events/war POST ──
export const warEventBodySchema = z.object({
  action: z.enum(["join", "attack", "defend", "retreat"]),
  target_id: z.string().uuid().optional(),
});

// ── /api/generate POST ──
export const generateBodySchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000),
  type: z.enum(["image", "avatar"]).optional().default("avatar"),
});

// ── /api/social/posts/[postId]/reaction POST ──
export const socialReactionToggleBodySchema = z.object({
  reaction_type: z.enum(["like", "curious", "support"], {
    errorMap: () => ({ message: "Invalid reaction type" }),
  }),
});

// ── /api/iot POST ──
export const iotPreferencesBodySchema = z.object({
  preferences: z.record(z.string(), z.unknown()).refine((v) => v !== null && typeof v === "object", {
    message: "preferences must be an object",
  }),
});

// ── /api/chat POST ──
export const chatBodySchema = z.object({
  message: z.string().min(1, "No message").max(8000, "Message too long"),
  locale: z.string().optional(),
});

// ── /api/analytics/track POST ──
export const analyticsTrackBodySchema = z.object({
  event_name: z.string().min(1).max(64),
  anonymous_id: z.string().max(128).optional(),
  locale: z.string().max(12).optional(),
  path: z.string().max(256).optional(),
  properties: z
    .record(z.string(), z.unknown())
    .optional()
    .default({}),
  session_id: z.string().max(128).optional(),
});

// ── /api/room PATCH ──
export const roomPatchBodySchema = z.object({
  ar_position: z.tuple([z.number(), z.number(), z.number()]),
});

// ── /api/creature/portrait POST ──
export const creaturePortraitBodySchema = z.object({
  context: z.enum(["portrait", "full_body", "action", "dream"]).optional().default("portrait"),
  mood: z.string().max(50).optional(),
});

// ── /api/narrative POST ──
export const narrativeChoiceBodySchema = z.object({
  eventId: z.string().min(1).max(100),
  choiceId: z.string().min(1).max(100),
});

// ── /api/room/battle POST ──
export const battleActionBodySchema = z.object({
  agentId: agentId,
  opponentId: agentId,
  moveType: z.enum(["strike", "guard", "magic", "speed", "heal"]),
});

// ── /api/creator POST ──
export const creatorSubmitBodySchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  type: z.enum(["story", "item_design", "challenge", "room_theme", "creature_skin"]),
  price: z.number().int().min(0).max(100000).optional().default(0),
  content: z.record(z.string(), z.unknown()).optional().default({}),
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
